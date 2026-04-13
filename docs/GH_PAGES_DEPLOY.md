# GitHub Pages Deploy (Temporary)

## Before deploying — make 2 temporary changes:

### 1. `vite.config.ts` — change base path
```diff
- base: './',
+ base: '/jam-desktop/',
```

### 2. `src/ui/main.tsx` — add basename to Router
```diff
- const Router = window.electron ? HashRouter : BrowserRouter;
+ const isGitHubPages = window.location.hostname.endsWith('.github.io');
+ const Router = window.electron ? HashRouter : BrowserRouter;
+ const routerBasename = isGitHubPages ? '/jam-desktop' : undefined;
```

And further down:
```diff
- <Router>
+ <Router basename={routerBasename}>
```

## Deploy commands

```bash
npx vite build
cp dist-react/index.html dist-react/404.html
npx gh-pages -d dist-react
```

## After deploying — revert both changes

Undo the 2 changes above so Electron builds aren't affected.

## URL

https://miamimetro.github.io/jam-desktop/

## Notes

- The `404.html` copy is needed so GitHub Pages serves the SPA for all routes
- The `gh-pages` branch is an orphan branch — it won't pollute `main`
- Convex backend must be running for the app to actually work
