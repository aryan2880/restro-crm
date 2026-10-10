// Delegate to root build.js or execute universal build
const fs = require('fs');
const path = require('path');

const rootBuildScript = path.resolve(__dirname, '..', 'build.js');
if (fs.existsSync(rootBuildScript)) {
  require(rootBuildScript);
} else {
  console.error('Root build script not found.');
  process.exit(1);
}
