/* Page Consistency
   Injects shared header, footer, search, and nav across all pages.
   Include this script in any page and call initPage() with config. */

const TOOLKIT_TOOLS = [
  { name: 'Sprite Slicer', desc: 'Upload a sprite sheet and slice it into individual frames by rows and columns.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'sprite-slicer', keywords: 'sprite sheet slicer split frames animation pixel art' },
  { name: 'Dice Combination Sheet', desc: 'Calculate dice roll probabilities with full distribution tables and charts.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'dice-combination-sheet', keywords: 'dice probability calculator 2d6 3d6 1d20 roll odds tabletop rpg' },
  { name: 'Card Deck Generator', desc: 'Design and export printable cards for board games or TCG prototypes.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'card-deck-generator', keywords: 'card generator maker tcg board game printable prototype deck' },
  { name: 'Fantasy Name Generator', desc: 'Generate character names for D&D, games, and writing across 9 fantasy races.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'fantasy-name-generator', keywords: 'fantasy name generator dnd npc character elf dwarf orc dragon rpg' },
  { name: 'Role Dealer', desc: 'Secret role assigner for Mafia, Werewolf, and custom party games — multiplayer via room codes.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'role-dealer', keywords: 'role dealer assigner mafia werewolf party game secret roles multiplayer' },
  { name: 'Color Palette Extractor', desc: 'Upload an image and extract its dominant colors into a palette.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'color-palette-extractor', keywords: 'extract color palette image dominant colors hex rgb hsl' },
  { name: 'Pixel Art Palette Generator', desc: 'Generate retro color palettes from a seed color, classic presets, or harmony rules.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'pixel-art-palette', keywords: 'pixel art palette generator retro 8 bit game boy nes pico-8 cga c64' },
  { name: 'File Converter', desc: 'Convert between image and data formats — PNG, JPG, WebP, CSV, JSON, and more.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'file-converter', keywords: 'file converter image png jpg webp csv json yaml markdown base64' },
  { name: 'JSON Formatter', desc: 'Format, minify, and validate JSON with syntax highlighting and error reporting.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'json-formatter', keywords: 'json formatter beautifier prettify minify validate syntax' },
  { name: 'UUID Generator', desc: 'Generate random UUID v4 values in bulk with copy and download options.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'uuid-generator', keywords: 'uuid generator guid random v4 bulk unique identifier' },
  { name: 'CSV to JSON Converter', desc: 'Convert CSV data to JSON with delimiter detection and multiple output formats.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'csv-to-json', keywords: 'csv to json converter data transform parse delimiter tsv' },
  { name: 'Document to Spreadsheet Converter', desc: 'Extract tables from PDF, Word, and HTML into Excel (.xlsx) or CSV, keeping rows and columns close to the original layout.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'doc-to-spreadsheet', keywords: 'document to spreadsheet pdf to excel pdf to csv word docx to xlsx html table extract table extraction convert xls' },
  { name: 'Fraction Visualizer', desc: 'Show fractions as circle, bar, or grid diagrams with comparisons and equivalents.', category: 'math-tools', categoryLabel: 'Math', slug: 'fraction-visualizer', keywords: 'fraction visualizer diagram circle bar grid math equivalent decimal percentage' },
  { name: 'PNG to JPG Converter', desc: 'Convert PNG images to JPG for smaller file sizes.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'png-to-jpg', keywords: 'png to jpg convert image photo' },
  { name: 'PNG to WebP Converter', desc: 'Convert PNG to modern WebP format for better compression.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'png-to-webp', keywords: 'png to webp convert image modern' },
  { name: 'PNG to BMP Converter', desc: 'Convert PNG images to uncompressed BMP format.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'png-to-bmp', keywords: 'png to bmp convert image uncompressed' },
  { name: 'JPG to PNG Converter', desc: 'Convert JPG to lossless PNG with transparency support.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'jpg-to-png', keywords: 'jpg jpeg to png convert lossless transparency' },
  { name: 'JPG to WebP Converter', desc: 'Convert JPG to WebP for better compression at same quality.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'jpg-to-webp', keywords: 'jpg jpeg to webp convert compression' },
  { name: 'JPG to BMP Converter', desc: 'Convert JPG images to uncompressed BMP format.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'jpg-to-bmp', keywords: 'jpg jpeg to bmp convert uncompressed' },
  { name: 'WebP to PNG Converter', desc: 'Convert WebP to universally supported PNG format.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'webp-to-png', keywords: 'webp to png convert compatible universal' },
  { name: 'WebP to JPG Converter', desc: 'Convert WebP images to widely compatible JPG.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'webp-to-jpg', keywords: 'webp to jpg jpeg convert compatible' },
  { name: 'WebP to BMP Converter', desc: 'Convert WebP to uncompressed BMP for raw pixel data.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'webp-to-bmp', keywords: 'webp to bmp convert uncompressed raw' },
  { name: 'BMP to PNG Converter', desc: 'Convert large BMP files to compressed PNG.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'bmp-to-png', keywords: 'bmp to png convert compress lossless' },
  { name: 'BMP to JPG Converter', desc: 'Convert BMP to JPG for dramatically smaller files.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'bmp-to-jpg', keywords: 'bmp to jpg jpeg convert compress' },
  { name: 'BMP to WebP Converter', desc: 'Convert BMP to modern WebP for best compression.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'bmp-to-webp', keywords: 'bmp to webp convert compress modern' },
  { name: 'GIF to PNG Converter', desc: 'Convert GIF to PNG for better color depth and quality.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'gif-to-png', keywords: 'gif to png convert color depth' },
  { name: 'GIF to JPG Converter', desc: 'Convert GIF images to JPG for smaller files.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'gif-to-jpg', keywords: 'gif to jpg jpeg convert photo' },
  { name: 'GIF to WebP Converter', desc: 'Convert GIF to WebP for modern compression.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'gif-to-webp', keywords: 'gif to webp convert modern compression' },
  { name: 'Background Remover', desc: 'Automatically remove backgrounds from images using AI.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'background-remover', keywords: 'background remover remove transparent cutout ai automatic segmentation' },
  { name: 'SVG to PNG Converter', desc: 'Convert SVG vector graphics to PNG raster images.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'svg-to-png', keywords: 'svg to png convert vector raster' },
  { name: 'SVG to JPG Converter', desc: 'Convert SVG vector graphics to compressed JPG images.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'svg-to-jpg', keywords: 'svg to jpg jpeg convert vector raster' },
  { name: 'SVG to WebP Converter', desc: 'Convert SVG vector graphics to modern WebP format.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'svg-to-webp', keywords: 'svg to webp convert vector raster modern' },
  { name: 'SVG to BMP Converter', desc: 'Convert SVG vector graphics to uncompressed BMP.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'svg-to-bmp', keywords: 'svg to bmp convert vector raster bitmap' },
  { name: 'PNG to SVG Converter', desc: 'Trace PNG images into scalable SVG vector graphics.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'png-to-svg', keywords: 'png to svg convert trace vector raster' },
  { name: 'JPG to SVG Converter', desc: 'Trace JPG images into scalable SVG vector graphics.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'jpg-to-svg', keywords: 'jpg jpeg to svg convert trace vector' },
  { name: 'WebP to SVG Converter', desc: 'Trace WebP images into scalable SVG vector graphics.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'webp-to-svg', keywords: 'webp to svg convert trace vector' },
  { name: 'BMP to SVG Converter', desc: 'Trace BMP images into scalable SVG vector graphics.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'bmp-to-svg', keywords: 'bmp to svg convert trace vector bitmap' },
  { name: 'GIF to SVG Converter', desc: 'Trace GIF images into scalable SVG vector graphics.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'gif-to-svg', keywords: 'gif to svg convert trace vector' },
  { name: 'JSON to CSV Converter', desc: 'Convert JSON arrays to CSV spreadsheet format.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'json-to-csv', keywords: 'json to csv convert data export spreadsheet' },
  { name: 'JSON Minifier', desc: 'Minify or prettify JSON data with one click.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'json-minifier', keywords: 'json minify minifier compress prettify format' },
  { name: 'TSV to CSV Converter', desc: 'Convert tab-separated values to comma-separated CSV.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'tsv-to-csv', keywords: 'tsv to csv convert tab separated comma' },
  { name: 'CSV to TSV Converter', desc: 'Convert CSV files to tab-separated TSV format.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'csv-to-tsv', keywords: 'csv to tsv convert comma tab separated' },
  { name: 'Markdown to HTML Converter', desc: 'Convert Markdown text to clean HTML markup.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'markdown-to-html', keywords: 'markdown to html convert md markup' },
  { name: 'YAML to JSON Converter', desc: 'Convert YAML configuration to JSON format.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'yaml-to-json', keywords: 'yaml to json convert config configuration' },
  { name: 'Base64 Encoder', desc: 'Encode text to Base64 for embedding and APIs.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'base64-encoder', keywords: 'base64 encode encoder text string' },
  { name: 'Base64 Decoder', desc: 'Decode Base64 strings back to readable text.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'base64-decoder', keywords: 'base64 decode decoder string text' },
  { name: 'CSV Cleaner & Formatter', desc: 'Clean CSV files — remove duplicates, trim whitespace, fix encoding, and change delimiters.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'csv-cleaner', keywords: 'csv cleaner formatter clean trim whitespace duplicates encoding delimiter tsv pipe semicolon' },
  { name: 'Elf Name Generator', desc: 'Generate elegant elven names for D&D and fantasy worlds.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'elf-name-generator', keywords: 'elf elven name generator dnd tolkien sindar fantasy' },
  { name: 'Dwarf Name Generator', desc: 'Generate sturdy dwarven names with Norse-inspired phonetics.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'dwarf-name-generator', keywords: 'dwarf dwarven name generator dnd norse clan' },
  { name: 'Human Name Generator', desc: 'Generate medieval human names for RPGs and fiction.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'human-name-generator', keywords: 'human name generator medieval fantasy rpg character' },
  { name: 'Orc Name Generator', desc: 'Generate fierce orcish names for warriors and warlords.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'orc-name-generator', keywords: 'orc orcish name generator warrior tribal dnd' },
  { name: 'Dragon Name Generator', desc: 'Generate ancient draconic names of power and myth.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'dragon-name-generator', keywords: 'dragon draconic name generator ancient wyrm fantasy' },
  { name: 'Demon Name Generator', desc: 'Generate dark infernal names for demons and fiends.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'demon-name-generator', keywords: 'demon infernal fiend name generator dark evil' },
  { name: 'Celestial Name Generator', desc: 'Generate radiant angelic names for divine beings.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'celestial-name-generator', keywords: 'celestial angel angelic name generator divine holy' },
  { name: 'Goblin Name Generator', desc: 'Generate chaotic goblin names with sharp, snappy sounds.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'goblin-name-generator', keywords: 'goblin name generator chaotic sneaky fantasy rpg' },
  { name: 'Gnome Name Generator', desc: 'Generate whimsical gnome names with inventive, playful sounds.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'gnome-name-generator', keywords: 'gnome name generator tinkerer whimsical inventive fantasy rpg dnd' },
  { name: 'Image Format Converter', desc: 'Convert between PNG, JPG, WebP, BMP, GIF, and SVG image formats.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'image-converters', keywords: 'image converter format png jpg webp bmp gif svg convert vector' },
  { name: 'Data Format Converter', desc: 'Convert between JSON, CSV, TSV, YAML, Markdown, and Base64.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'data-converters', keywords: 'data converter format json csv tsv yaml markdown base64 convert' },
  { name: 'Fantasy Name Generators', desc: 'Generate fantasy names by race for D&D, RPGs, and creative writing.', category: 'game-dev-tools', categoryLabel: 'Game Dev', slug: 'name-generators', keywords: 'fantasy name generator race elf dwarf orc dragon dnd rpg' },
  { name: 'Percent Calculator', desc: 'Calculate percentages: X% of Y, what percent X is of Y, and percentage change.', category: 'math-tools', categoryLabel: 'Math', slug: 'percent-calculator', keywords: 'percent calculator percentage change increase decrease' },
  { name: 'Decimal to Fraction Converter', desc: 'Convert decimal numbers to fractions with simplification and repeating decimal support.', category: 'math-tools', categoryLabel: 'Math', slug: 'decimal-to-fraction', keywords: 'decimal to fraction convert repeating simplify' },
  { name: 'Fraction to Decimal Converter', desc: 'Convert fractions to decimals with repeating pattern detection and mixed numbers.', category: 'math-tools', categoryLabel: 'Math', slug: 'fraction-to-decimal', keywords: 'fraction to decimal convert repeating terminating mixed number' },
  { name: 'Ratio Simplifier', desc: 'Simplify ratios, scale to target values, and find equivalent ratios.', category: 'math-tools', categoryLabel: 'Math', slug: 'ratio-simplifier', keywords: 'ratio simplifier simplify scale equivalent proportion' },
  { name: 'Mean / Median / Mode Calculator', desc: 'Calculate mean, median, mode, range, and other statistics from a list of numbers.', category: 'math-tools', categoryLabel: 'Math', slug: 'mean-median-mode', keywords: 'mean median mode calculator average statistics range sum' },
  { name: 'Mean Calculator', desc: 'Calculate the arithmetic mean (average) of any set of numbers.', category: 'math-tools', categoryLabel: 'Math', slug: 'mean-calculator', keywords: 'mean average calculator arithmetic sum divide' },
  { name: 'Median Calculator', desc: 'Find the median (middle value) of any dataset.', category: 'math-tools', categoryLabel: 'Math', slug: 'median-calculator', keywords: 'median middle value calculator sorted statistics' },
  { name: 'Mode Calculator', desc: 'Find the mode (most frequent value) in any list of numbers.', category: 'math-tools', categoryLabel: 'Math', slug: 'mode-calculator', keywords: 'mode frequent value calculator unimodal bimodal statistics' },
  { name: 'Audio Stripper', desc: 'Extract audio from any video file and download as WAV or OGG.', category: 'media-tools', categoryLabel: 'Media', slug: 'audio-stripper', keywords: 'audio stripper extract rip video mp4 webm wav ogg sound track' },
  { name: 'GIF Maker', desc: 'Create animated GIFs from video clips or image sequences. Set FPS, quality, trim, and loop.', category: 'media-tools', categoryLabel: 'Media', slug: 'gif-maker', keywords: 'gif maker create animated gif video images convert trim fps loop quality dithering' },
  { name: 'Video Compressor', desc: 'Reduce video file size by adjusting resolution, quality, and bitrate. 100% browser-based.', category: 'media-tools', categoryLabel: 'Media', slug: 'video-compressor', keywords: 'video compressor compress reduce file size shrink resolution bitrate mp4 webm quality' },
  { name: 'QR Code Maker', desc: 'Generate QR codes for URLs, text, emails, and phone numbers with custom colors and sizes.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'qr-code-maker', keywords: 'qr code maker generator url link text email phone custom color size download png svg' },
  { name: 'Pipeline Builder', desc: 'Chain tools together visually — connect image processors, data converters, and more into automated workflows.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'pipeline-builder', keywords: 'pipeline builder workflow chain node graph visual automation batch image converter data' },
  { name: 'Image Crop', desc: 'Crop images to custom dimensions or auto-trim whitespace borders.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'image-crop', keywords: 'image crop trim auto whitespace border cut dimensions' },
  { name: 'Color Adjust', desc: 'Adjust image brightness, contrast, saturation, grayscale, and invert.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'color-adjust', keywords: 'color adjust brightness contrast saturation grayscale invert image filter' },
  { name: 'Image Overlay', desc: 'Composite two images — add watermarks, logos, or overlays with position and opacity control.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'image-overlay', keywords: 'image overlay watermark composite logo stamp opacity position layer' },
  { name: 'Image Compress', desc: 'Reduce image file size by adjusting quality and output format.', category: 'image-tools', categoryLabel: 'Image Tools', slug: 'image-compress', keywords: 'image compress reduce file size quality jpeg webp optimize' },
  { name: 'MTG Hypergeometric Calculator', desc: 'Calculate the probability of drawing specific cards by any turn for any deck size.', category: 'mtg-tools', categoryLabel: 'MTG', slug: 'hypergeometric-calculator', keywords: 'mtg magic gathering hypergeometric probability calculator draw card turn commander modern' },
  { name: 'MTG Mana Curve Analyzer', desc: 'Paste a decklist and get instant mana curve, color distribution, and deck health analysis.', category: 'mtg-tools', categoryLabel: 'MTG', slug: 'mana-curve-analyzer', keywords: 'mtg magic gathering mana curve analyzer deck analysis color distribution lands' },
  { name: 'MTG Deck Staples Checker', desc: 'Check your Commander deck for commonly-played staples by color identity.', category: 'mtg-tools', categoryLabel: 'MTG', slug: 'deck-staples-checker', keywords: 'mtg magic gathering commander staples checker edh missing cards sol ring' },
  { name: 'Document Converter', desc: 'Convert between PDF, DOCX, HTML, Markdown, and images — extract text from PDFs, combine images into PDFs, convert Word docs to HTML.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'document-converter', keywords: 'document converter pdf to text images docx word html markdown convert extract combine' },
  { name: 'PDF to Text Converter', desc: 'Extract all readable text from PDF files — copy or download as plain text.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'pdf-to-text', keywords: 'pdf to text extract copy download plain text content pages' },
  { name: 'PDF to DOCX Converter', desc: 'Convert PDF to editable Word document — extracts text with headings, bold, and italic formatting.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'pdf-to-docx', keywords: 'pdf to docx word document convert editable extract formatting' },
  { name: 'PDF to Images Converter', desc: 'Convert PDF pages to PNG, JPG, or WebP images at configurable DPI.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'pdf-to-images', keywords: 'pdf to images png jpg webp render pages convert dpi' },
  { name: 'Images to PDF Converter', desc: 'Combine multiple images into a single PDF document with page size options.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'images-to-pdf', keywords: 'images to pdf combine merge photos pictures png jpg document' },
  { name: 'HTML to PDF Converter', desc: 'Convert HTML markup into a styled, downloadable PDF document.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'html-to-pdf', keywords: 'html to pdf convert markup web page document download' },
  { name: 'Markdown to PDF Converter', desc: 'Transform Markdown files into professionally formatted PDF documents.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'markdown-to-pdf', keywords: 'markdown to pdf convert md readme documentation formatted' },
  { name: 'DOCX to HTML Converter', desc: 'Convert Word .docx files to clean, semantic HTML markup.', category: 'developer-tools', categoryLabel: 'Developer Tools', slug: 'docx-to-html', keywords: 'docx to html word document convert extract content semantic' },
  { name: 'Caesar Cipher', desc: 'Encode or decode messages with a Caesar shift cipher. Includes a ROT13 preset.', category: 'secret-codes', categoryLabel: 'Secret Codes', slug: 'caesar-cipher', keywords: 'caesar cipher shift rot13 encode decode encrypt decrypt secret message classical' },
  { name: 'Keyword Cipher (Vigenère)', desc: 'Encode or decode messages with a secret keyword using the Vigenère cipher.', category: 'secret-codes', categoryLabel: 'Secret Codes', slug: 'keyword-cipher', keywords: 'vigenere keyword cipher polyalphabetic encode decode encrypt decrypt secret classical' }
];

function initPage(config = {}) {
  const depth = config.depth || 0;
  const root = depth === 0 ? '' : '../'.repeat(depth);
  const activeCategory = config.activeCategory || '';
  const pageTitle = config.title || 'Densanon Toolkit';
  const breadcrumbs = config.breadcrumbs || [];

  document.title = pageTitle + ' - Densanon Toolkit';

  injectHeader(root, activeCategory);
  injectSearch(root);
  if (breadcrumbs.length > 0) {
    injectBreadcrumbs(root, breadcrumbs);
  }
  if (depth >= 3 && activeCategory) {
    injectToolPageExtras(root, activeCategory, pageTitle);
  }
  injectFooter();
}

function injectHeader(root, activeCategory) {
  const categories = [
    { id: 'mtg-tools', label: 'MTG' },
    { id: 'game-dev-tools', label: 'Game Dev' },
    { id: 'image-tools', label: 'Image Tools' },
    { id: 'developer-tools', label: 'Developer Tools' },
    { id: 'math-tools', label: 'Math' },
    { id: 'media-tools', label: 'Media' },
    { id: 'secret-codes', label: 'Secret Codes' }
  ];

  const navLinks = categories.map(cat => {
    const activeClass = cat.id === activeCategory ? ' class="active"' : '';
    return `<a href="${root}categories/${cat.id}/index.html"${activeClass}>${cat.label}</a>`;
  }).join('\n        ');

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? '\u2318' : 'Ctrl';
  const modLabel = isMac ? 'Cmd+K' : 'Ctrl+K';

  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container">
      <a href="${root}index.html" class="site-logo">Tool<span>Kit</span></a>
      <nav class="site-nav">
        ${navLinks}
        <button class="search-toggle" aria-label="Search tools (${modLabel})" title="Search tools (${modLabel})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <kbd class="search-shortcut">${modKey} K</kbd>
        </button>
      </nav>
    </div>`;

  document.body.prepend(header);
}

function injectSearch(root) {
  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-modal">
      <div class="search-input-row">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="search-input" placeholder="Search tools..." autocomplete="off" spellcheck="false">
        <kbd class="search-kbd">Esc</kbd>
      </div>
      <div class="search-results"></div>
    </div>`;

  document.body.appendChild(overlay);

  const toggleBtn = document.querySelector('.search-toggle');
  const input = overlay.querySelector('.search-input');
  const resultsEl = overlay.querySelector('.search-results');
  let selectedIdx = -1;

  function open() {
    overlay.classList.add('open');
    input.value = '';
    input.focus();
    renderResults('');
    selectedIdx = -1;
  }

  function close() {
    overlay.classList.remove('open');
    input.value = '';
    resultsEl.innerHTML = '';
  }

  toggleBtn.addEventListener('click', open);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Keyboard shortcut: Ctrl+K / Cmd+K or /
  document.addEventListener('keydown', e => {
    if (((e.ctrlKey || e.metaKey) && e.key === 'k') || (e.key === '/' && !isInputFocused())) {
      e.preventDefault();
      open();
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      close();
    }
  });

  function isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  input.addEventListener('input', () => {
    selectedIdx = -1;
    renderResults(input.value);
  });

  input.addEventListener('keydown', e => {
    const items = resultsEl.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
      updateSelection(items);
    } else if (e.key === 'Enter' && selectedIdx >= 0 && items[selectedIdx]) {
      e.preventDefault();
      items[selectedIdx].querySelector('a').click();
    }
  });

  function updateSelection(items) {
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIdx);
    });
    if (items[selectedIdx]) {
      items[selectedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function renderResults(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
      // Show all tools grouped by category
      resultsEl.innerHTML = renderGrouped(TOOLKIT_TOOLS, root);
      return;
    }

    const scored = TOOLKIT_TOOLS.map(tool => {
      const haystack = (tool.name + ' ' + tool.desc + ' ' + tool.keywords + ' ' + tool.categoryLabel).toLowerCase();
      let score = 0;
      const terms = q.split(/\s+/);
      for (const term of terms) {
        if (tool.name.toLowerCase().includes(term)) score += 10;
        if (tool.keywords.toLowerCase().includes(term)) score += 5;
        if (tool.desc.toLowerCase().includes(term)) score += 3;
        if (tool.categoryLabel.toLowerCase().includes(term)) score += 2;
        if (!haystack.includes(term)) score = -100;
      }
      return { tool, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">No tools found.</div>';
      return;
    }

    resultsEl.innerHTML = scored.map((s, i) => renderResultItem(s.tool, root, i)).join('');
  }

  function renderGrouped(tools, root) {
    const groups = {};
    tools.forEach(t => {
      if (!groups[t.categoryLabel]) groups[t.categoryLabel] = [];
      groups[t.categoryLabel].push(t);
    });
    let html = '';
    let idx = 0;
    for (const [label, items] of Object.entries(groups)) {
      html += `<div class="search-group-label">${label}</div>`;
      html += items.map(t => renderResultItem(t, root, idx++)).join('');
    }
    return html;
  }

  function renderResultItem(tool, root, index) {
    const href = root + 'categories/' + tool.category + '/' + tool.slug + '/index.html';
    return `<div class="search-result-item" data-index="${index}">
      <a href="${href}">
        <span class="search-result-name">${tool.name}</span>
        <span class="search-result-cat">${tool.categoryLabel}</span>
        <span class="search-result-desc">${tool.desc}</span>
      </a>
    </div>`;
  }
}

function injectBreadcrumbs(root, breadcrumbs) {
  const breadcrumbEl = document.querySelector('.breadcrumb');
  if (!breadcrumbEl) return;

  const items = [{ label: 'Home', href: root + 'index.html' }, ...breadcrumbs];
  breadcrumbEl.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast) {
      return `<span>${item.label}</span>`;
    }
    return `<a href="${item.href}">${item.label}</a><span class="sep">/</span>`;
  }).join('\n    ');
}

function injectToolPageExtras(root, activeCategory, currentTitle) {
  const mainEl = document.querySelector('main.container');
  if (!mainEl) return;

  // Trust statement
  const trustEl = document.createElement('section');
  trustEl.className = 'trust-statement';
  trustEl.innerHTML = `
    <p>&#x1f512; <strong>Your privacy is protected.</strong> This tool runs entirely in your browser &mdash; no data is uploaded, stored, or sent to any server. No signup required.</p>`;
  mainEl.appendChild(trustEl);

  // Popular tools
  const popular = TOOLKIT_TOOLS.filter(t => t.category !== activeCategory).slice(0, 5);
  const popularHtml = popular.map(t =>
    `<a href="${root}categories/${t.category}/${t.slug}/index.html">${t.name}</a>`
  ).join('');
  const popularEl = document.createElement('section');
  popularEl.innerHTML = `<h2>Popular Tools</h2><div class="popular-tools-links">${popularHtml}</div>`;
  mainEl.appendChild(popularEl);

  // Related tools from same category (excluding current)
  const sameCat = TOOLKIT_TOOLS.filter(t => t.category === activeCategory && t.name !== currentTitle).slice(0, 5);
  if (sameCat.length > 0) {
    const catLabel = sameCat[0].categoryLabel;
    const catHtml = sameCat.map(t =>
      `<a href="../${t.slug}/index.html">${t.name}</a>`
    ).join('');
    const catEl = document.createElement('section');
    catEl.innerHTML = `
      <h2>More ${catLabel}</h2>
      <div class="popular-tools-links">${catHtml}</div>
      <p style="margin-top:12px;"><a href="../index.html">&rarr; Browse all ${catLabel}</a></p>`;
    mainEl.appendChild(catEl);
  }

  // Last updated
  const updatedEl = document.createElement('div');
  updatedEl.className = 'last-updated';
  updatedEl.textContent = 'Last updated: March 2026';
  mainEl.appendChild(updatedEl);
}

function injectFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="container">
      <div class="footer-support">
        <p class="footer-support-text">Help keep the tools free</p>
        <a href="https://buy.stripe.com/7sYbJ37Q0d5IghXbH79sk00" class="btn-support" target="_blank" rel="noopener">Support the Team</a>
      </div>
      <p>Densanon Toolkit &mdash; Free online utilities. All processing happens in your browser.</p>
      <p class="footer-made-by">Made by <a href="https://densanon.com" target="_blank" rel="noopener">Densanon</a></p>
    </div>`;

  document.body.append(footer);
}
