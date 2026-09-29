# Kathaa 360 — Daily Family Story

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/yourorg/katha/actions/workflows/ci.yml/badge.svg)](https://github.com/yourorg/katha/actions/workflows/ci.yml)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourorg/katha)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/your-template)

> **Kathaa 360** delivers a personalized, enriching story every day to preserve family knowledge and spark imagination.

---

# Kathaa 360 — MVP (v0.1)

Athi 360 Ltd · Daily Stories product · see `../../01-KATHAA-360/` for the binding specs.

## Run it

```bash
cd "D:\Athi 360\apps\kathaa-mvp"
python -m http.server 8080
# open http://localhost:8080 in Chrome or Edge
```

Voice features (say-"stop" hotword + live transcription + mic recording) require Chrome/Edge on `localhost` — browser security rules.

## What's implemented (matches MVP cut, `06-MVP-and-Roadmap.md`)

- ✅ Onboarding: optional name + speaker-reference preference (Charter rule 4)
- ✅ Daily unlock chain — one chapter/day, progress-driven cliffhanger teasers (L-02)
- ✅ Voice mode: segment-by-segment narration, play/pause (Web Speech API v0 baseline; Piper swap later, L-13)
- ✅ **Stop-capture**: say "stop" → instant pause → raw verbatim transcript + optional raw audio → auto journal entry with date/time + story position (L-03)
- ✅ Reading mode: Devanagari padya + transliteration + bhava cards, capture button too
- ✅ Provenance strip on every chapter (L-04) — Chapter 1 marked **AI-DRAFT, pending human review**
- ✅ Hard 60-min cap: soft warning at 10 min left, graceful close + tomorrow teaser (L-01). No extension exists.
- ✅ Private journal timeline: ideas interleaved with story positions, delete anytime

## Privacy notes (this build)

Journal/profile/audio live ONLY in this browser's localStorage. Nothing leaves the machine.
Encryption-at-rest + server sync arrive post-MVP per the Charter — tracked as known gap.

## Known gaps / next

- **Pronunciation authenticity (L-19):** delivered-by-region policy — Indian device/audio standard comes first; native-listener QA gate added to content pipeline before ANY chapter publishes; recording vidwans (L-18) remain the gold standard for padyas
- **L-15 (new, pending code):** age-tiered capture — child profiles must drop the raw-audio checkbox entirely (transcript-only); request `noiseSuppression/echoCancellation/autoGainControl` on getUserMedia; save-confirmation step. Current build saves audio for the single local profile (adult use OK for dev).
- Web Speech TTS voice = plain browser voice; Acharya-ji persona pacing lands with Piper (L-13)
- SpeechRecognition language fixed en-IN; multilingual padya-aware narration later
- No auth/account yet — single local profile (per MVP cut)
- Content: ch2/ch3 are stubs needing full pipeline drafts; all content pending scholar review gate (Content Pipeline §Production Workflow)

## File map

```
index.html            shell + screens
css/style.css         calm parchment theme
js/storage.js         profile/progress/journal persistence (client-side)
js/content.js         chapter loading + daily-unlock logic
js/timer.js           60-min philosophy engine (L-01/L-02)
js/capture.js         stop-capture + hotword listener (L-03 signature feature)
js/player.js          voice/reading modes + provenance rendering
js/journal.js         private timeline view
js/app.js             routing/onboarding/close choreography
content/jyotirlinga/  chapter JSON files with provenance strips
```
