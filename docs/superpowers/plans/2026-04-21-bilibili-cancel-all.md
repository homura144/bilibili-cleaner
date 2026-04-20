# BiliBili Cleaner Cancel All Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hover-dependent per-page userscript workflow with one `一键取消所有` button that cancels every follow item from the current page through the final page.

**Architecture:** Keep the single-file userscript, but refactor it into small helpers for DOM querying, menu interaction, confirmation handling, pagination, and button state updates. Export the helper bundle in Node so a small regression test can drive the selector logic before browser-only initialization runs in the userscript environment.

**Tech Stack:** Vanilla userscript JavaScript, Node.js built-in test runner, JSDOM for DOM-based regression tests

---

### Task 1: Add a DOM test harness around the userscript helpers

**Files:**
- Modify: `C:\Users\homura\Project\Web\BiliBili Cleaner\BiliBili Cleaner.js`
- Create: `C:\Users\homura\Project\Web\BiliBili Cleaner\tests\bilibili-cleaner.test.js`
- Create: `C:\Users\homura\Project\Web\BiliBili Cleaner\package.json`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createCleanerApp } from '../BiliBili Cleaner.js';

test('findCancelAction prefers visible cancel entries', () => {
  const dom = new JSDOM(`
    <div class="menu-popover__panel-item" style="display:none">取消追番</div>
    <div class="menu-popover__panel-item">分享</div>
    <div class="menu-popover__panel-item">取消追剧</div>
  `);
  const app = createCleanerApp(dom.window);
  const action = app.findCancelAction();
  assert.equal(action?.textContent?.trim(), '取消追剧');
});

test('findNextPageButton returns enabled next-page control', () => {
  const dom = new JSDOM(`
    <button disabled>下一页</button>
    <button class="pager-btn">下一页</button>
  `);
  const app = createCleanerApp(dom.window);
  const button = app.findNextPageButton();
  assert.equal(button?.className, 'pager-btn');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test .\tests\bilibili-cleaner.test.js`
Expected: FAIL with an import/export error because `createCleanerApp` is not exported yet.

- [ ] **Step 3: Write minimal implementation**

```js
function createCleanerApp(rootWindow = window) {
  const { document } = rootWindow;

  function findCancelAction() {
    return Array.from(document.querySelectorAll('.menu-popover__panel-item, [role="menuitem"]'))
      .find((node) => /取消追/.test(node.textContent || '') && node.offsetParent !== null);
  }

  function findNextPageButton() {
    return Array.from(document.querySelectorAll('button, a'))
      .find((node) => (node.textContent || '').includes('下一页') && !node.disabled);
  }

  return { findCancelAction, findNextPageButton };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCleanerApp };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test .\tests\bilibili-cleaner.test.js`
Expected: PASS for both tests.

- [ ] **Step 5: Commit**

```bash
# Skip: current workspace is not a git repository.
```

### Task 2: Replace the old floating UI with a single batch-action button

**Files:**
- Modify: `C:\Users\homura\Project\Web\BiliBili Cleaner\BiliBili Cleaner.js`
- Test: `C:\Users\homura\Project\Web\BiliBili Cleaner\tests\bilibili-cleaner.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('mountControlButton inserts one cancel-all button next to the filter bar', () => {
  const dom = new JSDOM(`
    <div class="radio-filter">
      <div class="radio-filter__item">想看</div>
      <div class="radio-filter__item">看过</div>
    </div>
  `);
  const app = createCleanerApp(dom.window);
  app.mountControlButton();
  app.mountControlButton();

  const buttons = dom.window.document.querySelectorAll('#bangumi-control-btns button');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent.trim(), '一键取消所有');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test .\tests\bilibili-cleaner.test.js`
Expected: FAIL with `mountControlButton is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
function mountControlButton() {
  const anchor = Array.from(document.querySelectorAll('.radio-filter__item'))
    .find((node) => (node.textContent || '').includes('看过'));
  if (!anchor || document.getElementById('bangumi-control-btns')) return;

  const container = document.createElement('div');
  container.id = 'bangumi-control-btns';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.marginLeft = '8px';

  const button = document.createElement('button');
  button.id = 'bangumi-cancel-all-btn';
  button.textContent = '一键取消所有';
  container.appendChild(button);
  anchor.parentNode.insertBefore(container, anchor.nextSibling);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test .\tests\bilibili-cleaner.test.js`
Expected: PASS with the new mount test and the helper tests all green.

- [ ] **Step 5: Commit**

```bash
# Skip: current workspace is not a git repository.
```

### Task 3: Implement cancel-all processing, confirmation handling, and pagination

**Files:**
- Modify: `C:\Users\homura\Project\Web\BiliBili Cleaner\BiliBili Cleaner.js`
- Test: `C:\Users\homura\Project\Web\BiliBili Cleaner\tests\bilibili-cleaner.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('buildSummaryMessage reports success, failures, and page count', () => {
  const dom = new JSDOM('<div></div>');
  const app = createCleanerApp(dom.window);
  const message = app.buildSummaryMessage({ success: 12, failed: 2, pages: 3 });
  assert.equal(message, '批量取消完成 ✅\\n成功: 12\\n失败: 2\\n处理页数: 3');
});

test('findConfirmButton matches visible confirm actions', () => {
  const dom = new JSDOM(`
    <button style="display:none">确定</button>
    <button>取消</button>
    <button>确认</button>
  `);
  const app = createCleanerApp(dom.window);
  assert.equal(app.findConfirmButton()?.textContent?.trim(), '确认');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test .\tests\bilibili-cleaner.test.js`
Expected: FAIL because the new helper functions do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
function findConfirmButton() {
  return Array.from(document.querySelectorAll('button, .vui_button'))
    .find((node) => /^(确定|确认|继续)$/.test((node.textContent || '').trim()) && node.offsetParent !== null);
}

function buildSummaryMessage(stats) {
  return [
    '批量取消完成 ✅',
    `成功: ${stats.success}`,
    `失败: ${stats.failed}`,
    `处理页数: ${stats.pages}`,
  ].join('\n');
}

async function cancelAllFromCurrentPage() {
  // 逐条执行取消，当前页完成后自动翻页直到最后一页
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test .\tests\bilibili-cleaner.test.js`
Expected: PASS for summary and confirm-button coverage.

- [ ] **Step 5: Commit**

```bash
# Skip: current workspace is not a git repository.
```

### Task 4: Verify browser-safe behavior and regression coverage

**Files:**
- Modify: `C:\Users\homura\Project\Web\BiliBili Cleaner\BiliBili Cleaner.js`
- Test: `C:\Users\homura\Project\Web\BiliBili Cleaner\tests\bilibili-cleaner.test.js`

- [ ] **Step 1: Write the failing verification command**

```bash
node --check ".\BiliBili Cleaner.js"
node --test ".\tests\bilibili-cleaner.test.js"
```

- [ ] **Step 2: Run verification to observe any remaining failures**

Run: `node --check ".\BiliBili Cleaner.js"` and `node --test ".\tests\bilibili-cleaner.test.js"`
Expected: Any syntax or regression failure is visible before final cleanup.

- [ ] **Step 3: Write minimal implementation fixes**

```js
window.addEventListener('load', () => {
  setTimeout(() => {
    mountControlButton();
    observeForReinjection();
  }, 2000);
});
```

- [ ] **Step 4: Run verification to confirm all green**

Run: `node --check ".\BiliBili Cleaner.js"` and `node --test ".\tests\bilibili-cleaner.test.js"`
Expected: syntax check succeeds and every regression test passes.

- [ ] **Step 5: Commit**

```bash
# Skip: current workspace is not a git repository.
```
