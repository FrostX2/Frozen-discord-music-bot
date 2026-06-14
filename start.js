const { spawn } = require('child_process');
const path = require('path');
const { execSync } = require('child_process');

const lavalinkDir = path.join(__dirname, 'lavalink');
let lavalinkProc = null;

function hasJava() {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function startLavalink() {
  return new Promise((resolve, reject) => {
    lavalinkProc = spawn('java', ['-jar', 'Lavalink.jar'], {
      cwd: lavalinkDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    lavalinkProc.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) console.log('[Lavalink]', text.split('\n').filter(Boolean).pop());
      if (text.includes('Started Launcher')) resolve(lavalinkProc);
    });

    lavalinkProc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) console.error('[Lavalink]', text);
    });

    lavalinkProc.on('close', (code) => {
      console.log(`Lavalink exited with code ${code}`);
      process.exit(1);
    });

    lavalinkProc.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => resolve(lavalinkProc), 8000);
  });
}

async function main() {
  const externalHost = process.env.LAVALINK_HOST;

  if (externalHost) {
    console.log(`Using external Lavalink at ${externalHost}:${process.env.LAVALINK_PORT || 2333}`);
  } else if (hasJava()) {
    console.log('Starting Lavalink...');
    await startLavalink();
    console.log('Lavalink is ready');
  } else {
    console.error('No Java found. Set LAVALINK_HOST env var to use an external Lavalink server.');
    process.exit(1);
  }

  process.on('exit', () => { if (lavalinkProc) lavalinkProc.kill(); });
  process.on('SIGINT', () => { if (lavalinkProc) lavalinkProc.kill(); process.exit(0); });
  process.on('SIGTERM', () => { if (lavalinkProc) lavalinkProc.kill(); process.exit(0); });

  require('./index.js');
}

main().catch(err => {
  console.error('Startup error:', err);
  if (lavalinkProc) lavalinkProc.kill();
  process.exit(1);
});
