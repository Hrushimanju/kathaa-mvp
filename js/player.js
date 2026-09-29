/* Kathaa 360 — player.js
   Voice + reading modes over the same segments. Browser TTS v0 baseline;
   Piper/XTTS arrives behind this interface later (Tech Foundation / L-13). */
window.KATHAA = window.KATHAA || {};

KATHAA.Player = (() => {
  let chapter = null,
    lines = [],
    idx = 0,
    segStartTs = 0,
    readingMode = false;

  const $now = () => document.getElementById('voice-now');
  const t = () => window.speechSynthesis;

  function load(ch) {
    chapter = ch;
    lines = KATHAA.Content.narrationLines(ch);
    sessionOver = false; // fresh session
    idx = Math.min(KATHAA.Storage.getPosition(ch.id), lines.length - 1); // RESUME: pick up where you left
    resetUI();
    if (idx > 0) {
      $now().innerHTML = `<p class="segment-title">${chapter.title}</p>
        <p class="muted">⏩ Resuming at part ${idx + 1} of ${lines.length} — press ▶ to continue.</p>`;
    }
    renderProvenance(ch);
    setReadingMode(false);
  }

  function resetUI() {
    $now().innerHTML = `<p class="segment-title">${chapter.title}</p>
      <p class="muted">Press play to begin tonight’s telling.</p>`;
  }

  function positionSec() {
    return Math.round((Date.now() - segStartTs) / 1000) + idx * 10; // sentence-granular spot
  }

  /* ── voice choice: prefer an India-English engine for our names & words ── */
  let chosenVoice = null;
  function pickVoice() {
    const vs = t().getVoices();
    if (!vs.length) return;
    // STANDARD IS SANSKRIT (L-19): no true Sanskrit TTS exists in browsers yet,
    // so we pick the least-bad available Indian-accented carrier and rely on
    // hand-tuned say-fields + native QA until L-18 recordings land.
    chosenVoice =
      vs.find(
        (v) =>
          /en[-_]IN/i.test(v.lang) &&
          /india|neerja|swara|veena|ravi|heera/i.test(v.name)
      ) ||
      vs.find((v) => /en[-_]IN/i.test(v.lang)) ||
      vs.find((v) => /en[-_]GB/i.test(v.lang)) ||
      null;
    // PRONUNCIATION GUARD: never pretend a Western voice is acceptable (L-19)
    const hint = document.getElementById('hotword-hint');
    if (hint && !/IN/i.test(chosenVoice?.lang || '')) {
      hint.innerHTML =
        '⚠️ No Indian voice found on this device — pronunciation of names/matras may be off. Install <b>English (India)</b> under Windows Settings → Speech, then reload.';
    }
  }
  if (t()) {
    pickVoice();
    t().onvoiceschanged = pickVoice;
  }

  /* ── voice ── */
  const onDayClose = () => KATHAA.App && KATHAA.App.showDayClosed();

  function play() {
    if (sessionOver) return; // day closed: no resurrection
    const synth = t();
    manuallyPaused = false;
    // voice mode: the hour ticks only while audio truly flows (Timer gates on synth.speaking)
    if (synth.paused) {
      synth.resume();
      KATHAA.Timer.start(onDayClose, 'voice');
      armHotword();
      setTimeout(() => {
        if (!synth.speaking && !KATHAA.Capture.isActive) speakLine(idx); // resume failed -> restart line
      }, 600);
      return;
    }
    if (!synth.speaking) {
      KATHAA.Timer.start(onDayClose, 'voice');
      speakLine(idx);
      return;
    }
    KATHAA.Timer.start(onDayClose, 'voice');
    armHotword();
  }

  let speakToken = 0;
  let manuallyPaused = false; // user pressed ⏸ (watchdog must hold, not skip)
  let sessionOver = false; // chapter completed/day closed -> NOTHING may speak after

  function speakLine(i, attempt = 0) {
    if (sessionOver) return; // STALE-TIMER GUARD: the show is over
    if (i >= lines.length) {
      endOfTonight();
      return;
    }
    idx = i;
    segStartTs = Date.now();
    KATHAA.Storage.savePosition(chapter.id, i); // persistent resume point (survives reloads)
    const line = lines[i];
    // FIX (readability): show the FULL text — scrollable panel, nothing truncated
    $now().innerHTML = `<p class="segment-title">${line.label} · ${i + 1}/${lines.length}</p>
                        <div class="line-text">${line.text}</div>`;
    const token = ++speakToken;
    let finished = false;

    const advance = () => {
      // this line is DONE -> next
      if (token !== speakToken || finished || sessionOver) return;
      finished = true;
      if (KATHAA.Capture.isActive) return;
      setTimeout(() => speakLine(i + 1), line.pauseAfter ?? 250);
    };
    const replay = () => {
      // engine hiccup -> same line once more
      if (token !== speakToken || finished) return;
      finished = true;
      if (KATHAA.Capture.isActive) return;
      if (attempt < 2) setTimeout(() => speakLine(i, attempt + 1), 400);
      else {
        KATHAA.toast('Skipping a tricky line — story continues');
        advance();
      }
    };

    const u = new SpeechSynthesisUtterance(line.text);
    u.rate = line.rate ?? 0.94; // performance layer (DELIVERY map)
    u.pitch = line.pitch ?? 1;
    if (chosenVoice) u.voice = chosenVoice; // India-English voice when available
    u.onend = advance;
    u.onerror = replay;

    t().speak(u); // speak (no cancel-race: see advance/replay)
    armHotword();

    // COMPLETION WATCHDOG (stuck-line bug): Chrome sometimes never fires onend.
    // Each line has an estimated duration; if it's long past due AND the engine
    // went idle -> advance. If it's absurdly overdue while 'speaking' -> force.
    const estMs = Math.max(5000, (line.text.length * 95) / (line.rate || 0.94));
    let elapsed = 0;
    const wd = setInterval(() => {
      if (token !== speakToken || finished) {
        clearInterval(wd);
        return;
      }
      if (manuallyPaused || KATHAA.Capture.isActive) return; // user hold: keep waiting
      elapsed += 1000;
      if (!t().speaking && !t().pending) {
        clearInterval(wd);
        advance();
      } else if (elapsed > estMs * 2.5) {
        t().cancel();
        clearInterval(wd);
        advance();
      }
    }, 1000);
  }

  function pauseV() {
    t().pause();
    manuallyPaused = true;
    KATHAA.Hotword.disarm();
    KATHAA.Timer.pause(); // paused story does NOT burn the hour
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    // founder request: voice fallback while paused — say “play” / “resume”
    PausedVoice.arm(() => play());
  }

  function armHotword() {
    document.getElementById('btn-play').disabled = true;
    document.getElementById('btn-pause').disabled = false;
    KATHAA.Hotword.arm(() => {
      // ROOT-CAUSE FIX: CANCEL, never pause(). Chrome wedges a paused utterance
      // forever once a SpeechRecognition mic session runs (resume() becomes a
      // no-op). Position is saved per line, so cancel + resume is lossless.
      t().cancel();
      openCaptureNow();
    });
  }

  /* Voice fallback when paused (founder request): say “play” / “resume” */
  const PausedVoice = (() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recog = null;
    function arm(onCommand) {
      disarm();
      if (!SR) return;
      recog = new SR();
      recog.continuous = true;
      recog.interimResults = false;
      recog.lang = 'en-IN';
      recog.onresult = (ev) => {
        const said = ev.results[ev.results.length - 1][0].transcript;
        if (/\b(play|resume|continue|start)\b/i.test(said)) {
          disarm();
          onCommand();
        }
      };
      try {
        recog.start();
      } catch {}
    }
    function disarm() {
      try {
        recog && recog.stop();
      } catch {}
      recog = null;
    }
    return { arm, disarm };
  })();

  /* ── capture hookup ── */
  /* DETERMINISTIC RESUME (founder bug #7): after a capture we do NOT trust
     Chrome's pause/speaking flags (zombie state: speaking=true while silent).
     We cancel the queue and re-speak the current line outright. */
  function resumeAfterCapture() {
    if (readingMode || sessionOver) return; // never resurrect a finished night
    if (KATHAA.Storage.getRemainingToday() === 0) {
      KATHAA.App.showDayClosed();
      return;
    }
    t().cancel();
    // 450ms: give Chrome time to fully release the mic from the capture engine
    // before TTS claims it again — then the speakLine watchdog catches anything else
    setTimeout(() => {
      KATHAA.Timer.start(onDayClose, 'voice');
      speakLine(idx);
    }, 450);
  }

  function openCaptureNow() {
    KATHAA.Capture.start(
      {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        posSec: positionSec(),
        mode: readingMode ? 'read' : 'voice',
      },
      (saved) => {
        if (saved)
          KATHAA.toast('Saved to your private journal 💛 — resuming the story');
        else KATHAA.toast('Capture discarded');
        document.getElementById('hotword-hint').textContent =
          'Hotword armed again — say “stop” anytime an idea strikes.';
        resumeAfterCapture();
      }
    );
  }

  /* ── reading mode ── */
  function setReadingMode(on) {
    readingMode = on;
    document.getElementById('voice-panel').classList.toggle('hidden', on);
    document.getElementById('read-panel').classList.toggle('hidden', !on);
    document.getElementById('btn-voice-mode').classList.toggle('primary', !on);
    document.getElementById('btn-read-mode').classList.toggle('primary', on);
    if (on) {
      t().cancel();
      KATHAA.Hotword.disarm();
      renderReading();
      KATHAA.Timer.start(onDayClose, 'read'); // actively reading engages the hour
    } else {
      resetUI();
      if (!t().speaking) KATHAA.Timer.stop(); // back on idle voice panel = not engaged yet
    }
  }

  function renderReading() {
    const panel = document.getElementById('read-panel');
    let html = `<h2>${chapter.title}</h2><div class="narrative muted">${chapter.intro || ''}</div>`;
    chapter.segments.forEach((seg) => {
      if (seg.type === 'padya') {
        html += `<div class="card padya-card">
          <p class="padya-sanskrit">${seg.sanskrit}</p>
          <p class="padya-translit">${seg.transliteration}</p>
          <p class="padya-bhava-label">Bhava</p>
          <p class="padya-bhava">${seg.bhava}</p></div>`;
        if (seg.narrativeAfter)
          html += `<div class="card narrative">${seg.narrativeAfter}</div>`;
      } else html += `<div class="card narrative">${seg.text}</div>`;
    });
    html +=
      '<button id="btn-finish-read" class="primary">✅ End of tonight — mark complete</button>';
    panel.innerHTML = html;
    document.getElementById('btn-finish-read').onclick = endOfTonight;
  }

  /* ── provenance strip ── */
  function renderProvenance(ch) {
    const p = ch.provenance || {};
    document.getElementById('prov-detail').innerHTML =
      `<p><b>Work:</b> ${p.work || '—'}</p>
       <p><b>Edition/source:</b> ${p.source || '—'}</p>
       <p><b>Bhava/translation:</b> ${p.translation || '—'}</p>
       ${p.alternate ? `<p><b>Alternate readings:</b> ${p.alternate}</p>` : ''}
       <p class="fineprint"><b>Status:</b> ${p.status || '—'}</p>`; // honesty > fake certainty (L-04)
  }

  /* ── completion ── */
  function endOfTonight() {
    sessionOver = true; // doors closed — no stale timer may speak
    t().cancel();
    KATHAA.Hotword.disarm();
    PausedVoice.disarm();
    KATHAA.Storage.markCompleted(chapter.id);
    KATHAA.Storage.clearPosition(chapter.id); // finished -> no resume point
    KATHAA.App.showDayClosed();
  }

  function disarmAll() {
    t().cancel();
    KATHAA.Hotword.disarm();
    PausedVoice.disarm();
  }

  return {
    load,
    play,
    pauseV,
    openCaptureNow,
    setReadingMode,
    disarmAll,
    get modeIsRead() {
      return readingMode;
    },
    get isLive() {
      return !!chapter && !!(t().speaking || t().paused);
    },
  };
})();
