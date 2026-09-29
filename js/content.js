/* Kathaa 360 — content.js
   Loads chapter JSON files from content/. Provenance strips come straight
   from the chapter files (Content Pipeline spec). */
window.KATHAA = window.KATHAA || {};

KATHAA.Content = (() => {
  const SERIES_DIR = 'content/jyotirlinga';
  // file order == story order; count drives the daily unlock chain
  const FILES = [
    `${SERIES_DIR}/ch01-somnath.json`,
    `${SERIES_DIR}/ch02-mallikarjuna.json`,
    `${SERIES_DIR}/ch03-mahakaleshwar.json`
  ];
  let cache = null;

  async function loadAll() {
    if (cache) return cache;
    const results = await Promise.allSettled(FILES.map(f => fetch(f).then(r => {
      if (!r.ok) throw new Error(`missing ${f}`);
      return r.json();
    })));
    cache = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    return cache;
  }

  // the chapter unlocked TODAY = number of chapters already completed
  function chapterForToday(all) {
    const done = KATHAA.Storage.completedCount();
    if (done >= all.length) return null;               // series finished (MVP has 3)
    return all[done];
  }

  function teaserForTomorrow(all) {
    const done = KATHAA.Storage.completedCount();
    if (done + 1 >= all.length) return 'The final night of this series awaits…';
    const next = all[Math.min(done + 1, all.length - 1)];
    return next ? `Tomorrow — ${next.title}: ${next.teaser}` : '';
  }

  // split a narrative block into sentence-sized utterance lines
  // (founder fix: resume granularity — stop mid-paragraph, resume at the SENTENCE,
  //  not the whole segment re-read from its first word)
  function splitSentences(text) {
    return text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
  }

  // flattened speakable lines for voice mode
  function narrationLines(ch) {
    const D = KATHAA.DELIVERY;
    const pick = d => D[d] || D.neutral;
    const lines = [{ label: ch.title, text: ch.title + '. ' + (ch.intro || ''),
                     ...(pick(ch.delivery || 'warm')) }];
    for (const seg of ch.segments) {
      if (seg.type === 'padya') {
        lines.push({ label: 'Padya', text: seg.say || seg.transliteration,
                     rate: 0.78, pitch: 1.04, pauseAfter: 900 });        // chant-ish cadence
        lines.push({ label: 'Bhava', text: seg.bhava, ...(pick(seg.bhavaDelivery || 'warm')) });
        if (seg.narrativeAfter) pushNarrative(lines, seg.narrativeAfter, seg.delivery);
      } else {
        pushNarrative(lines, seg.text, seg.delivery);
      }
    }
    return lines;
  }

  function pushNarrative(lines, text, delivery) {
    const style = pick(delivery);
    splitSentences(text).forEach((s, k) => {
      lines.push({
        label: k === 0 ? 'Story' : '…',
        text: s,
        ...style,
        pauseAfter: (style.pauseAfter ?? 250) - 100      // sentence joints: shorter breath
      });
    });
  }

  return { loadAll, chapterForToday, teaserForTomorrow, narrationLines };
})();
