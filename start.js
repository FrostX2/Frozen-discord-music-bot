const path = require('path');
const fs = require('fs');

// Load environment variables from /etc/secret/.env or fallback to .env
const secretEnvPath = '/etc/secrets/.env';
const localEnvPath = path.join(__dirname, '.env');
const envPath = fs.existsSync(secretEnvPath) ? secretEnvPath : localEnvPath;

require('dotenv').config({ path: envPath });

const { spawn } = require('child_process');
const net = require('net');

function isPortOpen(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onClose = () => { socket.destroy(); resolve(false); };
    socket.setTimeout(timeout);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', onClose);
    socket.once('timeout', onClose);
    socket.connect(port, host);
  });
}

const NODELINK_SERVER_DIR = path.join(__dirname, 'nodelink', 'server');
const CONFIG_DEFAULT = path.join(NODELINK_SERVER_DIR, 'config.default.js');
const CONFIG_DST = path.join(NODELINK_SERVER_DIR, 'config.js');

function writeConfig() {
  let cfg = fs.readFileSync(CONFIG_DEFAULT, 'utf-8');

  const port = process.env.NODELINK_PORT || '2333';
  const password = process.env.NODELINK_PASSWORD || 'youshallnotpass';
  const logLevel = process.env.NODELINK_LOG_LEVEL || 'info';

  cfg = cfg.replace(/port:\s*\d+,/g, `port: ${port},`);
  cfg = cfg.replace(/password:\s*'[^']*'/g, `password: '${password}'`);
  cfg = cfg.replace(/level:\s*'[^']*'/g, `level: '${logLevel}'`);
  cfg = cfg.replace(/enabled:\s*true,?\s*\/\/\s*active cluster/g, 'enabled: false, // active cluster');

  // YouTube TV refresh token for geo-bypass
  const ytTvToken = process.env.YOUTUBE_TV_REFRESH_TOKEN;
  if (ytTvToken) {
    cfg = cfg.replace(/refreshToken:\s*\[[^\]]*\]/g, `refreshToken: ['${ytTvToken}']`);
  }
  // Enable YouTube OAuth token retrieval
  cfg = cfg.replace(/getOAuthToken:\s*false/g, `getOAuthToken: true`);
  // Minimize YouTube playback clients for fast failure → immediate fallback to SoundCloud
  cfg = cfg.replace(/playback:\s*\[[^\]]*\]/g, "playback: ['Android']");
  // No retries on YouTube failure — fail fast, fallback fast
  cfg = cfg.replace(/maxRetries:\s*\d+/g, 'maxRetries: 0');

  fs.writeFileSync(CONFIG_DST, cfg);
}

function startNodeLink() {
  if (!fs.existsSync(CONFIG_DEFAULT)) {
    console.error('NodeLink not found. Run `node setup-nodelink.js` or set LAVALINK_HOST env var.');
    process.exit(1);
  }

  writeConfig();

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
  let nodelinkProc = null;

  if (process.env.SKIP_NODELINK === 'true') {
    console.log('Skipping NodeLink (SKIP_NODELINK=true) — will only use external Lavalink nodes');
  } else {
    console.log('Starting NodeLink...');
    nodelinkProc = startNodeLink();

    const port = Number(process.env.NODELINK_PORT || 2333);
    const host = '127.0.0.1';
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      if (nodelinkProc.exitCode !== null) {
        console.error(`NodeLink exited with code ${nodelinkProc.exitCode} before it could listen on port ${port}`);
        process.exit(1);
      }
      if (await isPortOpen(host, port)) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (Date.now() >= deadline) {
      console.warn(`NodeLink did not listen on port ${port} within 120s — continuing anyway`);
    } else {
      console.log('NodeLink is ready');
    }
  }

  process.on('exit', () => { if (nodelinkProc) nodelinkProc.kill(); });
  process.on('SIGINT', () => { if (nodelinkProc) nodelinkProc.kill(); process.exit(0); });
  process.on('SIGTERM', () => { if (nodelinkProc) nodelinkProc.kill(); process.exit(0); });

  require('./index.js');

  const webPort = process.env.WEB_PORT || 13426;
  console.log(`Admin panel: http://0.0.0.0:${webPort}`);
}

main().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
