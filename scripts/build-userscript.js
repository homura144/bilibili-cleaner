const fs = require('node:fs');
const path = require('node:path');

const SOURCE_FILE_NAME = 'BiliBili Cleaner.js';
const OUTPUT_RELATIVE_PATH = path.join('dist', 'bilibili-cleaner.user.js');

function buildUserscript(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const sourcePath = path.join(rootDir, SOURCE_FILE_NAME);
  const outputPath = path.join(rootDir, OUTPUT_RELATIVE_PATH);
  const sourceCode = fs.readFileSync(sourcePath, 'utf8');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, sourceCode, 'utf8');

  return { sourcePath, outputPath };
}

if (require.main === module) {
  const result = buildUserscript();
  process.stdout.write(`Built userscript: ${result.outputPath}\n`);
}

module.exports = {
  SOURCE_FILE_NAME,
  OUTPUT_RELATIVE_PATH,
  buildUserscript,
};
