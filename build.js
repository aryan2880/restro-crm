const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Starting Universal Vercel Build ---');
console.log('Current working directory:', process.cwd());

// 1. Locate client directory
let clientDir = null;
if (fs.existsSync(path.resolve(process.cwd(), 'client', 'package.json'))) {
  clientDir = path.resolve(process.cwd(), 'client');
} else if (fs.existsSync(path.resolve(process.cwd(), '..', 'client', 'package.json'))) {
  clientDir = path.resolve(process.cwd(), '..', 'client');
} else if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
    if (pkg.name === 'client') {
      clientDir = path.resolve(process.cwd());
    }
  } catch (e) {}
}

if (!clientDir) {
  console.error('Error: Could not locate client directory from', process.cwd());
  process.exit(1);
}

console.log('Found client directory at:', clientDir);

// 2. Install dependencies & build client bundle
console.log('Installing client dependencies...');
execSync(`npm --prefix "${clientDir}" install`, { stdio: 'inherit' });

console.log('Building client production bundle with Vite...');
execSync(`npm --prefix "${clientDir}" run build`, { stdio: 'inherit' });

const builtDist = path.join(clientDir, 'dist');
if (!fs.existsSync(builtDist)) {
  console.error('Error: Expected output directory does not exist:', builtDist);
  process.exit(1);
}

// 3. Ensure a copy of dist exists in the current working directory
const localDist = path.resolve(process.cwd(), 'dist');
if (path.resolve(localDist) !== path.resolve(builtDist)) {
  console.log(`Copying dist to local working directory: ${localDist}`);
  fs.cpSync(builtDist, localDist, { recursive: true });
}

// Also ensure root/dist exists if running inside server
const rootDist = path.resolve(clientDir, '..', 'dist');
if (path.resolve(rootDist) !== path.resolve(localDist)) {
  fs.cpSync(builtDist, rootDist, { recursive: true });
}

console.log('✓ Universal Vercel Build completed successfully!');
