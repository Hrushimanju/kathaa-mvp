/* Kathaa 360 — auto-deploy watcher
   Watches this folder; every saved change auto-pushes to kathaa.athi360.uk.
   Start it with auto-deploy-kathaa.bat (keep the window open while coding). */
const { watch } = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const DEBOUNCE_MS = 5000; // wait for saves to settle
let timer = null,
  deploying = false,
  queued = false;

const IGNORE = (p) =>
  p.includes('.wrangler') || // wrangler's own cache — would loop forever
  p.includes('node_modules') ||
  p.endsWith('.bat') ||
  p.endsWith('.log');

function deploy(reason) {
  if (deploying) {
    queued = true;
    return;
  }
  deploying = true;
  console.log(`\n[auto-deploy] ${reason} -> pushing to kathaa.athi360.uk ...`);
  const p = spawn(
    'cmd',
    [
      '/c',
      'npx wrangler pages deploy . --project-name=kathaa --commit-dirty=true',
    ],
    { stdio: 'inherit', cwd: __dirname }
  );
  p.on('exit', (code) => {
    deploying = false;
    console.log(
      code === 0
        ? '[auto-deploy] ✅ LIVE (takes ~30s to propagate)'
        : `[auto-deploy] ❌ failed (code ${code}) — fix and save again`
    );
    if (queued) {
      queued = false;
      deploy('(queued change)');
    }
  });
}

console.log(
  '[auto-deploy] 👀 watching kathaa-mvp — every save goes LIVE automatically.'
);
console.log(
  '[auto-deploy] Keep this window open while editing. Ctrl+C to stop.\n'
);

watch(__dirname, { recursive: true }, (ev, file) => {
  if (!file || IGNORE(file)) return;
  clearTimeout(timer);
  timer = setTimeout(() => deploy(`change in ${file}`), DEBOUNCE_MS);
});
