const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildUserscript } = require('../scripts/build-userscript.js');

test('buildUserscript copies the distributable userscript to a fixed dist path', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bilibili-cleaner-build-'));
  const sourcePath = path.join(tempRoot, 'BiliBili Cleaner.js');
  const outputPath = path.join(tempRoot, 'dist', 'bilibili-cleaner.user.js');
  const sourceCode = `// ==UserScript==
// @name Example
// ==/UserScript==

console.log('hello');
`;

  fs.writeFileSync(sourcePath, sourceCode, 'utf8');

  const result = buildUserscript({ rootDir: tempRoot });

  assert.equal(result.outputPath, outputPath);
  assert.equal(fs.readFileSync(outputPath, 'utf8'), sourceCode);
});
