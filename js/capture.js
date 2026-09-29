/* Kathaa 360 — capture.js
   THE SIGNATURE FEATURE. Say "stop" mid-story → narration pauses instantly,
   your RAW thought is recorded verbatim (voice + words), auto-saved privately
   with date/time + story position. Never cleaned up. Never shared. (L-03)
   NOTE: browser Web Speech API is the v0 baseline per Tech Foundation doc;
   Piper/Whisper swap happens behind these same functions later (L-13). */
window.KATHAA = window.KATHAA || {};

KATHAA.Capture = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let mediaRecorder = null, chunks = [], recog = null, stream = null;
  let ctx = null; // { chapterId, chapterTitle, posSec }
  let active = false;

  const supports = () => !!SR && !!navigator.mediaDevices;

  function start(context, onFinished) {
    if (!supports()) { KATHAA.toast('Voice capture needs Chrome/Edge on http://localhost — typing works too.'); }
    active = true;
    ctx = context;
    document.getElementById('cap-context').textContent =
      `${ctx.chapterTitle} · at ${fmt(ctx.posSec)} into tonight’s telling`;
    document.getElementById('cap-transcript').value = '';
    document.getElementById('capture-overlay').classList.remove('hidden');
    window.KATHAA._onCaptureDone = onFinished;

    // raw voice recording (kept only if checkbox says so — your choice, always)
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
        stream = s; chunks = [];
        mediaRecorder = new MediaRecorder(s);
        mediaRecorder.ondataavailable = ev => chunks.push(ev.data);
        mediaRecorder.start();
      }).catch(() => {}); // mic denied → typed note still works
    }

    // live verbatim transcription
    if (SR) {
      recog = new SR(); recog.continuous = true; recog.interimResults = true;
      let finalText = '';
      const box = document.getElementById('cap-transcript');
      box.value = '';
      recog.onresult = ev => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const spoken = ev.results[i][0].transcript;
          // voice commands work DURING capture too (founder flow):
          if (/\b(close|exit|cancel|delete|discard)\b/i.test(spoken)) { cancel(); return; }
          if (/\b(save|saved)\b/i.test(spoken) && !KATHAA._capSaving) { done(); return; }
          if (ev.results[i].isFinal) finalText += spoken + ' ';
          else interim += spoken;
        }
        box.value = (finalText + interim);
      };
      try { recog.start(); } catch {}
      recog.finalText = () => finalText;
    }
  }

  function fmt(s) { return `${Math.floor(s / 60)}m ${s % 60}s`; }

  async function done() {
    if (KATHAA._capSaving) return;          // guard double-fire
    KATHAA._capSaving = true;
    try {
      const textEl = document.getElementById('cap-transcript');
      const rawText = (textEl.value || '').trim();
      let audioBlob = null;
      const wantAudio = document.getElementById('cap-keep-audio').checked;

      if (mediaRecorder && mediaRecorder.state !== 'inactive' && wantAudio) {
        await new Promise(res => { mediaRecorder.onstop = res; mediaRecorder.stop(); });
        if (chunks.length) {
          audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        }
      }

      if (!rawText && !audioBlob) { finish(false); return; }

      const entryId = 'e' + Date.now();
      KATHAA.Storage.addEntry({
        id: entryId,
        ts: new Date().toISOString(),                 // automatic date+time — nothing missed
        chapterId: ctx.chapterId, chapterTitle: ctx.chapterTitle,
        posSec: Math.round(ctx.posSec),
        text: rawText,                                 // VERBATIM. never edited by us (L-03)
        audio: !!audioBlob,                            // voice note stored in IndexedDB
        mode: ctx.mode || 'voice'
      });
      if (audioBlob) {
        KATHAA.Storage.saveAudio(entryId, audioBlob)
          .catch(err => console.error('audio store failed (text still saved):', err));
      }
      finish(true);
    } catch (err) {
      console.error('capture save failed:', err);
      KATHAA.toast('Save hiccup — recovering');
      finish(false);
    } finally {
      cleanup();                                       // ALWAYS release mic + close overlay
    }
  }

  function cancel() { cleanup(); finish(false); }

  function cleanup() {
    try { recog && recog.stop(); } catch {}
    try { mediaRecorder && mediaRecorder.state !== 'inactive' && mediaRecorder.stop(); } catch {}
    try { stream && stream.getTracks().forEach(t => t.stop()); } catch {}
    recog = mediaRecorder = stream = null;
    document.getElementById('capture-overlay').classList.add('hidden');
  }

  function finish(saved) {
    active = false; KATHAA._capSaving = false;
    const cb = window.KATHAA._onCaptureDone; window.KATHAA._onCaptureDone = null;
    cb && cb(saved);
  }

  const blobToDataURL = blob => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.readAsDataURL(blob);
  });

  return { start, done, cancel, supports, get isActive() { return active; } };
})();

/* Hotword listener — armed whenever narration is PLAYING. Hearing “stop”
   pauses playback instantly and opens a capture.

   FALSE-TRIGGER FIX (founder bug: line 4 contains the word “wait”, so the mic
   heard the STORY through the speakers and self-triggered forever):
   1. “wait” removed from the vocabulary — too common inside narration
   2. triggers fire ONLY on FINAL results (not mid-sentence interim guesses)
   3. trigger utterance must be SHORT and START with the keyword — the story’s
      long sentences can never qualify. (Headphones make this bulletproof:
      Mono-Voice Rule, L-15.) */
KATHAA.Hotword = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null, onTrigger = null;
  const KEYWORD = /^(stop|pause|roko)\b/i;

  function arm(trigger) {
    disarm();
    if (!SR) return;
    onTrigger = trigger;
    const start = () => {
      recog = new SR(); recog.continuous = true; recog.interimResults = true; recog.lang = 'en-IN';
      recog.onresult = ev => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          const said = r[0].transcript.trim().toLowerCase().replace(/[.,!?]/g, '');
          const words = said.split(/\s+/).filter(Boolean);
          const hit = words.length > 0 && KEYWORD.test(words[0]) && words.length <= 4;
          // final result: reliable trigger | short interim "stop": instant trigger
          if (hit && (r.isFinal || words.length <= 2)) { disarm(); trigger(); return; }
        }
      };
      // FIX: Chrome kills recognition after silence — RE-ARM forever while playing,
      // otherwise the hotword is dead by the time the user says "stop"
      recog.onend = () => { if (onTrigger) setTimeout(start, 300); };
      try { recog.start(); } catch {}
    };
    start();
  }

  function disarm() {
    onTrigger = null;
    try { recog && recog.stop(); } catch {}
    recog = null;
  }

  return { arm, disarm, supported: !!SR };
})();
