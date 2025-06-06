const { execSync } = require('child_process');

console.log('Linking local packages...');

execSync('pnpm install', { stdio: 'inherit' });

console.log('Installing project dependencies...');
execSync("pnpm --filter './apps/**' install", { stdio: 'inherit' });
