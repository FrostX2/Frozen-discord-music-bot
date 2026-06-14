const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const NODELINK_SERVER_DIR = path.join(__dirname, 'nodelink', 'server');

if (fs.existsSync(path.join(NODELINK_SERVER_DIR, 'package.json'))) {
  console.log('NodeLink already installed');
  process.exit(0);
}

console.log('Cloning NodeLink...');
fs.mkdirSync(path.join(__dirname, 'nodelink'), { recursive: true });
execSync('git clone https://github.com/PerformanC/NodeLink.git server', {
  cwd: path.join(__dirname, 'nodelink'),
  stdio: 'inherit',
});

console.log('Installing NodeLink dependencies...');
execSync('npm install --include=dev --ignore-scripts', {
  cwd: NODELINK_SERVER_DIR,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
});

console.log('NodeLink setup complete');
