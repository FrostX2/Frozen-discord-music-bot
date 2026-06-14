require('dotenv').config();

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const NODELINK_DIR = path.join(__dirname, 'nodelink');
const NODELINK_SERVER_DIR = path.join(NODELINK_DIR, 'server');
const CONFIG_SRC = path.join(NODELINK_DIR, 'config.js');
const CONFIG_DST = path.join(NODELINK_SERVER_DIR, 'config.js');

function setupNodeLink() {
  if (fs.existsSync(path.join(NODELINK_SERVER_DIR, 'package.json'))) {
    console.log('NodeLink already installed');
    return;
  }

  console.log('Cloning NodeLink...');
  fs.mkdirSync(NODELINK_DIR, { recursive: true });
  execSync('git clone https://github.com/PerformanC/NodeLink.git server', {
    cwd: NODELINK_DIR,
    stdio: 'inherit',
  });

  console.log('Installing NodeLink dependencies...');
  execSync('npm install --ignore-scripts', {
    cwd: NODELINK_SERVER_DIR,
    stdio: 'inherit',
  });

  console.log('NodeLink setup complete');
}

function startNodeLink() {
  fs.copyFileSync(CONFIG_SRC, CONFIG_DST);

  const proc = spawn('node', [
    '--dns-result-order=ipv4first',
    '--import', 'tsx',
    'src/index.ts',
  ], {
    cwd: NODELINK_SERVER_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  proc.stdout.on('data', (data) => {
    for (const line of data.toString().trim().split('\n').filter(Boolean)) {
      console.log('[NodeLink]', line);
    }
  });

  proc.stderr.on('data', (data) => {
    for (const line of data.toString().trim().split('\n').filter(Boolean)) {
      console.error('[NodeLink]', line);
    }
  });

  proc.on('close', (code) => {
    console.log(`NodeLink exited with code ${code}`);
    process.exit(1);
  });

  proc.on('error', (err) => {
    console.error('Failed to start NodeLink:', err.message);
    process.exit(1);
  });

  return proc;
}

async function main() {
  const externalHost = process.env.LAVALINK_HOST;
  let nodelinkProc = null;

  if (externalHost) {
    console.log(`Using external Lavalink at ${externalHost}:${process.env.LAVALINK_PORT || 2333}`);
  } else {
    setupNodeLink();
    console.log('Starting NodeLink...');
    nodelinkProc = startNodeLink();

    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('NodeLink is ready');

    process.env.LAVALINK_HOST = 'localhost';
    process.env.LAVALINK_PORT = process.env.NODELINK_PORT || '2333';
    process.env.LAVALINK_PASSWORD = process.env.NODELINK_PASSWORD || 'youshallnotpass';
    process.env.LAVALINK_SECURE = 'false';
  }

  process.on('exit', () => { if (nodelinkProc) nodelinkProc.kill(); });
  process.on('SIGINT', () => { if (nodelinkProc) nodelinkProc.kill(); process.exit(0); });
  process.on('SIGTERM', () => { if (nodelinkProc) nodelinkProc.kill(); process.exit(0); });

  require('./index.js');
}

main().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
