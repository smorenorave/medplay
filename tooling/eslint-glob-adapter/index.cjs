// Next.js loads this adapter with require(); its only used API is globSync.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { globSync: tinyGlobSync, isDynamicPattern } = require('tinyglobby');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

function globSync(patterns, options = {}) {
  // A literal absolute directory can become an empty matcher in tinyglobby.
  // Next.js supplies one root pattern at a time with onlyDirectories enabled.
  if (typeof patterns === 'string' && !isDynamicPattern(patterns) && options.onlyDirectories) {
    const absolutePath = path.resolve(options.cwd || process.cwd(), patterns);
    try {
      if (!fs.statSync(absolutePath).isDirectory()) return [];
      return [options.absolute ? absolutePath.replaceAll('\\', '/') : patterns];
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return [];
      throw error;
    }
  }
  return tinyGlobSync(patterns, {
    ...options,
    // fast-glob matches directories themselves rather than their descendants.
    expandDirectories: false,
  });
}

module.exports = { globSync };
