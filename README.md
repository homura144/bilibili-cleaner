# BiliBili Cleaner

One-click userscript for Bilibili personal bangumi pages.

It adds a single `一键取消所有` button to `https://space.bilibili.com/*/bangumi` and cancels followed bangumi and drama items page by page from the current page to the last page.

## Files

- `BiliBili Cleaner.js`: the userscript
- `tests/bilibili-cleaner.test.js`: local regression tests

## Local verification

```powershell
node --check ".\BiliBili Cleaner.js"
npm test
```

## License

MIT
