/**
 * overlay を表示する Electron アプリ。
 *
 * 透過・クリック透過・常時最前面のウィンドウに src/overlay/ を載せる。
 * 画面共有を通して別 participant にも見える(T-004 で確認済み)。
 *
 * **overlay は Vite が配信するものを URL で読む。** ブラウザで開くのと
 * 同じものが動くので、「ブラウザでは動くが Electron では動かない」差異が
 * 起きない(docs/decisions/ の「表示先に依存する処理を持ち込まない」)。
 * そのため **`npm run dev` を先に起動しておく必要がある。**
 */

// electron は CommonJS なので名前付き import ができない。
// default を受けて分解する(`import { app } from 'electron'` は
// SyntaxError: does not provide an export named 'app' になる)。
//
// 起動は `npm run overlay` を使うこと。この環境には
// ELECTRON_RUN_AS_NODE=1 が設定されていて、そのまま electron を起動すると
// GUI ではなく素の Node として立ち上がる。すると electron が返すのは
// バイナリのパス(文字列)で、app も BrowserWindow も undefined になる。
// スクリプト側で env -u して打ち消している。
import electron from 'electron';

const { app, BrowserWindow, screen } = electron;

/**
 * overlay の配信元。Vite の dev サーバー。
 *
 * 別ポートで動かしているときは OVERLAY_URL で上書きする。
 */
const OVERLAY_URL = process.env.OVERLAY_URL ?? 'http://localhost:5173/src/overlay/';

/** overlay を読めなかったときに読み直すまでの待ち時間(ms) */
const RETRY_DELAY_MS = 1000;

/**
 * 実際に読む URL。
 *
 * --frame を付けると overlay が赤枠を出す。ウィンドウが画面のどこまで
 * 覆っているかを確かめるための目印で、既定では出さない。
 */
const targetUrl = process.argv.includes('--frame')
  ? `${OVERLAY_URL}?frame=1`
  : OVERLAY_URL;

/**
 * Zoom クライアントの URL。overlay と同じ Vite が配信する。
 *
 * 既定は overlay の 1 つ上の階層から組み立てる。
 */
const ZOOM_URL = process.env.ZOOM_URL ?? OVERLAY_URL.replace(/\/src\/overlay\/?$/, '/src/zoom/');

/** @type {BrowserWindow | null} 見えない Zoom クライアント */
let zoomWindow = null;

/** @type {BrowserWindow | null} */
let overlayWindow = null;

function createOverlayWindow() {
  // 画面全体を覆う。work area ではなく bounds を使う
  // (メニューバーや Dock の上にも出したいため)
  //
  // 主ディスプレイのみ。MVP はこれでよい(2026-09-06 に決定)。
  // 複数ディスプレイへ出す・出す先を切り替えるのは Icebox の
  // 「multi monitor 対応」に残してある。
  const { bounds } = screen.getPrimaryDisplay();

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,

    transparent: true,
    frame: false,
    hasShadow: false,

    // タスクスイッチャーやウィンドウ一覧に出さない
    skipTaskbar: true,
    // 前面に出ても他アプリのフォーカスを奪わない
    focusable: false,
    resizable: false,
    movable: false,
    // メニューバーと Dock の上にも出すために要る 2 つ。
    //
    // macOS はウィンドウを表示する瞬間に workArea の内側へ押し込む。
    // x:0, y:0 を渡しても実際には x:81, y:44(Dock とメニューバーのぶん)に
    // なり、サイズはそのままなので右下が画面からはみ出す。
    // 表示後の setBounds では戻せない(効かない)。
    //
    // enableLargerThanScreen がその制約を外す。fullscreenable: false だと
    // 併用しても押し込まれたままなので true にする。実測した組み合わせ:
    //   fullscreenable:false                        → y:44 NG
    //   fullscreenable:true                         → y:44 NG
    //   type:'panel'                                → y:44 NG
    //   fullscreenable:true + enableLargerThanScreen → y:0  OK
    fullscreenable: true,
    enableLargerThanScreen: true,
  });

  // 表示前に貼り直す。表示後だと効かない
  overlayWindow.setBounds(bounds);

  // クリックを背後のアプリへ通す。forward: true にすると
  // マウス移動イベントだけは受け取れる(将来ホバー操作が要るとき用)
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  // 'screen-saver' は最も高いレベル。フルスクリーンアプリの上を狙う
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  // 別の Space へ移っても追従させ、フルスクリーンの上にも出す
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // 読めるまで繰り返す。npm start で Vite と同時に起動すると、
  // Vite が待ち受ける前に読みに行って失敗するため。
  //
  // 待つのではなく繰り返すことで、dev サーバーを後から起動しても繋がる。
  // 依存(wait-on など)を増やさずに済む。
  /** @type {ReturnType<typeof setTimeout> | null} 読み直し待ちのタイマー */
  let retryTimer = null;

  overlayWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    // 二重に予約しない。1 回の失敗につき 1 回だけ読み直す
    if (retryTimer !== null) {
      return;
    }

    console.warn(`overlay を読めなかった: ${errorDescription} (${errorCode})`);
    console.warn(`${RETRY_DELAY_MS}ms 後に ${targetUrl} を読み直す`);

    retryTimer = setTimeout(() => {
      retryTimer = null;

      // 読み直す前にウィンドウが閉じられていることがある
      if (overlayWindow !== null && !overlayWindow.isDestroyed()) {
        overlayWindow.loadURL(targetUrl);
      }
    }, RETRY_DELAY_MS);
  });

  // 読めたら予約済みの読み直しを取り消す。残しておくと表示中の overlay を
  // 読み直してしまい、SSE の接続が切れる
  overlayWindow.webContents.on('did-finish-load', () => {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  });

  // Vite が配信する overlay を読む。file:// で直接開くと SSE の接続先
  // (相対パスの /events)が解決できないので URL で読む。
  overlayWindow.loadURL(targetUrl);
}

/**
 * Zoom に繋ぐ見えないウィンドウを作る。
 *
 * Meeting SDK はブラウザ前提だが、Electron の中身は Chromium なので
 * そのまま動く。これでブラウザのタブを開いておく必要がなくなる。
 *
 * **画面に出さないぶん、状況がターミナルに出る。** join に失敗しても
 * 「コメントが流れてこない」としか分からないのを避けるため、
 * ページ側の console をそのまま転送する。
 */
function createZoomWindow() {
  zoomWindow = new BrowserWindow({
    show: false,
    // 音声も映像も使わないが、SDK が初期化時に触るので通常の構成にしておく
    webPreferences: { backgroundThrottling: false },
  });

  // ページ側の console を [zoom] 付きでターミナルへ出す。
  // 参加した / N 件送った / join に失敗した、がここに出る。
  zoomWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[zoom] ${message}`);
  });

  /** @type {ReturnType<typeof setTimeout> | null} */
  let retryTimer = null;

  zoomWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (retryTimer !== null) {
      return;
    }

    console.warn(`[zoom] 読めなかった: ${errorDescription} (${errorCode})`);

    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (zoomWindow !== null && !zoomWindow.isDestroyed()) {
        zoomWindow.loadURL(ZOOM_URL);
      }
    }, RETRY_DELAY_MS);
  });

  zoomWindow.webContents.on('did-finish-load', () => {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    console.log(`[zoom] ${ZOOM_URL} を読み込んだ`);
  });

  zoomWindow.loadURL(ZOOM_URL);
}

app.whenReady().then(() => {
  createOverlayWindow();

  // --with-zoom を付けたときだけ Zoom にも繋ぐ(npm start)。
  // npm run dev ではブラウザのタブで繋ぐので作らない。
  if (process.argv.includes('--with-zoom')) {
    createZoomWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});

// ウィンドウを閉じたら終了する(macOS の慣習には従わない)。
//
// overlay を閉じたら Zoom の隠しウィンドウも道連れにする。残しておくと
// 見えないウィンドウだけが残り、会議に参加したままターミナルが返らない。
app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (zoomWindow !== null && !zoomWindow.isDestroyed()) {
    zoomWindow.destroy();
  }
});
