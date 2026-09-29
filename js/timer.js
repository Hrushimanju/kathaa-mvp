/* Kathaa 360 — timer.js
   The one-hour philosophy, enforced gently. Daily Loop spec:
     soft warning at WARN_AT remaining · graceful close at 0 · NO paid extension (L-01/L-02). */
window.KATHAA = window.KATHAA || {};

KATHAA.Timer = (() => {
  let interval = null;
  let lastTick = null;
  let mode = 'voice'; // 'voice' -> seconds count ONLY while TTS is speaking
  // 'read'  -> seconds count while the reader is open

  const fmt = (s) => `${Math.floor(s / 60)} min ${s % 60}s`;

  function refreshBar() {
    const bar = document.getElementById('session-status');
    if (!bar) return;
    const remain = KATHAA.Storage.getRemainingToday();
    const mm = Math.floor(remain / 60);
    bar.classList.toggle('warn', remain > 0 && remain <= KATHAA.WARN_AT);
    bar.textContent =
      remain === 0
        ? '🌙 Today’s hour is complete.'
        : remain <= KATHAA.WARN_AT
          ? `🌤 Softly now — ${fmt(remain)} of tonight’s hour remains…`
          : `⏳ ${mm} minutes of listening left today · sleeps well after`;
    return remain;
  }

  function start(onClose, m = 'voice') {
    stop();
    mode = m;
    lastTick = Date.now();
    interval = setInterval(() => {
      const now = Date.now();
      // FOUNDER-BUG FIX: the hour measures LISTENING, not page-idle time.
      // In voice mode, if the engine is silent (paused, hiccup, capture open),
      // no seconds burn. Reading mode counts while the reader is open.
      const activelyEngaged =
        mode === 'read' ||
        (window.speechSynthesis && window.speechSynthesis.speaking);
      if (activelyEngaged) {
        KATHAA.Storage.addSecondsToday(Math.round((now - lastTick) / 1000));
      }
      lastTick = now;
      const remain = refreshBar();
      if (remain === 0) {
        stop();
        onClose && onClose();
      }
    }, 1000);
    refreshBar();
  }

  function pause() {
    stop();
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
  }

  return { start, pause, stop, refreshBar };
})();
