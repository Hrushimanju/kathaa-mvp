/* Kathaa 360 — storage.js
   Everything client-side: profile, progress, journal. Privacy Charter rule 1. */
window.KATHAA = window.KATHAA || {};

/* toast helper — defined FIRST (capture/player/journal all use it) */
KATHAA.toast = msg => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(KATHAA._toastT);
  KATHAA._toastT = setTimeout(() => t.classList.add('hidden'), 2600);
};

KATHAA.Storage = (() => {
  const K = { profile: 'kath.profile.v1', progress: 'kath.progress.v1', journal: 'kath.journal.v1' };

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, val) => localStorage.setItem(key, JSON.stringify(val));
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── profile / onboarding ──
  const getProfile = () => read(K.profile, null);
  const saveProfile = p => write(K.profile, p);

  // speaker reference per onboarding choice (Charter rule 4)
  const speakerRef = () => {
    const p = getProfile(); if (!p) return '';
    switch (p.pref) {
      case 'i': return '';                                     // "I thought…"
      case 'name': return (p.name || 'Anonymous') + ' said: '; // "Hrush said:"
      case 'he': return 'He thought: ';
      case 'she': return 'She thought: ';
      case 'they': return 'They thought: ';
      default: return (p.custom || '') + ': ';
    }
  };

  // ── progress / daily gate ──
  const getProgress = () => read(K.progress, { secondsByDay: {}, completed: [] });
  const addSecondsToday = s => {
    const prog = getProgress(), t = todayKey();
    prog.secondsByDay[t] = Math.min((prog.secondsByDay[t] || 0) + s, KATHAA.DAILY_LIMIT);
    write(K.progress, prog);
    return getRemainingToday();
  };
  const usedToday = () => getProgress().secondsByDay[todayKey()] || 0;
  const getRemainingToday = () => Math.max(0, KATHAA.DAILY_LIMIT - usedToday());
  const markCompleted = chapterId => {
    const prog = getProgress();
    if (!prog.completed.includes(chapterId)) prog.completed.push(chapterId);
    prog.lastCompletedDate = todayKey();
    write(K.progress, prog);
  };
  const completedCount = () => getProgress().completed.length;

  // ── chapter position (resume support) ──
  const POS = 'kath.pos.v1';
  const getPosition = id => read(POS, {})[id] ?? 0;
  const savePosition = (id, idx) => { const p = read(POS, {}); p[id] = idx; write(POS, p); };
  const clearPosition = id => { const p = read(POS, {}); delete p[id]; write(POS, p); };

  // ── audio blobs (IndexedDB — FIX: localStorage 5MB cap was silently killing
  //    voice notes; blobs belong in the browser's large-object database) ──
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const rq = indexedDB.open('kathaa-audio', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('audio');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbp;
  }
  async function saveAudio(id, blob) {
    const database = await db();
    await new Promise((res, rej) => {
      const tx = database.transaction('audio', 'readwrite');
      tx.objectStore('audio').put(blob, id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  async function loadAudio(id) {
    const database = await db();
    return new Promise((res, rej) => {
      const rq = database.transaction('audio').objectStore('audio').get(id);
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => rej(rq.error);
    });
  }
  async function deleteAudio(id) {
    try {
      const database = await db();
      await new Promise((res, rej) => {
        const tx = database.transaction('audio', 'readwrite');
        tx.objectStore('audio').delete(id);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    } catch {}
  }

  // ── journal ──
  const getJournal = () => read(K.journal, []);
  const addEntry = e => {
    const j = getJournal();
    j.unshift(e);                       // newest first
    write(K.journal, j.slice(0, 500)); // sane cap for MVP
  };
  const removeEntry = id => {
    write(K.journal, getJournal().filter(e => e.id !== id));
    deleteAudio(id);                                     // purge the voice blob too
  };

  return { todayKey, getProfile, saveProfile, speakerRef,
           getProgress, addSecondsToday, usedToday, getRemainingToday,
           markCompleted, completedCount, getPosition, savePosition, clearPosition,
           saveAudio, loadAudio, deleteAudio,
           getJournal, addEntry, removeEntry };
})();

KATHAA.DAILY_LIMIT = 60 * 60;      // hard cap, seconds — L-01. NOT monetized.
KATHAA.WARN_AT = 10 * 60;          // soft warning when <=10 min remain (Daily Loop spec)

/* Narration Performance Layer v0 (founder feedback: emotional tone).
   Deliveries come from script annotations (`delivery` on segments),
   mapped to utterance params. Piper/expressive engines replace the
   underlying synthesis later — the ANNOTATIONS stay stable. */
KATHAA.DELIVERY = {
  neutral:  { rate: 0.94, pitch: 1.00, pauseAfter: 220 },
  warm:     { rate: 0.90, pitch: 1.00, pauseAfter: 320 },
  soft:     { rate: 0.86, pitch: 0.95, pauseAfter: 550 },   // "come, shishyas…"
  dramatic: { rate: 0.80, pitch: 0.85, pauseAfter: 750 },   // consequences, curses, battles
  solemn:   { rate: 0.82, pitch: 0.92, pauseAfter: 650 }    // blessings, resolutions
};
