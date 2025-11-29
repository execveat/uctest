const { existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const repoRoot = join(__dirname, '..');
const gitDir = join(repoRoot, '.git');

if (!existsSync(gitDir)) {
  // Dependency installs from git tarballs do not include .git; skip husky there.
  return;
}

try {
  execSync('npx husky install', { cwd: repoRoot, stdio: 'inherit' });
} catch (error) {
  // Husky is nice to have locally but must not break installs.
  console.warn('Skipping husky install:', error.message);
}
