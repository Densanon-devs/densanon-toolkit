# Densanon Toolkit

Static browser-based toolkit hosted on GitHub Pages at `toolkit.densanon.com`. Repo: `densanon-devs/densanon-toolkit`.

## Architecture

- **Pure vanilla JS** — no frameworks, no build step, no npm
- **GitHub Pages** — static hosting, push to `master` deploys automatically
- **Dark theme** — CSS custom properties in `css/style.css` (--color-bg: #0f1117, --color-surface: #1a1d27, --color-primary: #e53e3e)
- **Shared modules** in `js/`:
  - `page-consistency.js` — header, footer, search, nav, TOOLKIT_TOOLS array (every tool must be registered here)
  - `converter.js` — image format conversion (used by 28 image converter tools)
  - `data-converter.js` — text format conversion (CSV, JSON, YAML, Markdown, Base64)
  - `svg-tracer.js` — raster-to-SVG tracing
  - `pipeline-engine.js` — graph model, topological sort, async runner
  - `pipeline-nodes.js` — headless node definitions for Pipeline Builder
  - `pipeline-editor.js` — visual canvas editor for Pipeline Builder

## Tool Structure

Every tool lives at `categories/{category}/{tool-slug}/index.html` (depth 3). Tools use `../../../js/` and `../../../css/` paths. Each tool calls `initPage()` from page-consistency.js.

Categories: `developer-tools`, `game-dev-tools`, `image-tools`, `math-tools`, `media-tools`

## Pipeline Builder — Flagship Feature

The Pipeline Builder (`categories/developer-tools/pipeline-builder/`) lets users chain tools into visual workflows. **Every new tool must also ship as a pipeline node.**

When building a new tool:
1. Create the standalone page at `categories/{category}/{tool-slug}/index.html`
2. Add a node definition in `js/pipeline-nodes.js` with headless `execute()` function
3. Register the tool in `TOOLKIT_TOOLS` array in `page-consistency.js`

Node interface:
```js
NodeRegistry.register({
  id: 'tool-id',
  name: 'Tool Name',
  category: 'Image|Data|I/O',
  icon: 'emoji',
  inputs: [{ name: 'portName', type: 'Image|Text|ImageArray|Any', label: 'Label' }],
  outputs: [{ name: 'portName', type: 'Image|Text|ImageArray', label: 'Label' }],
  config: [{ name: 'param', type: 'select|range|number|text|file|textarea', ... }],
  execute: async function (inputs, config) { return { portName: result }; }
});
```

Port types: `Image` (Blob), `Text` (string), `ImageArray` (Blob[]), `Any` (accepts all)

## Key Patterns

- Logic for pipeline nodes is reimplemented as standalone pure functions in `pipeline-nodes.js` — do NOT import from the DOM-coupled shared modules (converter.js etc.)
- Image processing uses `createImageBitmap()` + canvas + `toBlob()` pattern
- Mac/Windows detection for keyboard shortcuts (Cmd vs Ctrl)
- JSZip loaded dynamically from CDN only when ZIP export is needed
- Background Remover uses `@imgly/background-removal` CDN import (~40MB model)

## Expansion Priorities

Building toward these hero workflows:
1. **Product photo:** Upload → Crop → Remove BG → Resize → Watermark → Convert → Export
2. **Game art:** Upload → Slice sprites → Remove BG per frame → Resize → Export ZIP
3. **Data cleanup:** Upload CSV → Clean → Filter → Transform → JSON → Export

Current gaps to fill (in priority order):
- Image Crop, Color Adjust, Image Overlay/Watermark, Image Compress
- Text Replace, CSV Filter, CSV Merge
- Wire existing standalone tools as nodes (JSON minify, YAML, Markdown, Base64)

## GitHub Pages

`.nojekyll` at the repo root turns Jekyll **off**. Keep it there.

GitHub Pages runs Jekyll by default, and Jekyll silently deletes every file and directory
whose name starts with `_` from the published site. There is no error — the deploy goes
green and the files just 404. This already cost densanon.com two Table of War assets that
were broken in production for weeks before anyone noticed. This site is plain static HTML
and uses no Jekyll features, so turning it off costs nothing and also drops a build step
from every deploy.

Deleting `.nojekyll` re-arms that trap. It matters most when dropping in exported or
bundled assets — exporters happily emit `_`-prefixed filenames.
