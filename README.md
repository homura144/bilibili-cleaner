# BiliBili Cleaner

One-click userscript for Bilibili personal bangumi pages.

It adds a single `一键取消所有` button to `https://space.bilibili.com/*/bangumi` and cancels followed bangumi and drama items page by page from the current page to the last page.

Greasy Fork is intended to sync from the fixed GitHub dist file at `dist/bilibili-cleaner.user.js`, so every release overwrites the same raw URL.

## Files

- `BiliBili Cleaner.js`: source userscript
- `dist/bilibili-cleaner.user.js`: fixed distributable file for Greasy Fork source sync
- `scripts/build-userscript.js`: build helper that refreshes the dist file
- `tests/bilibili-cleaner.test.js`: local regression tests
- `.github/workflows/publish-userscript.yml`: CI workflow that rebuilds and commits the dist file

## Local verification

```powershell
node --check ".\BiliBili Cleaner.js"
npm test
npm run build
```

## License

MIT
