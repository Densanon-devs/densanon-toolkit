/* Document Converter
   Shared module for all document converter landing pages.
   Call initDocumentConverter({ defaultMode, mountTo }) to mount. */

function initDocumentConverter(config) {
  'use strict';
  var defaultMode = config.defaultMode || 'pdf-text';
  var mount = document.querySelector(config.mountTo || '#converter-mount');
  if (!mount) return;

  // ── Modes ──
  var modes = [
    { id: 'pdf-text',   label: 'PDF \u2192 Text' },
    { id: 'pdf-docx',   label: 'PDF \u2192 DOCX' },
    { id: 'pdf-images', label: 'PDF \u2192 Images' },
    { id: 'images-pdf', label: 'Images \u2192 PDF' },
    { id: 'html-pdf',   label: 'HTML \u2192 PDF' },
    { id: 'md-pdf',     label: 'Markdown \u2192 PDF' },
    { id: 'docx-html',  label: 'DOCX \u2192 HTML' }
  ];

  // ── Build DOM ──
  var tabsHtml = '<div class="dc-tabs">';
  modes.forEach(function (m) {
    tabsHtml += '<button class="dc-tab' + (m.id === defaultMode ? ' active' : '') + '" data-mode="' + m.id + '">' + m.label + '</button>';
  });
  tabsHtml += '</div>';

  var panelsHtml =
    // PDF → Text
    '<div id="dc-pdf-text" class="dc-panel' + (defaultMode === 'pdf-text' ? ' active' : '') + '">' +
      '<div class="dc-drop" data-target="dc-pdfTextFile"><div class="dc-drop-label">Drop a PDF file here or click to browse</div><div class="dc-drop-hint">Extracts all text content from PDF pages</div><input type="file" id="dc-pdfTextFile" accept=".pdf,application/pdf" hidden></div>' +
      '<div id="dc-pdfTextInfo" class="dc-file-info"></div>' +
      '<div id="dc-pdfTextStatus" class="dc-status"></div>' +
      '<div id="dc-pdfTextOutput" class="dc-output"><pre id="dc-pdfTextResult"></pre></div>' +
      '<div class="dc-btn-row"><button id="dc-pdfTextCopy" class="dc-btn-secondary" style="display:none">Copy Text</button><button id="dc-pdfTextDl" class="dc-btn-secondary" style="display:none">Download .txt</button></div>' +
    '</div>' +
    // PDF → DOCX
    '<div id="dc-pdf-docx" class="dc-panel' + (defaultMode === 'pdf-docx' ? ' active' : '') + '">' +
      '<div class="dc-drop" data-target="dc-pdfDocxFile"><div class="dc-drop-label">Drop a PDF file here or click to browse</div><div class="dc-drop-hint">Extracts text with formatting and converts to editable .docx</div><input type="file" id="dc-pdfDocxFile" accept=".pdf,application/pdf" hidden></div>' +
      '<div id="dc-pdfDocxInfo" class="dc-file-info"></div>' +
      '<div id="dc-pdfDocxStatus" class="dc-status"></div>' +
      '<div class="dc-btn-row"><button id="dc-pdfDocxDl" class="dc-btn-primary" style="display:none">Download .docx</button></div>' +
    '</div>' +
    // PDF → Images
    '<div id="dc-pdf-images" class="dc-panel' + (defaultMode === 'pdf-images' ? ' active' : '') + '">' +
      '<div class="dc-drop" data-target="dc-pdfImgFile"><div class="dc-drop-label">Drop a PDF file here or click to browse</div><div class="dc-drop-hint">Renders each page as a high-quality image</div><input type="file" id="dc-pdfImgFile" accept=".pdf,application/pdf" hidden></div>' +
      '<div class="dc-option"><label>Output Format</label><select id="dc-pdfImgFormat"><option value="png">PNG (lossless)</option><option value="jpg">JPG (smaller)</option><option value="webp">WebP (modern)</option></select></div>' +
      '<div class="dc-option"><label>Scale (DPI)</label><select id="dc-pdfImgScale"><option value="1">1x (72 DPI)</option><option value="2" selected>2x (144 DPI)</option><option value="3">3x (216 DPI)</option></select></div>' +
      '<div id="dc-pdfImgInfo" class="dc-file-info"></div>' +
      '<div id="dc-pdfImgStatus" class="dc-status"></div>' +
      '<div id="dc-pdfImgPreviews" class="dc-previews"></div>' +
      '<div class="dc-btn-row"><button id="dc-pdfImgDlAll" class="dc-btn-primary" style="display:none">Download All (ZIP)</button></div>' +
    '</div>' +
    // Images → PDF
    '<div id="dc-images-pdf" class="dc-panel' + (defaultMode === 'images-pdf' ? ' active' : '') + '">' +
      '<div class="dc-drop" data-target="dc-imgPdfFile"><div class="dc-drop-label">Drop image files here or click to browse</div><div class="dc-drop-hint">Accepts PNG, JPG, WebP, BMP, GIF — combine into one PDF</div><input type="file" id="dc-imgPdfFile" accept="image/*" multiple hidden></div>' +
      '<div class="dc-option"><label>Page Size</label><select id="dc-imgPdfPageSize"><option value="a4">A4 (210 x 297 mm)</option><option value="letter">Letter (8.5 x 11 in)</option><option value="fit">Fit to Image</option></select></div>' +
      '<div class="dc-option"><label>Image Fit</label><select id="dc-imgPdfFit"><option value="contain">Contain (fit within page)</option><option value="cover">Cover (fill page, may crop)</option><option value="stretch">Stretch to page</option></select></div>' +
      '<div id="dc-imgPdfInfo" class="dc-file-info"></div>' +
      '<div id="dc-imgPdfStatus" class="dc-status"></div>' +
      '<div class="dc-btn-row"><button id="dc-imgPdfConvert" class="dc-btn-primary" style="display:none">Create PDF</button><button id="dc-imgPdfDl" class="dc-btn-secondary" style="display:none">Download PDF</button></div>' +
    '</div>' +
    // HTML → PDF
    '<div id="dc-html-pdf" class="dc-panel' + (defaultMode === 'html-pdf' ? ' active' : '') + '">' +
      '<div class="dc-option"><label>HTML Content</label><textarea id="dc-htmlPdfInput" placeholder="Paste your HTML here, or upload a file below..."></textarea></div>' +
      '<div class="dc-drop" data-target="dc-htmlPdfFile" style="padding:20px"><div class="dc-drop-label">Or drop an HTML file here</div><input type="file" id="dc-htmlPdfFile" accept=".html,.htm,text/html" hidden></div>' +
      '<div class="dc-option"><label>Page Size</label><select id="dc-htmlPdfPageSize"><option value="a4">A4</option><option value="letter">Letter</option></select></div>' +
      '<div id="dc-htmlPdfStatus" class="dc-status"></div>' +
      '<div class="dc-btn-row"><button id="dc-htmlPdfConvert" class="dc-btn-primary">Convert to PDF</button><button id="dc-htmlPdfDl" class="dc-btn-secondary" style="display:none">Download PDF</button></div>' +
    '</div>' +
    // Markdown → PDF
    '<div id="dc-md-pdf" class="dc-panel' + (defaultMode === 'md-pdf' ? ' active' : '') + '">' +
      '<div class="dc-option"><label>Markdown Content</label><textarea id="dc-mdPdfInput" placeholder="# My Document\n\nWrite or paste Markdown here..."></textarea></div>' +
      '<div class="dc-drop" data-target="dc-mdPdfFile" style="padding:20px"><div class="dc-drop-label">Or drop a .md file here</div><input type="file" id="dc-mdPdfFile" accept=".md,.markdown,text/markdown" hidden></div>' +
      '<div class="dc-option"><label>Page Size</label><select id="dc-mdPdfPageSize"><option value="a4">A4</option><option value="letter">Letter</option></select></div>' +
      '<div id="dc-mdPdfStatus" class="dc-status"></div>' +
      '<div class="dc-btn-row"><button id="dc-mdPdfConvert" class="dc-btn-primary">Convert to PDF</button><button id="dc-mdPdfDl" class="dc-btn-secondary" style="display:none">Download PDF</button></div>' +
    '</div>' +
    // DOCX → HTML
    '<div id="dc-docx-html" class="dc-panel' + (defaultMode === 'docx-html' ? ' active' : '') + '">' +
      '<div class="dc-drop" data-target="dc-docxFile"><div class="dc-drop-label">Drop a .docx file here or click to browse</div><div class="dc-drop-hint">Converts Word document content to clean HTML</div><input type="file" id="dc-docxFile" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden></div>' +
      '<div id="dc-docxInfo" class="dc-file-info"></div>' +
      '<div id="dc-docxStatus" class="dc-status"></div>' +
      '<div id="dc-docxOutput" class="dc-output"><pre id="dc-docxResult"></pre></div>' +
      '<div class="dc-btn-row"><button id="dc-docxCopy" class="dc-btn-secondary" style="display:none">Copy HTML</button><button id="dc-docxDlHtml" class="dc-btn-secondary" style="display:none">Download .html</button><button id="dc-docxPreview" class="dc-btn-secondary" style="display:none">Preview</button></div>' +
    '</div>';

  mount.innerHTML = tabsHtml + panelsHtml;

  // ── Tab Switching ──
  var tabs = mount.querySelectorAll('.dc-tab');
  var panels = mount.querySelectorAll('.dc-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('dc-' + tab.dataset.mode).classList.add('active');
    });
  });

  // ── CDN Loaders ──
  var pdfJsLoaded = false, jsPDFLoaded = false, mammothLoaded = false;

  function loadPdfJs() {
    if (pdfJsLoaded || (typeof pdfjsLib !== 'undefined')) { pdfJsLoaded = true; return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = function () {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfJsLoaded = true; resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadJsPDF() {
    if (jsPDFLoaded || (typeof window.jspdf !== 'undefined')) { jsPDFLoaded = true; return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      var loadH = new Promise(function (res, rej) {
        if (typeof html2canvas !== 'undefined') { res(); return; }
        var h = document.createElement('script');
        h.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        h.onload = res; h.onerror = rej;
        document.head.appendChild(h);
      });
      var loadJ = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      Promise.all([loadH, loadJ]).then(function () { jsPDFLoaded = true; resolve(); }).catch(reject);
    });
  }

  function loadMammoth() {
    if (mammothLoaded || (typeof mammoth !== 'undefined')) { mammothLoaded = true; return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
      s.onload = function () { mammothLoaded = true; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadJSZip() {
    if (typeof JSZip !== 'undefined') return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadDocx() {
    if (window.docx && window.docx.Document) return Promise.resolve();
    // docx v8 ships only ESM/CJS (no UMD). Use esm.sh's auto-bundle in
    // ?bundle mode, which produces a single browser-ready ESM module.
    return import('https://esm.sh/docx@8.5.0?bundle').then(function (m) {
      window.docx = m.default && m.default.Document ? m.default : m;
    });
  }

  // Build a DOCX Blob directly from a PDF, preserving paragraph flow,
  // per-fragment bold/italic, bullet lists, headings, and section dividers.
  // Returns a Promise<Blob>.
  async function pdfToDocxBlob(file, statusEl) {
    var d = window.docx;
    var HeadingLevel = d.HeadingLevel;
    var BorderStyle = d.BorderStyle || { SINGLE: 'single' };
    var LevelFormat = d.LevelFormat || { BULLET: 'bullet' };
    var AlignmentType = d.AlignmentType || { LEFT: 'left' };

    var buf = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    // ── Step 1: extract every page into sorted lines of fragments ──
    var pagesLines = [];
    for (var p = 1; p <= pdf.numPages; p++) {
      setStatus(statusEl, 'Processing page ' + p + ' of ' + pdf.numPages + '...', 'loading');
      var page = await pdf.getPage(p);
      var content = await page.getTextContent();
      var vp = page.getViewport({ scale: 1 });
      var pageHeight = vp.height;

      var items = content.items.map(function (item) {
        var tx = item.transform;
        var fn = (item.fontName || '').toLowerCase();
        return {
          str: item.str,
          x: tx[4],
          y: pageHeight - tx[5],
          width: item.width || 0,
          fontSize: Math.abs(tx[0]) || Math.abs(tx[3]) || 12,
          bold: fn.indexOf('bold') !== -1 || fn.indexOf('black') !== -1 || fn.indexOf('heavy') !== -1,
          italic: fn.indexOf('italic') !== -1 || fn.indexOf('oblique') !== -1
        };
      }).filter(function (it) { return it.str.length > 0; });

      if (!items.length) { pagesLines.push([]); continue; }
      items.sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });

      var lines = [], cur = [items[0]];
      for (var i = 1; i < items.length; i++) {
        if (Math.abs(items[i].y - cur[0].y) < 3) cur.push(items[i]);
        else { cur.sort(function (a, b) { return a.x - b.x; }); lines.push(cur); cur = [items[i]]; }
      }
      if (cur.length) { cur.sort(function (a, b) { return a.x - b.x; }); lines.push(cur); }
      pagesLines.push(lines);
    }

    // ── Step 2: body font size (most common across the whole doc) ──
    var sizeCounts = {};
    pagesLines.forEach(function (lines) {
      lines.forEach(function (line) {
        line.forEach(function (it) {
          var s = Math.round(it.fontSize);
          sizeCounts[s] = (sizeCounts[s] || 0) + 1;
        });
      });
    });
    var bodySize = parseInt(Object.keys(sizeCounts).sort(function (a, b) { return sizeCounts[b] - sizeCounts[a]; })[0]) || 12;
    var expectedLineGap = bodySize * 1.4;

    // ── Step 3: collapse each line's fragments into runs ──
    // Adjacent fragments with the same bold/italic merge; spacing is
    // inserted only when there's a real X gap and no existing whitespace.
    function lineToRecord(line) {
      var runs = [];
      var prevFrag = null;
      line.forEach(function (f) {
        var sep = '';
        if (prevFrag) {
          var gap = f.x - (prevFrag.x + prevFrag.width);
          var charW = prevFrag.width / Math.max(1, prevFrag.str.length) || (prevFrag.fontSize * 0.5);
          var endsWS = /\s$/.test(prevFrag.str);
          var startsWS = /^\s/.test(f.str);
          if (!endsWS && !startsWS && gap > charW * 0.3) sep = ' ';
        }
        var text = sep + f.str;
        var last = runs[runs.length - 1];
        if (last && last.bold === f.bold && last.italic === f.italic) {
          last.str += text;
        } else {
          runs.push({ str: text, bold: f.bold, italic: f.italic });
        }
        prevFrag = f;
      });

      var allBold = line.every(function (f) { return f.bold; });
      var maxSize = line.reduce(function (m, f) { return Math.max(m, f.fontSize); }, 0);
      var text = runs.map(function (r) { return r.str; }).join('');
      return {
        runs: runs,
        text: text,
        y: line[0].y,
        x: line[0].x,
        maxSize: maxSize,
        allBold: allBold
      };
    }

    function cloneRuns(runs) {
      return runs.map(function (r) { return { str: r.str, bold: r.bold, italic: r.italic }; });
    }

    function appendRunsTo(target, source) {
      if (!source.length) return;
      // Add a soft space between merged lines if neither side already has whitespace.
      if (target.length) {
        var last = target[target.length - 1];
        if (last.str && !/\s$/.test(last.str) && !/^\s/.test(source[0].str)) last.str += ' ';
      }
      source.forEach(function (r) {
        var last = target[target.length - 1];
        if (last && last.bold === r.bold && last.italic === r.italic) last.str += r.str;
        else target.push({ str: r.str, bold: r.bold, italic: r.italic });
      });
    }

    // ── Step 4: walk lines, group into blocks (paragraph / bullet / heading / divider / pageBreak) ──
    // U+2022 •  U+25CF ●  U+25E6 ◦  U+2023 ‣  hyphen-minus and en/em dashes are NOT bullets
    var BULLET_RE = /^\s*[•●◦‣]\s*/;
    var SUBBULLET_RE = /^\s*o\s+/;
    var HEADING_PREFIX_RE = /^(\d+\.\s|Option\s+[A-Z]\b|Acknowledgment|Purpose|Intent|Definitions|General Terms|Intellectual Property|Participation Structure)/i;

    var blocks = [];
    var firstLineSeen = false;

    pagesLines.forEach(function (lines, pageIdx) {
      var prevRec = null;
      lines.forEach(function (line) {
        var rec = lineToRecord(line);
        if (!rec.text.trim()) { prevRec = rec; return; }

        var gap = prevRec ? rec.y - prevRec.y : 0;
        var bigGap = prevRec && gap > expectedLineGap * 1.6;
        var hugeGap = prevRec && gap > expectedLineGap * 3.2;

        // Divider on a really large gap (mimics the PDF's horizontal rules).
        if (hugeGap) blocks.push({ kind: 'divider' });

        // Bullet glyph?
        if (BULLET_RE.test(rec.text)) {
          rec.text = rec.text.replace(BULLET_RE, '');
          if (rec.runs.length) {
            rec.runs[0].str = rec.runs[0].str.replace(BULLET_RE, '');
            while (rec.runs.length && !rec.runs[0].str) rec.runs.shift();
          }
          blocks.push({ kind: 'bullet', level: 0, runs: cloneRuns(rec.runs), x: rec.x });
          prevRec = rec; firstLineSeen = true;
          return;
        }

        // Sub-bullet (Word's "o " convention) — only if the previous block was a bullet.
        var lastBlock = blocks[blocks.length - 1];
        if (SUBBULLET_RE.test(rec.text) && lastBlock && lastBlock.kind === 'bullet') {
          rec.text = rec.text.replace(SUBBULLET_RE, '');
          if (rec.runs.length) {
            rec.runs[0].str = rec.runs[0].str.replace(SUBBULLET_RE, '');
            while (rec.runs.length && !rec.runs[0].str) rec.runs.shift();
          }
          blocks.push({ kind: 'bullet', level: 1, runs: cloneRuns(rec.runs), x: rec.x });
          prevRec = rec; firstLineSeen = true;
          return;
        }

        // Heading: standalone bold line, short-ish, with section-prefix or
        // a leading gap, or it's the very first line of the document (title).
        var standalone = bigGap || !firstLineSeen;
        var matchesPrefix = HEADING_PREFIX_RE.test(rec.text.trim());
        var shortish = rec.text.length < 110;
        var isHeading = rec.allBold && shortish && (matchesPrefix || standalone) && rec.text.trim().length > 1;

        if (isHeading) {
          var level = !firstLineSeen ? 1 : (matchesPrefix && /^\d+\./.test(rec.text.trim()) ? 2 : 3);
          blocks.push({ kind: 'heading', level: level, runs: cloneRuns(rec.runs), x: rec.x });
          prevRec = rec; firstLineSeen = true;
          return;
        }

        // Continuation vs. new paragraph.
        // A bullet keeps absorbing wrap-lines as long as they stay indented.
        // A line that returns to (or near) the left margin starts a new paragraph.
        var canContinue = lastBlock && !bigGap &&
          (lastBlock.kind === 'paragraph' || lastBlock.kind === 'bullet');

        if (canContinue && lastBlock.kind === 'bullet' && rec.x < (lastBlock.x || 0) - 12) {
          canContinue = false;
        }

        if (canContinue) {
          appendRunsTo(lastBlock.runs, rec.runs);
        } else {
          blocks.push({ kind: 'paragraph', runs: cloneRuns(rec.runs), x: rec.x });
        }
        prevRec = rec; firstLineSeen = true;
      });

      if (pageIdx < pagesLines.length - 1) blocks.push({ kind: 'pageBreak' });
    });

    // ── Step 5: emit DOCX ──
    function runsToTextRuns(runs) {
      var out = [];
      runs.forEach(function (r) {
        if (!r.str) return;
        out.push(new d.TextRun({
          text: r.str,
          bold: r.bold || undefined,
          italics: r.italic || undefined
        }));
      });
      if (!out.length) out.push(new d.TextRun(''));
      return out;
    }

    var paragraphs = [];
    blocks.forEach(function (b) {
      if (b.kind === 'pageBreak') {
        paragraphs.push(new d.Paragraph({ children: [new d.PageBreak()] }));
      } else if (b.kind === 'divider') {
        paragraphs.push(new d.Paragraph({
          border: { bottom: { color: '888888', size: 6, style: BorderStyle.SINGLE, space: 1 } },
          children: [new d.TextRun('')]
        }));
      } else if (b.kind === 'heading') {
        var hl = HeadingLevel.HEADING_2;
        if (b.level === 1) hl = HeadingLevel.HEADING_1;
        else if (b.level === 3) hl = HeadingLevel.HEADING_3;
        paragraphs.push(new d.Paragraph({ heading: hl, children: runsToTextRuns(b.runs) }));
      } else if (b.kind === 'bullet') {
        paragraphs.push(new d.Paragraph({
          numbering: { reference: 'pdf-bullets', level: b.level || 0 },
          children: runsToTextRuns(b.runs)
        }));
      } else {
        paragraphs.push(new d.Paragraph({ children: runsToTextRuns(b.runs) }));
      }
    });

    if (!paragraphs.length) paragraphs.push(new d.Paragraph({ children: [new d.TextRun('')] }));

    var numbering = {
      config: [{
        reference: 'pdf-bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }
        ]
      }]
    };

    var docxDoc = new d.Document({
      numbering: numbering,
      sections: [{ properties: {}, children: paragraphs }]
    });
    return await d.Packer.toBlob(docxDoc);
  }

  // ── Helpers ──
  function setStatus(el, msg, type) { el.textContent = msg; el.className = 'dc-status ' + type; }
  function clearStatus(el) { el.textContent = ''; el.className = 'dc-status'; }
  function fmtSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
  function isPdf(f) { return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'); }

  function setupDrop(dropEl, inputEl, onFiles) {
    dropEl.addEventListener('click', function () { inputEl.click(); });
    inputEl.addEventListener('change', function () { if (inputEl.files.length) onFiles(inputEl.files); });
    dropEl.addEventListener('dragover', function (e) { e.preventDefault(); dropEl.classList.add('dragover'); });
    dropEl.addEventListener('dragleave', function () { dropEl.classList.remove('dragover'); });
    dropEl.addEventListener('drop', function (e) { e.preventDefault(); dropEl.classList.remove('dragover'); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); });
  }

  function triggerDl(blob, filename) {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 2000);
  }

  // ══════════════════════════════════════
  //  PDF → Text
  // ══════════════════════════════════════
  (function () {
    var drop = mount.querySelector('#dc-pdf-text .dc-drop');
    var input = document.getElementById('dc-pdfTextFile');
    var info = document.getElementById('dc-pdfTextInfo');
    var status = document.getElementById('dc-pdfTextStatus');
    var output = document.getElementById('dc-pdfTextOutput');
    var result = document.getElementById('dc-pdfTextResult');
    var copyBtn = document.getElementById('dc-pdfTextCopy');
    var dlBtn = document.getElementById('dc-pdfTextDl');
    var extracted = '';

    setupDrop(drop, input, async function (files) {
      var file = files[0];
      if (!file || !isPdf(file)) { setStatus(status, 'Please select a valid PDF file.', 'error'); return; }
      info.textContent = file.name + ' (' + fmtSize(file.size) + ')'; info.classList.add('visible');
      setStatus(status, 'Loading PDF library...', 'loading');
      try {
        await loadPdfJs();
        setStatus(status, 'Extracting text...', 'loading');
        var buf = await file.arrayBuffer();
        var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        var text = '';
        for (var i = 1; i <= pdf.numPages; i++) {
          var page = await pdf.getPage(i);
          var content = await page.getTextContent();
          var pt = content.items.map(function (it) { return it.str; }).join(' ');
          if (pt.trim()) text += '--- Page ' + i + ' ---\n' + pt.trim() + '\n\n';
        }
        if (!text.trim()) { setStatus(status, 'No extractable text found. This PDF may contain only images (scanned document).', 'error'); return; }
        extracted = text.trim();
        result.textContent = extracted;
        output.classList.add('visible');
        copyBtn.style.display = ''; dlBtn.style.display = '';
        setStatus(status, 'Extracted text from ' + pdf.numPages + ' page(s).', 'success');
      } catch (err) { setStatus(status, 'Error: ' + err.message, 'error'); }
    });

    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(extracted);
      copyBtn.textContent = 'Copied!'; setTimeout(function () { copyBtn.textContent = 'Copy Text'; }, 1500);
    });
    dlBtn.addEventListener('click', function () { triggerDl(new Blob([extracted], { type: 'text/plain;charset=utf-8' }), 'extracted-text.txt'); });
  })();

  // ══════════════════════════════════════
  //  PDF → DOCX
  // ══════════════════════════════════════
  (function () {
    var drop = mount.querySelector('#dc-pdf-docx .dc-drop');
    var input = document.getElementById('dc-pdfDocxFile');
    var info = document.getElementById('dc-pdfDocxInfo');
    var status = document.getElementById('dc-pdfDocxStatus');
    var dlBtn = document.getElementById('dc-pdfDocxDl');
    var docxBlob = null;

    setupDrop(drop, input, async function (files) {
      var file = files[0];
      if (!file || !isPdf(file)) { setStatus(status, 'Please select a valid PDF file.', 'error'); return; }
      info.textContent = file.name + ' (' + fmtSize(file.size) + ')'; info.classList.add('visible');
      dlBtn.style.display = 'none'; docxBlob = null;
      setStatus(status, 'Loading libraries...', 'loading');
      try {
        await Promise.all([loadPdfJs(), loadDocx()]);
        setStatus(status, 'Analyzing PDF structure...', 'loading');
        var blob = await pdfToDocxBlob(file, status);
        if (!blob) {
          setStatus(status, 'No extractable text found. This PDF may be image-only (scanned).', 'error');
          return;
        }
        docxBlob = blob;
        dlBtn.style.display = '';
        setStatus(status, 'DOCX generated.', 'success');
      } catch (err) {
        var msg = (err && (err.message || err.toString())) || 'unknown error';
        console.error('PDF → DOCX failed:', err);
        setStatus(status, 'Error: ' + msg, 'error');
      }
    });

    dlBtn.addEventListener('click', function () {
      if (docxBlob) triggerDl(docxBlob, 'converted-document.docx');
    });
  })();

  // ══════════════════════════════════════
  //  PDF → Images
  // ══════════════════════════════════════
  (function () {
    var drop = mount.querySelector('#dc-pdf-images .dc-drop');
    var input = document.getElementById('dc-pdfImgFile');
    var info = document.getElementById('dc-pdfImgInfo');
    var status = document.getElementById('dc-pdfImgStatus');
    var previews = document.getElementById('dc-pdfImgPreviews');
    var dlAllBtn = document.getElementById('dc-pdfImgDlAll');
    var fmtSel = document.getElementById('dc-pdfImgFormat');
    var scaleSel = document.getElementById('dc-pdfImgScale');
    var blobs = [];

    setupDrop(drop, input, async function (files) {
      var file = files[0];
      if (!file || !isPdf(file)) { setStatus(status, 'Please select a valid PDF file.', 'error'); return; }
      info.textContent = file.name + ' (' + fmtSize(file.size) + ')'; info.classList.add('visible');
      previews.querySelectorAll('img').forEach(function (img) { if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src); });
      previews.innerHTML = ''; blobs = []; dlAllBtn.style.display = 'none';
      setStatus(status, 'Loading PDF library...', 'loading');
      try {
        await loadPdfJs();
        setStatus(status, 'Rendering pages...', 'loading');
        var buf = await file.arrayBuffer();
        var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        var scale = parseInt(scaleSel.value) || 2;
        var fmt = fmtSel.value;
        var mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
        var mime = mimeMap[fmt] || 'image/png';
        for (var i = 1; i <= pdf.numPages; i++) {
          setStatus(status, 'Rendering page ' + i + ' of ' + pdf.numPages + '...', 'loading');
          var page = await pdf.getPage(i);
          var vp = page.getViewport({ scale: scale });
          var canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, mime, 0.92); });
          blobs.push({ blob: blob, ext: fmt === 'jpg' ? '.jpg' : '.' + fmt });
          var div = document.createElement('div');
          var img = document.createElement('img'); img.src = URL.createObjectURL(blob); img.alt = 'Page ' + i;
          var lbl = document.createElement('div'); lbl.className = 'dc-page-label'; lbl.textContent = 'Page ' + i;
          div.appendChild(img); div.appendChild(lbl); previews.appendChild(div);
          canvas.width = 0;
        }
        dlAllBtn.style.display = '';
        setStatus(status, 'Rendered ' + pdf.numPages + ' page(s) as ' + fmt.toUpperCase() + '.', 'success');
      } catch (err) { setStatus(status, 'Error: ' + err.message, 'error'); }
    });

    dlAllBtn.addEventListener('click', async function () {
      if (blobs.length === 1) { triggerDl(blobs[0].blob, 'page-1' + blobs[0].ext); return; }
      setStatus(status, 'Creating ZIP...', 'loading');
      await loadJSZip();
      var zip = new JSZip();
      for (var i = 0; i < blobs.length; i++) zip.file('page-' + (i + 1) + blobs[i].ext, blobs[i].blob);
      triggerDl(await zip.generateAsync({ type: 'blob' }), 'pdf-pages.zip');
      setStatus(status, 'ZIP downloaded.', 'success');
    });
  })();

  // ══════════════════════════════════════
  //  Images → PDF
  // ══════════════════════════════════════
  (function () {
    var drop = mount.querySelector('#dc-images-pdf .dc-drop');
    var input = document.getElementById('dc-imgPdfFile');
    var info = document.getElementById('dc-imgPdfInfo');
    var status = document.getElementById('dc-imgPdfStatus');
    var convertBtn = document.getElementById('dc-imgPdfConvert');
    var dlBtn = document.getElementById('dc-imgPdfDl');
    var pageSizeSel = document.getElementById('dc-imgPdfPageSize');
    var fitSel = document.getElementById('dc-imgPdfFit');
    var imageFiles = [], pdfBlob = null;

    setupDrop(drop, input, function (files) {
      imageFiles = Array.from(files).filter(function (f) { return f.type.startsWith('image/'); });
      if (!imageFiles.length) { setStatus(status, 'No valid image files found.', 'error'); return; }
      info.textContent = imageFiles.length + ' image(s) selected: ' + imageFiles.map(function (f) { return f.name; }).join(', ');
      info.classList.add('visible');
      convertBtn.style.display = ''; dlBtn.style.display = 'none'; pdfBlob = null;
      clearStatus(status);
    });

    convertBtn.addEventListener('click', async function () {
      if (!imageFiles.length) return;
      setStatus(status, 'Loading jsPDF...', 'loading');
      try {
        await loadJsPDF();
        var jsPDF = window.jspdf.jsPDF;
        var pageSize = pageSizeSel.value, fit = fitSel.value;
        var dims = { a4: { w: 595.28, h: 841.89 }, letter: { w: 612, h: 792 } };
        var doc = null;
        for (var i = 0; i < imageFiles.length; i++) {
          setStatus(status, 'Processing image ' + (i + 1) + ' of ' + imageFiles.length + '...', 'loading');
          var img = await createImageBitmap(imageFiles[i]);
          var iw = img.width, ih = img.height;
          var pw, ph;
          if (pageSize === 'fit') { pw = iw * 0.75; ph = ih * 0.75; } else { pw = dims[pageSize].w; ph = dims[pageSize].h; }
          if (i === 0) doc = new jsPDF({ unit: 'pt', format: [pw, ph] }); else doc.addPage([pw, ph]);
          var dw, dh, dx, dy;
          if (pageSize === 'fit' || fit === 'stretch') { dx = 0; dy = 0; dw = pw; dh = ph; }
          else if (fit === 'cover') { var cs = Math.max(pw / iw, ph / ih); dw = iw * cs; dh = ih * cs; dx = (pw - dw) / 2; dy = (ph - dh) / 2; }
          else { var fs = Math.min(pw / iw, ph / ih) * 0.9; dw = iw * fs; dh = ih * fs; dx = (pw - dw) / 2; dy = (ph - dh) / 2; }
          var canvas = document.createElement('canvas'); canvas.width = iw; canvas.height = ih;
          canvas.getContext('2d').drawImage(img, 0, 0);
          doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', dx, dy, dw, dh);
          canvas.width = 0;
        }
        pdfBlob = doc.output('blob');
        dlBtn.style.display = '';
        setStatus(status, 'PDF created with ' + imageFiles.length + ' page(s).', 'success');
      } catch (err) { setStatus(status, 'Error: ' + err.message, 'error'); }
    });

    dlBtn.addEventListener('click', function () { if (pdfBlob) triggerDl(pdfBlob, 'images-combined.pdf'); });
  })();

  // ══════════════════════════════════════
  //  HTML → PDF
  // ══════════════════════════════════════
  (function () {
    var textarea = document.getElementById('dc-htmlPdfInput');
    var drop = mount.querySelector('#dc-html-pdf .dc-drop');
    var input = document.getElementById('dc-htmlPdfFile');
    var pageSizeSel = document.getElementById('dc-htmlPdfPageSize');
    var status = document.getElementById('dc-htmlPdfStatus');
    var convertBtn = document.getElementById('dc-htmlPdfConvert');
    var dlBtn = document.getElementById('dc-htmlPdfDl');
    var pdfBlob = null;

    setupDrop(drop, input, async function (files) { if (files[0]) textarea.value = await files[0].text(); });

    convertBtn.addEventListener('click', async function () {
      var html = textarea.value.trim();
      if (!html) { setStatus(status, 'Please enter or upload HTML content.', 'error'); return; }
      setStatus(status, 'Loading jsPDF...', 'loading');
      try {
        await loadJsPDF();
        var doc = new window.jspdf.jsPDF({ unit: 'pt', format: pageSizeSel.value === 'letter' ? 'letter' : 'a4' });
        setStatus(status, 'Rendering HTML to PDF...', 'loading');
        await doc.html(html, { callback: function () {}, x: 40, y: 40, width: doc.internal.pageSize.getWidth() - 80, windowWidth: 800 });
        pdfBlob = doc.output('blob');
        dlBtn.style.display = '';
        setStatus(status, 'PDF generated successfully.', 'success');
      } catch (err) { setStatus(status, 'Error: ' + err.message, 'error'); }
    });

    dlBtn.addEventListener('click', function () { if (pdfBlob) triggerDl(pdfBlob, 'document.pdf'); });
  })();

  // ══════════════════════════════════════
  //  Markdown → PDF
  // ══════════════════════════════════════
  (function () {
    var textarea = document.getElementById('dc-mdPdfInput');
    var drop = mount.querySelector('#dc-md-pdf .dc-drop');
    var input = document.getElementById('dc-mdPdfFile');
    var pageSizeSel = document.getElementById('dc-mdPdfPageSize');
    var status = document.getElementById('dc-mdPdfStatus');
    var convertBtn = document.getElementById('dc-mdPdfConvert');
    var dlBtn = document.getElementById('dc-mdPdfDl');
    var pdfBlob = null;

    setupDrop(drop, input, async function (files) { if (files[0]) textarea.value = await files[0].text(); });

    function mdToHtml(md) {
      var codeBlocks = [];
      md = md.replace(/```([\s\S]*?)```/g, function (m, code) { codeBlocks.push(code); return '%%CB_' + (codeBlocks.length - 1) + '%%'; });
      var html = md
        .replace(/`([^`]+)`/g, '<code style="background:#edf2f7;padding:2px 6px;border-radius:3px;font-size:13px;">$1</code>')
        .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>').replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>').replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>').replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/^---+$/gm, '<hr>')
        .replace(/^>\s+(.+)$/gm, '<blockquote style="border-left:3px solid #e53e3e;padding-left:12px;color:#555;">$1</blockquote>');
      html = html.replace(/(^\s*\d+\.\s+.+$(\n|$))+/gm, function (m) {
        return '<ol>' + m.trim().split('\n').map(function (l) { return '<li>' + l.replace(/^\s*\d+\.\s+/, '') + '</li>'; }).join('') + '</ol>';
      });
      html = html.replace(/(^\s*[-*+]\s+.+$(\n|$))+/gm, function (m) {
        return '<ul>' + m.trim().split('\n').map(function (l) { return '<li>' + l.replace(/^\s*[-*+]\s+/, '') + '</li>'; }).join('') + '</ul>';
      });
      html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
      for (var i = 0; i < codeBlocks.length; i++) {
        html = html.replace('%%CB_' + i + '%%', '<pre style="background:#edf2f7;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;border:1px solid #e2e8f0;"><code>' + codeBlocks[i].replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>');
      }
      return '<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a202c;max-width:700px;"><p>' + html + '</p></div>';
    }

    convertBtn.addEventListener('click', async function () {
      var md = textarea.value.trim();
      if (!md) { setStatus(status, 'Please enter or upload Markdown content.', 'error'); return; }
      setStatus(status, 'Loading jsPDF...', 'loading');
      try {
        await loadJsPDF();
        var doc = new window.jspdf.jsPDF({ unit: 'pt', format: pageSizeSel.value === 'letter' ? 'letter' : 'a4' });
        setStatus(status, 'Rendering Markdown to PDF...', 'loading');
        await doc.html(mdToHtml(md), { callback: function () {}, x: 40, y: 40, width: doc.internal.pageSize.getWidth() - 80, windowWidth: 800 });
        pdfBlob = doc.output('blob');
        dlBtn.style.display = '';
        setStatus(status, 'PDF generated from Markdown.', 'success');
      } catch (err) { setStatus(status, 'Error: ' + err.message, 'error'); }
    });

    dlBtn.addEventListener('click', function () { if (pdfBlob) triggerDl(pdfBlob, 'document.pdf'); });
  })();

  // ══════════════════════════════════════
  //  DOCX → HTML
  // ══════════════════════════════════════
  (function () {
    var drop = mount.querySelector('#dc-docx-html .dc-drop');
    var input = document.getElementById('dc-docxFile');
    var info = document.getElementById('dc-docxInfo');
    var status = document.getElementById('dc-docxStatus');
    var output = document.getElementById('dc-docxOutput');
    var result = document.getElementById('dc-docxResult');
    var copyBtn = document.getElementById('dc-docxCopy');
    var dlBtn = document.getElementById('dc-docxDlHtml');
    var previewBtn = document.getElementById('dc-docxPreview');
    var htmlContent = '';

    setupDrop(drop, input, async function (files) {
      var file = files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.docx')) { setStatus(status, 'Please select a .docx file (not .doc or other formats).', 'error'); return; }
      info.textContent = file.name + ' (' + fmtSize(file.size) + ')'; info.classList.add('visible');
      setStatus(status, 'Loading Mammoth.js...', 'loading');
      try {
        await loadMammoth();
        setStatus(status, 'Converting DOCX to HTML...', 'loading');
        var res = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        htmlContent = res.value;
        if (!htmlContent.trim()) { setStatus(status, 'No content extracted from DOCX file.', 'error'); return; }
        result.textContent = htmlContent;
        output.classList.add('visible');
        copyBtn.style.display = ''; dlBtn.style.display = ''; previewBtn.style.display = '';
        setStatus(status, 'Converted successfully.', 'success');
      } catch (err) { setStatus(status, 'Error: ' + err.message, 'error'); }
    });

    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(htmlContent);
      copyBtn.textContent = 'Copied!'; setTimeout(function () { copyBtn.textContent = 'Copy HTML'; }, 1500);
    });
    dlBtn.addEventListener('click', function () {
      triggerDl(new Blob(['<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>Converted Document</title>\n</head>\n<body>\n' + htmlContent + '\n</body>\n</html>'], { type: 'text/html;charset=utf-8' }), 'converted-document.html');
    });
    previewBtn.addEventListener('click', function () {
      var w = window.open('', '_blank');
      if (!w) { setStatus(status, 'Popup blocked \u2014 please allow popups for preview.', 'error'); return; }
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;}</style></head><body>' + htmlContent + '</body></html>');
      w.document.close();
    });
  })();
}
