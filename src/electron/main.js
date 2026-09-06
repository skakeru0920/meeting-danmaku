/**
 * T-004 の検証用 Electron アプリ(Plan 002)。
 *
 * 透過・クリック透過・常時最前面のウィンドウを作り、
 * (1) 全アプリの手前に出るか
 * (2) Zoom のデスクトップ全体共有を通して別 participant に見えるか
 * (3) Keynote 再生モードの上にも出るか
 * を確かめる。
 *
 * **src/overlay/ は読み込まない。** 本実装(Plan 003)とは切り離す。
 * overlay を載せてしまうと、映らなかったときに Electron の問題か
 * overlay の問題かを切り分けられないため、ここは最小構成で試す。
 */

// electron は CommonJS なので名前付き import ができない。
// default を受けて分解する(`import { app } from 'electron'` は
// SyntaxError: does not provide an export named 'app' になる)。
//
// 起動は `npm run electron:spike` を使うこと。この環境には
// ELECTRON_RUN_AS_NODE=1 が設定されていて、そのまま electron を起動すると
// GUI ではなく素の Node として立ち上がる。すると electron が返すのは
// バイナリのパス(文字列)で、app も BrowserWindow も undefined になる。
// スクリプト側で env -u して打ち消している。
import electron from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { app, BrowserWindow, screen } = electron;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // 赤枠と説明ラベルは検証用の目印。既定では出さない。
  // 切り分けが要るときだけ `npm run electron:spike -- --frame` で出す。
  const showFrame = process.argv.includes('--frame');

  overlayWindow.loadFile(path.join(__dirname, 'index.html'), {
    query: { frame: showFrame ? '1' : '0' },
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
