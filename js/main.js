/* main.js — boot: wait for the two fonts, build everything, show the splash. */
(function () {
  'use strict';
  const CP = window.CP;
  function boot() {
    try { CP.app.init(); } catch (e) { console.error(e); document.body.insertAdjacentHTML('beforeend', '<pre style="position:fixed;z-index:999;color:#fff;background:#900;padding:8px;font-size:12px">' + e.message + '</pre>'); return; }
    if (/[?&]skip/.test(location.search)) CP.app.enter();
  }
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("40px 'Caveat Brush'"), document.fonts.load("20px 'Patrick Hand'")]) : Promise.resolve();
  Promise.race([Promise.all([fonts, CP.preload()]), new Promise((r) => setTimeout(r, 3500))]).then(boot, boot);
})();
