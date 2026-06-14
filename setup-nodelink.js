const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const NODELINK_SERVER_DIR = path.join(__dirname, 'nodelink', 'server');

if (fs.existsSync(path.join(NODELINK_SERVER_DIR, 'package.json'))) {
  process.exit(0);
}

if (process.env.SKIP_NODELINK_SETUP) {
  process.exit(0);
}

try {
  console.log('Setting up NodeLink...');
  fs.mkdirSync(path.join(__dirname, 'nodelink'), { recursive: true });

  if (!fs.existsSync(NODELINK_SERVER_DIR)) {
    execSync('git clone --depth 1 https://github.com/PerformanC/NodeLink.git server', {
      cwd: path.join(__dirname, 'nodelink'),
      stdio: 'inherit',
    });
  }

  execSync('npm install --include=dev --ignore-scripts', {
    cwd: NODELINK_SERVER_DIR,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  console.log('NodeLink ready');
} catch (err) {
  console.error('NodeLink setup failed (non-fatal):', err.message);
}
