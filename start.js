require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

  if (process.env.LAVALINK_HOST) {
    console.log(`Using external Lavalink at ${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT || 2333}`);
  } else {
    console.log('Starting NodeLink...');
    nodelinkProc = startNodeLink();

    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('NodeLink is ready');
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
