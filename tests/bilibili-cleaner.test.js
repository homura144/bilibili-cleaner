const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { createCleanerApp } = require('../BiliBili Cleaner.js');

function setupPaginatedDom() {
  const dom = new JSDOM(`
    <body>
      <div class="radio-filter">
        <div class="radio-filter__item">想看</div>
        <div class="radio-filter__item">看过</div>
      </div>
      <div id="list"></div>
      <div id="pager">
        <button id="next-page-btn">下一页</button>
      </div>
    </body>
  `, { url: 'https://space.bilibili.com/1/bangumi' });

  const { window } = dom;
  const { document } = window;
  const alerts = [];
  const pages = [
    ['孤独摇滚', '葬送的芙莉莲'],
    ['药屋少女的呢喃']
  ];
  let pageIndex = 0;

  window.alert = (message) => alerts.push(message);

  function removeMenus() {
    document.querySelectorAll('.menu-popover__panel-item').forEach((node) => node.remove());
  }

  function renderPage(index) {
    removeMenus();
    const list = document.getElementById('list');
    list.innerHTML = '';
    for (const title of pages[index]) {
      const card = document.createElement('div');
      card.className = 'bili-bangumi-card';

      const titleNode = document.createElement('div');
      titleNode.className = 'bili-bangumi-card__title';
      titleNode.textContent = title;

      const moreButton = document.createElement('button');
      moreButton.type = 'button';
      moreButton.className = 'more-btn';
      moreButton.innerHTML = '<span class="sic-BDC-more_vertical_fill"></span>';
      moreButton.addEventListener('click', () => {
        removeMenus();
        const cancelItem = document.createElement('button');
        cancelItem.type = 'button';
        cancelItem.className = 'menu-popover__panel-item';
        cancelItem.textContent = '取消追番';
        cancelItem.addEventListener('click', () => {
          card.remove();
          cancelItem.remove();
        });
        document.body.appendChild(cancelItem);
      });

      card.appendChild(titleNode);
      card.appendChild(moreButton);
      list.appendChild(card);
    }

    const nextPageButton = document.getElementById('next-page-btn');
    nextPageButton.disabled = index >= pages.length - 1;
  }

  document.getElementById('next-page-btn').addEventListener('click', () => {
    if (pageIndex >= pages.length - 1) return;
    pageIndex += 1;
    renderPage(pageIndex);
  });

  renderPage(pageIndex);

  return { dom, alerts, document };
}

function setupToggleMenuDom() {
  const dom = new JSDOM(`
    <body>
      <div class="radio-filter">
        <div class="radio-filter__item">想看</div>
        <div class="radio-filter__item">看过</div>
      </div>
      <div id="list"></div>
    </body>
  `, { url: 'https://space.bilibili.com/1/bangumi' });

  const { window } = dom;
  const { document } = window;
  const alerts = [];
  window.alert = (message) => alerts.push(message);

  const list = document.getElementById('list');
  const card = document.createElement('div');
  card.className = 'bili-bangumi-card';

  const titleNode = document.createElement('div');
  titleNode.className = 'bili-bangumi-card__title';
  titleNode.textContent = '迷宫饭';

  const moreButton = document.createElement('button');
  moreButton.type = 'button';
  moreButton.className = 'more-btn';
  moreButton.innerHTML = '<span class="sic-BDC-more_vertical_fill"></span>';
  moreButton.addEventListener('click', () => {
    const existing = document.querySelector('.menu-popover__panel-item');
    if (existing) {
      existing.remove();
      return;
    }
    const cancelItem = document.createElement('button');
    cancelItem.type = 'button';
    cancelItem.className = 'menu-popover__panel-item';
    cancelItem.textContent = '取消追番';
    cancelItem.addEventListener('click', () => {
      card.remove();
      cancelItem.remove();
    });
    document.body.appendChild(cancelItem);
  });

  card.appendChild(titleNode);
  card.appendChild(moreButton);
  list.appendChild(card);

  return { dom, alerts, document };
}

test('mountControlButton injects a single cancel-all button', () => {
  const dom = new JSDOM(`
    <body>
      <div class="radio-filter">
        <div class="radio-filter__item">想看</div>
        <div class="radio-filter__item">看过</div>
      </div>
    </body>
  `);

  const app = createCleanerApp(dom.window);
  app.mountControlButton();
  app.mountControlButton();

  const buttons = dom.window.document.querySelectorAll('#bangumi-control-btns button');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent.trim(), '一键取消所有');
});

test('mountControlButton does not mutate an existing button on repeated calls', async () => {
  const dom = new JSDOM(`
    <body>
      <div class="radio-filter">
        <div class="radio-filter__item">想看</div>
        <div class="radio-filter__item">看过</div>
      </div>
    </body>
  `, { url: 'https://space.bilibili.com/1/bangumi' });

  const app = createCleanerApp(dom.window);
  app.mountControlButton();

  const container = dom.window.document.getElementById('bangumi-control-btns');
  const records = [];
  const observer = new dom.window.MutationObserver((mutations) => {
    records.push(...mutations);
  });
  observer.observe(container, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  app.mountControlButton();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  observer.disconnect();

  assert.equal(records.length, 0);
});

test('findCancelAction ignores hidden menu items', () => {
  const dom = new JSDOM(`
    <body>
      <button class="menu-popover__panel-item" style="display:none">取消追番</button>
      <button class="menu-popover__panel-item">分享</button>
      <button class="menu-popover__panel-item">取消追剧</button>
    </body>
  `);

  const app = createCleanerApp(dom.window);
  const action = app.findCancelAction();

  assert.equal(action.textContent.trim(), '取消追剧');
});

test('findCancelAction matches generic menu items used by the live page', () => {
  const dom = new JSDOM(`
    <body>
      <div class="menu-popover__panel-item">标记为想看</div>
      <div class="menu-popover__panel-item">标记为看过</div>
      <div class="menu-popover__panel-item">取消追番</div>
    </body>
  `);

  const app = createCleanerApp(dom.window);
  const action = app.findCancelAction();

  assert.equal(action.textContent.trim(), '取消追番');
});

test('cancelAllFromCurrentPage cancels every item across pages and reports the summary', async () => {
  const { dom, alerts, document } = setupPaginatedDom();
  const app = createCleanerApp(dom.window);

  await app.cancelAllFromCurrentPage();

  assert.equal(document.querySelectorAll('.bili-bangumi-card').length, 0);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /成功: 3/);
  assert.match(alerts[0], /失败: 0/);
  assert.match(alerts[0], /处理页数: 2/);
});

test('cancelAllFromCurrentPage handles toggle-style menus without double-clicking them closed', async () => {
  const { dom, alerts, document } = setupToggleMenuDom();
  const app = createCleanerApp(dom.window);

  const stats = await app.cancelAllFromCurrentPage();

  assert.equal(document.querySelectorAll('.bili-bangumi-card').length, 0);
  assert.equal(stats.success, 1);
  assert.equal(stats.failed, 0);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /成功: 1/);
});

test('cancelAllFromCurrentPage opens menus when the click handler is attached to the icon node', async () => {
  const dom = new JSDOM(`
    <body>
      <div class="radio-filter">
        <div class="radio-filter__item">想看</div>
        <div class="radio-filter__item">看过</div>
      </div>
      <div class="bili-bangumi-card">
        <div class="bili-bangumi-card__title">图标点按测试</div>
        <div class="menu-popover bili-bangumi-card__more">
          <i class="vui_icon sic-BDC-more_vertical_fill icon"></i>
        </div>
      </div>
    </body>
  `, { url: 'https://space.bilibili.com/1/bangumi' });

  const { window } = dom;
  const { document } = window;
  const alerts = [];
  window.alert = (message) => alerts.push(message);

  const icon = document.querySelector('.sic-BDC-more_vertical_fill');
  icon.addEventListener('click', () => {
    const cancelItem = document.createElement('div');
    cancelItem.className = 'menu-popover__panel-item';
    cancelItem.textContent = '取消追番';
    cancelItem.addEventListener('click', () => {
      document.querySelector('.bili-bangumi-card').remove();
      cancelItem.remove();
    });
    document.body.appendChild(cancelItem);
  });

  const app = createCleanerApp(window);
  const stats = await app.cancelAllFromCurrentPage();

  assert.equal(document.querySelectorAll('.bili-bangumi-card').length, 0);
  assert.equal(stats.success, 1);
  assert.equal(stats.failed, 0);
  assert.equal(alerts.length, 1);
});
