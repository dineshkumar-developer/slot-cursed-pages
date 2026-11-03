/* ==========================================================================
   config.js — game switches. Loaded first, edit the value below and re-upload.

   portrait_mode_visible
     false (default)  phone/tablet held in PORTRAIT shows a "rotate to landscape" message and the game is hidden;
                      the game shows (and plays) only in LANDSCAPE.
     true             the game plays in portrait too (no message).
   ========================================================================== */
var portrait_mode_visible = false;

/* landscape_max_ratio
     How wide the game UI (buttons, balance, reels) may get in landscape, as width / height of the screen.
     On very wide phones the buttons used to stick to the far screen corners; now they stay inside a centred canvas of this
     aspect (2.2 = a bit wider than 2:1). The background still fills the whole screen. Bigger number = UI spreads wider. */
var landscape_max_ratio = 2.2;

(function () {
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
  function apply() {
    var portrait = mq ? mq.matches : window.innerHeight > window.innerWidth;
    var block = !portrait_mode_visible && portrait;
    root.classList.toggle('rotate-block', block);
    // silence the game while the message is showing, bring the sound back in landscape
    try { if (window.CP && CP.audio && CP.audio.ready) { if (block) CP.audio.suspend(); else CP.audio.resume(); } } catch (e) {}
  }
  apply();
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', apply); else if (mq.addListener) mq.addListener(apply); }
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
})();
