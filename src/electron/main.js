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

  // Vite が配信する overlay を読む。file:// で直接開くと SSE の接続先
  // (相対パスの /events)が解決できないので URL で読む。
  overlayWindow.loadURL(OVERLAY_URL);

  // 読めなかったときに無言で真っ白にならないようにする。
  // 起こりやすいのは dev サーバーが立っていないケース。
  overlayWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`overlay を読めなかった: ${errorDescription} (${errorCode})`);
    console.error(`${OVERLAY_URL} を開けるか確認する。npm run dev は起動しているか?`);
  });
}

app.whenReady().then(() => {
  createOverlayWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});

// 検証用なので、ウィンドウを閉じたら終了する(macOS の慣習には従わない)
app.on('window-all-closed', () => {
  app.quit();
});
