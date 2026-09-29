/* Kathaa 360 — journal.js
   The private timeline: your ideas interleaved with where they struck you.
   Speaker reference per your onboarding choice (Charter rule 4). */
window.KATHAA = window.KATHAA || {};

KATHAA.Journal = (() => {
  function render() {
    const list = document.getElementById('journal-list');
    const entries = KATHAA.Storage.getJournal();
    if (!entries.length) {
      list.innerHTML = '<div class="card center-card"><p class="muted">Empty for now. Tonight, when an idea strikes mid-story, say <b>“stop”</b>.</p></div>';
      Voice.disarm();
      return;
    }
    let html = '', lastDay = '';
    for (const e of entries) {
      const d = new Date(e.ts);
      const day = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (day !== lastDay) { html += `<p class="day-gap">${day}</p>`; lastDay = day; }
      const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      html += `<div class="card jentry">
        <p class="meta">🕐 ${time} · during <b>${esc(e.chapterTitle)}</b> · at ${fmt(e.posSec)} · captured via ${e.mode} mode</p>
        <p><span class="who">${esc(KATHAA.Storage.speakerRef())}</span>${esc(e.text || '(voice note only)')}</p>
        ${e.audio ? `<audio controls data-audio="${e.id}" style="width:100%;margin-top:8px;"></audio>` : ''}
        <button data-del="${e.id}" style="margin-top:8px;border:none;background:none;color:#a4937d;cursor:pointer;">delete</button>
      </div>`;
    }
    html += '<p class="fineprint">🎙 Voice commands here: “delete” removes the newest entry · “close” returns home.</p>';
    list.innerHTML = html;
    list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      KATHAA.Storage.removeEntry(b.dataset.del); render();
    });
    Voice.arm();

    // hydrate voice-note players from IndexedDB (blobs -> object URLs)
    entries.filter(e => e.audio).forEach(e => {
      KATHAA.Storage.loadAudio(e.id).then(blob => {
        if (!blob) return;
        const el = document.querySelector(`audio[data-audio="${e.id}"]`);
        if (el) el.src = URL.createObjectURL(blob);
      }).catch(() => {});
    });
  }

  /* Voice control for the journal screen (founder flow):
     “delete”  -> remove newest entry
     “close/exit/back/home” -> leave the journal */
  const Voice = (() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recog = null, armed = false;

    function arm() {
      if (armed || !SR) return;
      armed = true;
      const start = () => {
        recog = new SR();
        recog.continuous = true; recog.interimResults = false; recog.lang = 'en-IN';
        recog.onresult = ev => {
          const said = ev.results[ev.results.length - 1][0].transcript;
          if (/\bdelete\b/i.test(said)) {
            const entries = KATHAA.Storage.getJournal();
            if (entries.length) {
              KATHAA.Storage.removeEntry(entries[0].id);
              KATHAA.toast('Newest entry deleted 🗑');
              render();
            } else KATHAA.toast('Journal is already empty');
          } else if (/\b(play|resume|continue)\b/i.test(said)) {
            disarm();
            KATHAA.toast('▶ Resuming the story');
            KATHAA.App.resumeStory();
          } else if (/\b(close|exit|back|home)\b/i.test(said)) {
            disarm();
            KATHAA.App.goHome();
          }
        };
        recog.onend = () => { if (armed) setTimeout(start, 300); };  // keep listening while journal is open
        try { recog.start(); } catch {}
      };
      start();
    }

    function disarm() {
      armed = false;
      try { recog && recog.stop(); } catch {}
      recog = null;
    }

    return { arm, disarm };
  })();

  function fmt(s) { return `${Math.floor(s / 60)}m ${s % 60}s`; }
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return { render, voice: Voice };
})();
