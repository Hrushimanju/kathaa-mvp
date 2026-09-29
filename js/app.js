/* Kathaa 360 — app.js
   Screen routing, onboarding gate, daily unlock chain, graceful close. */
window.KATHAA = window.KATHAA || {};

KATHAA.App = (() => {
  const S = KATHAA.Storage;

  const BUILD = 'v0.1.16';  // bump this each deploy so the live site is always identifiable

  async function boot() {
    document.querySelectorAll('.brand').forEach(b =>
      b.innerHTML = b.innerHTML.replace(/<\/?small.*small>/g, '').trim() +
                    ` <small style="font-size:.65rem;color:#a4937d;">${BUILD}</small>`);
    // Founder dev-switch: triple-click the brand to reset today's hour (beta testing)
    let brandClicks = 0, brandTimer = null;
    document.querySelectorAll('.brand').forEach(b => b.onclick = () => {
      brandClicks++;
      clearTimeout(brandTimer);
      brandTimer = setTimeout(() => brandClicks = 0, 1500);
      if (brandClicks >= 3) {
        brandClicks = 0;
        localStorage.removeItem('kath.progress.v1');
        KATHAA.Timer.refreshBar();
        KATHAA.toast('🔄 Fresh hour granted (dev reset)');
      } else KATHAA.toast(`Reset in ${3 - brandClicks} more click${brandClicks === 2 ? '' : 's'}…`);
    });

    wireNav();
    document.getElementById('ob-save').onclick = saveOnboarding;
    document.getElementById('ob-pref').onchange = e =>
      document.getElementById('ob-custom').classList.toggle('hidden', e.target.value !== 'custom');
    document.getElementById('btn-play').onclick = () => KATHAA.Player.play();
    document.getElementById('btn-pause').onclick = () => KATHAA.Player.pauseV();
    document.getElementById('btn-stop-listen').onclick = () => KATHAA.Player.openCaptureNow();
    document.getElementById('cap-done').onclick = () => KATHAA.Capture.done();
    document.getElementById('cap-cancel').onclick = () => KATHAA.Capture.cancel();
    document.getElementById('btn-voice-mode').onclick = () => KATHAA.Player.setReadingMode(false);
    document.getElementById('btn-read-mode').onclick = () => KATHAA.Player.setReadingMode(true);
    document.getElementById('close-ok').onclick = closeDay;

    if (!S.getProfile()) show('screen-onboarding');
    else await goHome();
  }

  /* ── onboarding ── */
  function saveOnboarding() {
    const pref = document.getElementById('ob-pref').value;
    S.saveProfile({
      name: document.getElementById('ob-name').value.trim(),
      pref,
      custom: pref === 'custom' ? document.getElementById('ob-custom').value.trim() : ''
    });
    goHome();
  }

  /* ── routing ── */
  function wireNav() {
    document.querySelectorAll('nav [data-nav]').forEach(b =>
      b.onclick = () => b.dataset.nav === 'home' ? goHome() : goJournal());
  }
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    window.scrollTo(0, 0);
  }
  function stopEngagement() {
    if (KATHAA.Player && KATHAA.Player.disarmAll) KATHAA.Player.disarmAll();
    else { window.speechSynthesis && speechSynthesis.cancel(); KATHAA.Hotword.disarm(); }
    KATHAA.Timer.stop(); KATHAA.Timer.refreshBar();
  }

  async function goHome() {
    stopEngagement();
    if (KATHAA.Journal && KATHAA.Journal.voice) KATHAA.Journal.voice.disarm();

    // AUTO-RESUME (founder flow): journal closed while a story was live -> continue it
    if (KATHAA._resumeAfterJournal) {
      KATHAA._resumeAfterJournal = false;
      KATHAA.toast('📖 Journal closed — resuming the story');
      openPlayer(true);
      return;
    }

    show('screen-home');
    document.querySelectorAll('#screen-home nav button').forEach(b =>
      b.classList.toggle('active', b.dataset.nav === 'home'));

    const all = await KATHAA.Content.loadAll();
    const body = document.getElementById('home-body');
    const ch = KATHAA.Content.chapterForToday(all);

    if (!ch) {
      body.innerHTML = `<div class="card center-card"><h2>🏔 Series complete</h2>
        <p class="muted">You have heard all ${all.length} nights of the Jyotirlingas. New series are being prepared.</p></div>`;
      return;
    }
    if (S.getProgress().lastCompletedDate === S.todayKey()) {
      body.innerHTML = `<div class="card center-card"><h2>🌙 Tonight’s chapter is done</h2>
        <p class="muted">Revisit your thoughts in the journal, or rest. The story continues tomorrow.</p>
        <p class="teaser">${KATHAA.Content.teaserForTomorrow(all)}</p></div>`;
      return;
    }
    body.innerHTML = `<div class="card"><p class="segment-title">Night ${S.completedCount() + 1} of ${all.length}</p>
      <h2>${ch.title}</h2>
      <p class="muted">${ch.intro ? ch.intro.slice(0, 140) + '…' : ''}</p>
      <button id="btn-open" class="primary" style="margin-top:14px;">Begin tonight 🌅</button></div>`;
    document.getElementById('btn-open').onclick = openPlayer;
  }

  async function openPlayer(autoPlay = false) {
    const all = await KATHAA.Content.loadAll();
    const ch = KATHAA.Content.chapterForToday(all);
    if (!ch) return;
    show('screen-player');
    KATHAA.Player.load(ch);
    // FIX (founder feedback): the hour does NOT tick just by being here.
    // Timer arms only when Play is pressed or Reading mode is entered
    // (Player.js calls KATHAA.Timer.start(...) at those moments).
    KATHAA.Timer.refreshBar();
    if (autoPlay) KATHAA.Player.play();     // journal-close resume: continue automatically
  }

  async function goJournal() {
    // remember whether a story was actively playing so journal-close resumes it
    KATHAA._resumeAfterJournal = !!KATHAA.Player.isLive;
    stopEngagement();
    show('screen-journal');
    document.querySelectorAll('#screen-journal nav button').forEach(b =>
      b.classList.toggle('active', b.dataset.nav === 'journal'));
    KATHAA.Journal.render();          // also arms journal voice commands
  }

  /* ── the graceful close (L-01: philosophy, not pricing) ── */
  async function showDayClosed() {
    stopEngagement();
    const all = await KATHAA.Content.loadAll();
    document.getElementById('close-msg').textContent =
      'Story pauses here. Go live your day — family, work, sleep. That is the design working.';
    document.getElementById('close-teaser').textContent =
      KATHAA.Content.teaserForTomorrow(all) || '';
    document.getElementById('close-overlay').classList.remove('hidden');
  }
  function closeDay() {
    document.getElementById('close-overlay').classList.add('hidden');
    goHome();
  }

  function resumeStory() { openPlayer(true); }          // voice “play/resume” from journal

  return { boot, showDayClosed, goHome, goJournal, resumeStory };
})();

document.addEventListener('DOMContentLoaded', () => KATHAA.App.boot());
