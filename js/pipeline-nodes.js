/* Pipeline Nodes
   Headless node type definitions for the Pipeline Builder.
   Each node registers with NodeRegistry and provides an async execute(). */

(function () {
  'use strict';

  // ── Helpers ──

  async function blobToImage(blob) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob);
    }
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  function drawImageToCanvas(img, w, h) {
    var canvas = document.createElement('canvas');
    canvas.width = w || img.width;
    canvas.height = h || img.height;
    var ctx = canvas.getContext('2d');
    return { canvas: canvas, ctx: ctx };
  }

  function canvasToBlob(canvas, format, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, format || 'image/png', quality);
    });
  }

  // ── CSV Parsing (standalone from data-converter.js) ──

  function parseCsvLine(line) {
    var fields = [], current = '', inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = false;
        } else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { fields.push(current); current = ''; }
        else current += ch;
      }
    }
    fields.push(current);
    return fields;
  }

  function escapeCsvField(field) {
    if (field.indexOf(',') !== -1 || field.indexOf('"') !== -1 || field.indexOf('\n') !== -1) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  // ── SVG Tracer (standalone from svg-tracer.js) ──

  function medianCut(pixels, numColors) {
    if (pixels.length === 0) return [[0, 0, 0]];
    var buckets = [pixels.slice()];
    while (buckets.length < numColors) {
      var maxRange = -1, maxIdx = 0;
      for (var i = 0; i < buckets.length; i++) {
        var range = bucketRange(buckets[i]);
        if (range.maxRange > maxRange) { maxRange = range.maxRange; maxIdx = i; }
      }
      if (buckets[maxIdx].length < 2) break;
      var bucket = buckets[maxIdx];
      var br = bucketRange(bucket);
      bucket.sort(function (a, b) { return a[br.channel] - b[br.channel]; });
      var mid = Math.floor(bucket.length / 2);
      buckets.splice(maxIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
    }
    return buckets.map(function (b) {
      if (b.length === 0) return [0, 0, 0];
      var r = 0, g = 0, bl = 0;
      for (var j = 0; j < b.length; j++) { r += b[j][0]; g += b[j][1]; bl += b[j][2]; }
      return [Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length)];
    });
  }

  function bucketRange(bucket) {
    var minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (var i = 0; i < bucket.length; i++) {
      var p = bucket[i];
      if (p[0] < minR) minR = p[0]; if (p[0] > maxR) maxR = p[0];
      if (p[1] < minG) minG = p[1]; if (p[1] > maxG) maxG = p[1];
      if (p[2] < minB) minB = p[2]; if (p[2] > maxB) maxB = p[2];
    }
    var rR = maxR - minR, gR = maxG - minG, bR = maxB - minB;
    var mr = Math.max(rR, gR, bR);
    return { maxRange: mr, channel: mr === rR ? 0 : mr === gR ? 1 : 2 };
  }

  function nearestColor(pixel, palette) {
    var minDist = Infinity, idx = 0;
    for (var i = 0; i < palette.length; i++) {
      var dr = pixel[0] - palette[i][0], dg = pixel[1] - palette[i][1], db = pixel[2] - palette[i][2];
      var dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) { minDist = dist; idx = i; }
    }
    return idx;
  }

  function extractMergedRects(indexed, w, h, colorIdx) {
    var rects = [], active = [];
    for (var y = 0; y < h; y++) {
      var runs = [], x = 0;
      while (x < w) {
        if (indexed[y * w + x] === colorIdx) {
          var x0 = x;
          while (x < w && indexed[y * w + x] === colorIdx) x++;
          runs.push({ x: x0, w: x - x0 });
        } else x++;
      }
      var newActive = [], matched = new Set();
      for (var ri = 0; ri < runs.length; ri++) {
        var run = runs[ri], found = false;
        for (var a = 0; a < active.length; a++) {
          if (!matched.has(a) && active[a].x === run.x && active[a].w === run.w && active[a].y1 === y) {
            active[a].y1 = y + 1; newActive.push(active[a]); matched.add(a); found = true; break;
          }
        }
        if (!found) newActive.push({ x: run.x, w: run.w, y0: y, y1: y + 1 });
      }
      for (var ai = 0; ai < active.length; ai++) {
        if (!matched.has(ai)) rects.push({ x: active[ai].x, y: active[ai].y0, w: active[ai].w, h: active[ai].y1 - active[ai].y0 });
      }
      active = newActive;
    }
    for (var fi = 0; fi < active.length; fi++) {
      rects.push({ x: active[fi].x, y: active[fi].y0, w: active[fi].w, h: active[fi].y1 - active[fi].y0 });
    }
    return rects;
  }

  function traceImageToSvg(imageData, numColors, origW, origH) {
    var w = imageData.width, h = imageData.height, data = imageData.data;
    var pixelCount = w * h;
    var pixels = new Array(pixelCount);
    for (var i = 0; i < pixelCount; i++) {
      var o = i * 4;
      pixels[i] = [data[o], data[o + 1], data[o + 2]];
    }
    var palette = medianCut(pixels, numColors);
    var indexed = new Uint8Array(pixelCount);
    for (var j = 0; j < pixelCount; j++) indexed[j] = nearestColor(pixels[j], palette);

    var scaleX = origW / w, scaleY = origH / h;
    var paths = '';
    for (var c = 0; c < palette.length; c++) {
      var rects = extractMergedRects(indexed, w, h, c);
      if (rects.length === 0) continue;
      var hex = '#' + palette[c].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
      var d = '';
      for (var r = 0; r < rects.length; r++) {
        var rc = rects[r];
        d += 'M' + (rc.x * scaleX).toFixed(1) + ' ' + (rc.y * scaleY).toFixed(1) +
             'h' + (rc.w * scaleX).toFixed(1) + 'v' + (rc.h * scaleY).toFixed(1) +
             'h-' + (rc.w * scaleX).toFixed(1) + 'Z';
      }
      paths += '<path fill="' + hex + '" d="' + d + '"/>\n';
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      origW + ' ' + origH + '" width="' + origW + '" height="' + origH + '">\n' + paths + '</svg>';
  }

  // ══════════════════════════════════════════
  //  NODE DEFINITIONS
  // ══════════════════════════════════════════

  // ── File Upload (source) ──
  NodeRegistry.register({
    id: 'file-upload',
    name: 'File Upload',
    category: 'I/O',
    icon: '\uD83D\uDCC1',
    inputs: [],
    outputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    config: [
      { name: '_file', type: 'file', accept: 'image/*', label: 'Choose File' }
    ],
    execute: async function (inputs, config) {
      if (!config._fileBlob) throw new Error('No file selected');
      return { image: config._fileBlob };
    }
  });

  // ── Text Input (source) ──
  NodeRegistry.register({
    id: 'text-input',
    name: 'Text Input',
    category: 'I/O',
    icon: '\uD83D\uDCDD',
    inputs: [],
    outputs: [{ name: 'text', type: 'Text', label: 'Text' }],
    config: [
      { name: '_text', type: 'textarea', label: 'Content', default: '' }
    ],
    execute: async function (inputs, config) {
      if (!config._text || !config._text.trim()) throw new Error('No text entered');
      return { text: config._text };
    }
  });

  // ── Export / Download (sink) ──
  NodeRegistry.register({
    id: 'export',
    name: 'Export',
    category: 'I/O',
    icon: '\uD83D\uDCBE',
    inputs: [{ name: 'data', type: 'Any', label: 'Input' }],
    outputs: [],
    config: [
      { name: 'filename', type: 'text', label: 'Filename', default: 'output' }
    ],
    execute: async function (inputs, config) {
      var data = inputs.data;
      if (!data) throw new Error('No input data');
      var baseName = config.filename || 'output';

      if (Array.isArray(data)) {
        // ImageArray — download as ZIP using dynamic JSZip
        await loadJSZip();
        var zip = new JSZip();
        for (var i = 0; i < data.length; i++) {
          var ext = blobExtension(data[i]);
          zip.file(baseName + '_' + (i + 1) + ext, data[i]);
        }
        var blob = await zip.generateAsync({ type: 'blob' });
        triggerDownload(blob, baseName + '.zip');
      } else if (data instanceof Blob) {
        var ext2 = blobExtension(data);
        triggerDownload(data, baseName + ext2);
      } else if (typeof data === 'string') {
        var textBlob = new Blob([data], { type: 'text/plain;charset=utf-8' });
        triggerDownload(textBlob, baseName + '.txt');
      }
      return {};
    }
  });

  function blobExtension(blob) {
    if (!blob || !blob.type) return '.bin';
    var map = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
                'image/bmp': '.bmp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };
    return map[blob.type] || '.bin';
  }

  function triggerDownload(blob, filename) {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  var jsZipLoaded = false;
  function loadJSZip() {
    if (jsZipLoaded || typeof JSZip !== 'undefined') { jsZipLoaded = true; return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = function () { jsZipLoaded = true; resolve(); };
      s.onerror = function () { reject(new Error('Failed to load JSZip library')); };
      document.head.appendChild(s);
    });
  }

  // ── Image Convert ──
  NodeRegistry.register({
    id: 'image-convert',
    name: 'Image Convert',
    category: 'Image',
    icon: '\uD83D\uDD04',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'image', type: 'Image', label: 'Converted' }],
    config: [
      { name: 'format', type: 'select', label: 'Format',
        options: [
          { value: 'image/png', label: 'PNG' },
          { value: 'image/jpeg', label: 'JPG' },
          { value: 'image/webp', label: 'WebP' },
          { value: 'image/bmp', label: 'BMP' }
        ], default: 'image/png' },
      { name: 'quality', type: 'range', label: 'Quality', min: 1, max: 100, default: 92 }
    ],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var cc = drawImageToCanvas(img, img.width, img.height);
      var format = config.format || 'image/png';
      // Fill white background for JPG/BMP
      if (format === 'image/jpeg' || format === 'image/bmp') {
        cc.ctx.fillStyle = '#ffffff';
        cc.ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);
        cc.ctx.drawImage(img, 0, 0);
      } else {
        cc.ctx.drawImage(img, 0, 0);
      }
      var quality = (config.quality || 92) / 100;
      var blob = await canvasToBlob(cc.canvas, format, quality);
      cc.canvas.width = 0; // free memory
      return { image: blob };
    }
  });

  // ── Image Resize ──
  NodeRegistry.register({
    id: 'image-resize',
    name: 'Image Resize',
    category: 'Image',
    icon: '\uD83D\uDCD0',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'image', type: 'Image', label: 'Resized' }],
    config: [
      { name: 'width', type: 'number', label: 'Width (px)', default: 512 },
      { name: 'height', type: 'number', label: 'Height (px)', default: 0 },
      { name: 'mode', type: 'select', label: 'Mode',
        options: [
          { value: 'fit', label: 'Fit (keep aspect)' },
          { value: 'stretch', label: 'Stretch' },
          { value: 'width', label: 'By width' },
          { value: 'height', label: 'By height' }
        ], default: 'fit' }
    ],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var ow = img.width, oh = img.height;
      var tw = parseInt(config.width) || 0;
      var th = parseInt(config.height) || 0;
      var mode = config.mode || 'fit';
      var nw, nh;

      if (mode === 'width' && tw > 0) {
        nw = tw; nh = Math.round(oh * (tw / ow));
      } else if (mode === 'height' && th > 0) {
        nh = th; nw = Math.round(ow * (th / oh));
      } else if (mode === 'stretch' && tw > 0 && th > 0) {
        nw = tw; nh = th;
      } else {
        // fit
        if (!tw) tw = ow;
        if (!th) th = oh;
        var scale = Math.min(tw / ow, th / oh, 1);
        nw = Math.round(ow * scale);
        nh = Math.round(oh * scale);
      }

      var cc = drawImageToCanvas(img, nw, nh);
      cc.ctx.drawImage(img, 0, 0, nw, nh);
      var blob = await canvasToBlob(cc.canvas, 'image/png');
      cc.canvas.width = 0;
      return { image: blob };
    }
  });

  // ── Background Remover ──
  NodeRegistry.register({
    id: 'bg-remove',
    name: 'Background Remover',
    category: 'Image',
    icon: '\u2702\uFE0F',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'image', type: 'Image', label: 'No BG' }],
    config: [],
    _note: 'Downloads ~40MB AI model on first use',
    execute: async function (inputs, config) {
      var mod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/index.mjs');
      var result = await mod.removeBackground(inputs.image, {
        publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.3.1/dist/'
      });
      return { image: result };
    }
  });

  // ── Sprite Slicer ──
  NodeRegistry.register({
    id: 'sprite-slice',
    name: 'Sprite Slicer',
    category: 'Image',
    icon: '\uD83E\uDDE9',
    inputs: [{ name: 'image', type: 'Image', label: 'Sprite Sheet' }],
    outputs: [{ name: 'images', type: 'ImageArray', label: 'Frames' }],
    config: [
      { name: 'cols', type: 'number', label: 'Columns', default: 4 },
      { name: 'rows', type: 'number', label: 'Rows', default: 4 }
    ],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var cols = parseInt(config.cols) || 4;
      var rows = parseInt(config.rows) || 4;
      var fw = Math.floor(img.width / cols);
      var fh = Math.floor(img.height / rows);
      var frames = [];

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var canvas = document.createElement('canvas');
          canvas.width = fw;
          canvas.height = fh;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, c * fw, r * fh, fw, fh, 0, 0, fw, fh);
          var blob = await canvasToBlob(canvas, 'image/png');
          frames.push(blob);
          canvas.width = 0;
        }
      }
      return { images: frames };
    }
  });

  // ── SVG Tracer ──
  NodeRegistry.register({
    id: 'svg-trace',
    name: 'SVG Tracer',
    category: 'Image',
    icon: '\u270F\uFE0F',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'text', type: 'Text', label: 'SVG' }],
    config: [
      { name: 'colors', type: 'number', label: 'Colors', default: 16 },
      { name: 'detail', type: 'select', label: 'Detail',
        options: [
          { value: '1', label: 'Low' },
          { value: '2', label: 'Medium' },
          { value: '3', label: 'High' }
        ], default: '2' }
    ],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var numColors = parseInt(config.colors) || 16;
      var detail = parseInt(config.detail) || 2;
      var maxDim = detail === 1 ? 256 : detail === 2 ? 512 : 800;
      var w = img.width, h = img.height;
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var sw = Math.round(w * scale), sh = Math.round(h * scale);

      var canvas = document.createElement('canvas');
      canvas.width = sw; canvas.height = sh;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, sw, sh);
      var imageData = ctx.getImageData(0, 0, sw, sh);
      canvas.width = 0;

      var svg = traceImageToSvg(imageData, numColors, img.width, img.height);
      return { text: svg };
    }
  });

  // ── CSV to JSON ──
  NodeRegistry.register({
    id: 'csv-to-json',
    name: 'CSV to JSON',
    category: 'Data',
    icon: '\uD83D\uDCCA',
    inputs: [{ name: 'text', type: 'Text', label: 'CSV' }],
    outputs: [{ name: 'text', type: 'Text', label: 'JSON' }],
    config: [],
    execute: async function (inputs) {
      var csv = inputs.text;
      var lines = csv.trim().split('\n');
      if (lines.length < 1) throw new Error('No data found');
      var headers = parseCsvLine(lines[0]);
      var result = [];
      for (var i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        var values = parseCsvLine(lines[i]);
        var obj = {};
        headers.forEach(function (h, idx) {
          var val = values[idx] !== undefined ? values[idx] : '';
          var num = Number(val);
          obj[h.trim()] = val !== '' && !isNaN(num) && val.trim() === String(num) ? num : val;
        });
        result.push(obj);
      }
      return { text: JSON.stringify(result, null, 2) };
    }
  });

  // ── JSON to CSV ──
  NodeRegistry.register({
    id: 'json-to-csv',
    name: 'JSON to CSV',
    category: 'Data',
    icon: '\uD83D\uDCCB',
    inputs: [{ name: 'text', type: 'Text', label: 'JSON' }],
    outputs: [{ name: 'text', type: 'Text', label: 'CSV' }],
    config: [],
    execute: async function (inputs) {
      var data = JSON.parse(inputs.text);
      if (!Array.isArray(data) || data.length === 0) throw new Error('Input must be a non-empty JSON array');
      var headers = Object.keys(data[0]);
      var lines = [headers.map(escapeCsvField).join(',')];
      data.forEach(function (row) {
        lines.push(headers.map(function (h) {
          return escapeCsvField(String(row[h] !== undefined ? row[h] : ''));
        }).join(','));
      });
      return { text: lines.join('\n') };
    }
  });

  // ══════════════════════════════════════════
  //  BATCH 1 EXPANSION — Additional Helpers
  // ══════════════════════════════════════════

  function parseDelimitedLine(line, delimiter) {
    var fields = [], current = '', inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = false;
        } else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === delimiter) { fields.push(current); current = ''; }
        else current += ch;
      }
    }
    fields.push(current);
    return fields;
  }

  function escHtmlStr(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function markdownToHtml(md) {
    var html = md;
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre><code>' + escHtmlStr(code.trimEnd()) + '</code></pre>';
    });
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^---+$/gm, '<hr>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/(^[-*] .+\n?)+/gm, function (match) {
      var items = match.trim().split('\n').map(function (line) {
        return '<li>' + line.replace(/^[-*] /, '') + '</li>';
      }).join('\n');
      return '<ul>\n' + items + '\n</ul>';
    });
    html = html.replace(/(^\d+\. .+\n?)+/gm, function (match) {
      var items = match.trim().split('\n').map(function (line) {
        return '<li>' + line.replace(/^\d+\. /, '') + '</li>';
      }).join('\n');
      return '<ol>\n' + items + '\n</ol>';
    });
    html = html.replace(/^(?!<[a-z/])((?!^\s*$).+)$/gm, '<p>$1</p>');
    html = html.replace(/\n{3,}/g, '\n\n');
    return html.trim();
  }

  function parseSimpleYaml(yaml) {
    var result = {}, lines = yaml.trim().split('\n');
    var currentKey = null, currentList = null;
    for (var li = 0; li < lines.length; li++) {
      var trimmed = lines[li].trim();
      if (!trimmed || trimmed.charAt(0) === '#') continue;
      if (trimmed.indexOf('- ') === 0) {
        if (currentKey && currentList) currentList.push(parseYamlValue(trimmed.slice(2).trim()));
        continue;
      }
      var colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      var key = trimmed.slice(0, colonIdx).trim();
      var rawVal = trimmed.slice(colonIdx + 1).trim();
      if (rawVal === '') { currentKey = key; currentList = []; result[key] = currentList; }
      else { currentKey = key; currentList = null; result[key] = parseYamlValue(rawVal); }
    }
    return result;
  }

  function parseYamlValue(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null' || val === '~') return null;
    if (/^-?\d+$/.test(val)) return parseInt(val);
    if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
    if ((val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
        (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")) return val.slice(1, -1);
    return val;
  }

  function detectDelimiter(text) {
    var candidates = [',', '\t', ';', '|'];
    var firstLine = text.split('\n')[0] || '';
    var best = ',', bestCount = 0;
    for (var ci = 0; ci < candidates.length; ci++) {
      var d = candidates[ci], count = 0, inQ = false;
      for (var i = 0; i < firstLine.length; i++) {
        if (firstLine[i] === '"') inQ = !inQ;
        else if (!inQ && firstLine[i] === d) count++;
      }
      if (count > bestCount) { bestCount = count; best = d; }
    }
    return best;
  }

  function parseCsvFull(text, delim) {
    var rows = [], i = 0, n = text.length;
    while (i < n) {
      var row = [];
      while (i < n) {
        var cell = '';
        if (text[i] === '"') {
          i++;
          while (i < n) {
            if (text[i] === '"') {
              if (i + 1 < n && text[i + 1] === '"') { cell += '"'; i += 2; }
              else { i++; break; }
            } else cell += text[i++];
          }
          while (i < n && text[i] !== delim && text[i] !== '\n') i++;
        } else {
          while (i < n && text[i] !== delim && text[i] !== '\n') { cell += text[i++]; }
        }
        row.push(cell);
        if (i < n && text[i] === delim) { i++; }
        else { if (i < n && text[i] === '\n') i++; break; }
      }
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
    }
    return rows;
  }

  function fixEncoding(s) {
    return s
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/\u2014/g, '--').replace(/\u2013/g, '-')
      .replace(/\u2026/g, '...').replace(/\u2022/g, '*').replace(/\u00A0/g, ' ');
  }

  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) { return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'); }).join('');
  }

  var qrCodeLoaded = false;
  function loadQRCode() {
    if (qrCodeLoaded || typeof QRCode !== 'undefined') { qrCodeLoaded = true; return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.4.4/build/qrcode.min.js';
      s.onload = function () { qrCodeLoaded = true; resolve(); };
      s.onerror = function () { reject(new Error('Failed to load QRCode library')); };
      document.head.appendChild(s);
    });
  }

  // ══════════════════════════════════════════
  //  BATCH 1 EXPANSION — Data Nodes
  // ══════════════════════════════════════════

  // ── JSON Prettify ──
  NodeRegistry.register({
    id: 'json-prettify', name: 'JSON Prettify', category: 'Data', icon: '\uD83D\uDCDD',
    inputs: [{ name: 'text', type: 'Text', label: 'JSON' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Formatted' }],
    config: [{ name: 'indent', type: 'number', label: 'Indent Spaces', default: 2 }],
    execute: async function (inputs, config) {
      var indent = parseInt(config.indent) || 2;
      return { text: JSON.stringify(JSON.parse(inputs.text), null, indent) };
    }
  });

  // ── JSON Minify ──
  NodeRegistry.register({
    id: 'json-minify', name: 'JSON Minify', category: 'Data', icon: '\uD83D\uDCE6',
    inputs: [{ name: 'text', type: 'Text', label: 'JSON' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Minified' }],
    config: [],
    execute: async function (inputs) {
      return { text: JSON.stringify(JSON.parse(inputs.text)) };
    }
  });

  // ── Markdown to HTML ──
  NodeRegistry.register({
    id: 'markdown-to-html', name: 'Markdown to HTML', category: 'Data', icon: '\uD83D\uDCC4',
    inputs: [{ name: 'text', type: 'Text', label: 'Markdown' }],
    outputs: [{ name: 'text', type: 'Text', label: 'HTML' }],
    config: [],
    execute: async function (inputs) {
      return { text: markdownToHtml(inputs.text) };
    }
  });

  // ── YAML to JSON ──
  NodeRegistry.register({
    id: 'yaml-to-json', name: 'YAML to JSON', category: 'Data', icon: '\uD83D\uDCC2',
    inputs: [{ name: 'text', type: 'Text', label: 'YAML' }],
    outputs: [{ name: 'text', type: 'Text', label: 'JSON' }],
    config: [],
    execute: async function (inputs) {
      return { text: JSON.stringify(parseSimpleYaml(inputs.text), null, 2) };
    }
  });

  // ── Base64 Encode ──
  NodeRegistry.register({
    id: 'base64-encode', name: 'Base64 Encode', category: 'Data', icon: '\uD83D\uDD10',
    inputs: [{ name: 'text', type: 'Text', label: 'Text' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Base64' }],
    config: [],
    execute: async function (inputs) {
      return { text: btoa(unescape(encodeURIComponent(inputs.text))) };
    }
  });

  // ── Base64 Decode ──
  NodeRegistry.register({
    id: 'base64-decode', name: 'Base64 Decode', category: 'Data', icon: '\uD83D\uDD13',
    inputs: [{ name: 'text', type: 'Text', label: 'Base64' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Text' }],
    config: [],
    execute: async function (inputs) {
      return { text: decodeURIComponent(escape(atob(inputs.text.trim()))) };
    }
  });

  // ── TSV to CSV ──
  NodeRegistry.register({
    id: 'tsv-to-csv', name: 'TSV to CSV', category: 'Data', icon: '\uD83D\uDD00',
    inputs: [{ name: 'text', type: 'Text', label: 'TSV' }],
    outputs: [{ name: 'text', type: 'Text', label: 'CSV' }],
    config: [],
    execute: async function (inputs) {
      return { text: inputs.text.split('\n').map(function (line) {
        return parseDelimitedLine(line, '\t').map(escapeCsvField).join(',');
      }).join('\n') };
    }
  });

  // ── CSV to TSV ──
  NodeRegistry.register({
    id: 'csv-to-tsv', name: 'CSV to TSV', category: 'Data', icon: '\uD83D\uDD01',
    inputs: [{ name: 'text', type: 'Text', label: 'CSV' }],
    outputs: [{ name: 'text', type: 'Text', label: 'TSV' }],
    config: [],
    execute: async function (inputs) {
      return { text: inputs.text.split('\n').map(function (line) {
        return parseCsvLine(line).join('\t');
      }).join('\n') };
    }
  });

  // ── CSV Cleaner ──
  NodeRegistry.register({
    id: 'csv-cleaner', name: 'CSV Cleaner', category: 'Data', icon: '\uD83E\uDDF9',
    inputs: [{ name: 'text', type: 'Text', label: 'CSV' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Cleaned CSV' }],
    config: [
      { name: 'trimWhitespace', type: 'select', label: 'Trim Whitespace',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], default: 'yes' },
      { name: 'removeEmpty', type: 'select', label: 'Remove Empty Rows',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], default: 'yes' },
      { name: 'removeDuplicates', type: 'select', label: 'Remove Duplicates',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], default: 'no' },
      { name: 'doFixEncoding', type: 'select', label: 'Fix Encoding',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], default: 'yes' }
    ],
    execute: async function (inputs, config) {
      var delim = detectDelimiter(inputs.text);
      var rows = parseCsvFull(inputs.text, delim);
      if (config.doFixEncoding === 'yes') {
        rows = rows.map(function (r) { return r.map(fixEncoding); });
      }
      if (config.trimWhitespace === 'yes') {
        rows = rows.map(function (r) { return r.map(function (c) { return c.trim(); }); });
      }
      if (config.removeEmpty === 'yes') {
        rows = rows.filter(function (r) { return r.some(function (c) { return c !== ''; }); });
      }
      if (config.removeDuplicates === 'yes') {
        var seen = {};
        rows = rows.filter(function (r) { var k = r.join('\x00'); if (seen[k]) return false; seen[k] = true; return true; });
      }
      return { text: rows.map(function (r) { return r.map(escapeCsvField).join(','); }).join('\n') };
    }
  });

  // ── QR Code Maker ──
  NodeRegistry.register({
    id: 'qr-code-maker', name: 'QR Code Maker', category: 'Data', icon: '\uD83D\uDCF1',
    inputs: [{ name: 'text', type: 'Text', label: 'Content' }],
    outputs: [{ name: 'image', type: 'Image', label: 'QR Code' }],
    config: [
      { name: 'size', type: 'number', label: 'Size (px)', default: 256 },
      { name: 'errorCorrection', type: 'select', label: 'Error Correction',
        options: [{ value: 'L', label: 'Low' }, { value: 'M', label: 'Medium' },
                  { value: 'Q', label: 'Quartile' }, { value: 'H', label: 'High' }], default: 'M' }
    ],
    execute: async function (inputs, config) {
      await loadQRCode();
      var size = parseInt(config.size) || 256;
      var ec = config.errorCorrection || 'M';
      var canvas = document.createElement('canvas');
      await new Promise(function (resolve, reject) {
        QRCode.toCanvas(canvas, inputs.text, { width: size, margin: 2, errorCorrectionLevel: ec }, function (err) {
          if (err) reject(err); else resolve();
        });
      });
      var blob = await canvasToBlob(canvas, 'image/png');
      canvas.width = 0;
      return { image: blob };
    }
  });

  // ── Color Palette Extractor ──
  NodeRegistry.register({
    id: 'color-palette', name: 'Color Palette', category: 'Image', icon: '\uD83C\uDFA8',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Palette JSON' }],
    config: [{ name: 'colors', type: 'number', label: 'Colors', default: 6 }],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var maxDim = 200;
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      var sw = Math.round(img.width * scale), sh = Math.round(img.height * scale);
      var canvas = document.createElement('canvas');
      canvas.width = sw; canvas.height = sh;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, sw, sh);
      var data = ctx.getImageData(0, 0, sw, sh).data;
      var pixels = [];
      for (var i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
      var numColors = parseInt(config.colors) || 6;
      var palette = medianCut(pixels, numColors);
      canvas.width = 0;
      return { text: JSON.stringify(palette.map(rgbToHex), null, 2) };
    }
  });

  // ══════════════════════════════════════════
  //  BATCH 1 EXPANSION — New Image Nodes
  // ══════════════════════════════════════════

  // ── Image Crop ──
  NodeRegistry.register({
    id: 'image-crop', name: 'Image Crop', category: 'Image', icon: '\u2702\uFE0F',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'image', type: 'Image', label: 'Cropped' }],
    config: [
      { name: 'mode', type: 'select', label: 'Mode',
        options: [{ value: 'manual', label: 'Manual' }, { value: 'auto', label: 'Auto-Trim' }], default: 'manual' },
      { name: 'x', type: 'number', label: 'X', default: 0 },
      { name: 'y', type: 'number', label: 'Y', default: 0 },
      { name: 'width', type: 'number', label: 'Width', default: 256 },
      { name: 'height', type: 'number', label: 'Height', default: 256 },
      { name: 'threshold', type: 'range', label: 'Trim Threshold', min: 0, max: 100, default: 10 }
    ],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var sx, sy, sw, sh;

      if (config.mode === 'auto') {
        // Auto-trim: scan edges for background
        var tc = document.createElement('canvas');
        tc.width = img.width; tc.height = img.height;
        var tctx = tc.getContext('2d');
        tctx.drawImage(img, 0, 0);
        var id = tctx.getImageData(0, 0, tc.width, tc.height);
        var d = id.data, w = tc.width, h = tc.height;
        var thresh = (parseInt(config.threshold) || 10) * 2.55;
        // Reference: top-left pixel
        var refR = d[0], refG = d[1], refB = d[2], refA = d[3];
        function isBg(i) {
          if (d[i + 3] < 10) return true; // transparent
          return Math.abs(d[i] - refR) < thresh && Math.abs(d[i+1] - refG) < thresh && Math.abs(d[i+2] - refB) < thresh;
        }
        var top = 0, bot = h - 1, left = 0, right = w - 1;
        outer_top: for (var yt = 0; yt < h; yt++) { for (var xt = 0; xt < w; xt++) { if (!isBg((yt * w + xt) * 4)) { top = yt; break outer_top; } } }
        outer_bot: for (var yb = h - 1; yb >= top; yb--) { for (var xb = 0; xb < w; xb++) { if (!isBg((yb * w + xb) * 4)) { bot = yb; break outer_bot; } } }
        outer_left: for (var xl = 0; xl < w; xl++) { for (var yl = top; yl <= bot; yl++) { if (!isBg((yl * w + xl) * 4)) { left = xl; break outer_left; } } }
        outer_right: for (var xr = w - 1; xr >= left; xr--) { for (var yr = top; yr <= bot; yr++) { if (!isBg((yr * w + xr) * 4)) { right = xr; break outer_right; } } }
        sx = left; sy = top; sw = right - left + 1; sh = bot - top + 1;
        tc.width = 0;
      } else {
        sx = parseInt(config.x) || 0; sy = parseInt(config.y) || 0;
        sw = parseInt(config.width) || img.width; sh = parseInt(config.height) || img.height;
        // Clamp to image bounds
        if (sx + sw > img.width) sw = img.width - sx;
        if (sy + sh > img.height) sh = img.height - sy;
      }

      if (sw < 1 || sh < 1) throw new Error('Crop area is empty');
      var canvas = document.createElement('canvas');
      canvas.width = sw; canvas.height = sh;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      var blob = await canvasToBlob(canvas, 'image/png');
      canvas.width = 0;
      return { image: blob };
    }
  });

  // ── Color Adjust ──
  NodeRegistry.register({
    id: 'color-adjust', name: 'Color Adjust', category: 'Image', icon: '\u2600\uFE0F',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'image', type: 'Image', label: 'Adjusted' }],
    config: [
      { name: 'brightness', type: 'range', label: 'Brightness', min: -100, max: 100, default: 0 },
      { name: 'contrast', type: 'range', label: 'Contrast', min: -100, max: 100, default: 0 },
      { name: 'saturation', type: 'range', label: 'Saturation', min: 0, max: 200, default: 100 },
      { name: 'grayscale', type: 'select', label: 'Grayscale',
        options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }], default: 'no' },
      { name: 'invert', type: 'select', label: 'Invert',
        options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }], default: 'no' }
    ],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var d = imageData.data;
      var bright = (parseInt(config.brightness) || 0) * 2.55;
      var con = parseInt(config.contrast) || 0;
      var conFactor = con !== 0 ? (259 * (con * 2.55 + 255)) / (255 * (259 - con * 2.55)) : 1;
      var sat = (parseInt(config.saturation) !== undefined ? parseInt(config.saturation) : 100) / 100;
      var doGray = config.grayscale === 'yes';
      var doInvert = config.invert === 'yes';

      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        // Brightness
        r += bright; g += bright; b += bright;
        // Contrast
        if (con !== 0) { r = conFactor * (r - 128) + 128; g = conFactor * (g - 128) + 128; b = conFactor * (b - 128) + 128; }
        // Saturation
        if (sat !== 1) {
          var gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + sat * (r - gray); g = gray + sat * (g - gray); b = gray + sat * (b - gray);
        }
        // Grayscale
        if (doGray) { var lum = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = lum; }
        // Invert
        if (doInvert) { r = 255 - r; g = 255 - g; b = 255 - b; }
        d[i] = Math.max(0, Math.min(255, r));
        d[i + 1] = Math.max(0, Math.min(255, g));
        d[i + 2] = Math.max(0, Math.min(255, b));
      }
      ctx.putImageData(imageData, 0, 0);
      var blob = await canvasToBlob(canvas, 'image/png');
      canvas.width = 0;
      return { image: blob };
    }
  });

  // ── Image Overlay / Watermark ──
  NodeRegistry.register({
    id: 'image-overlay', name: 'Image Overlay', category: 'Image', icon: '\uD83D\uDDBC\uFE0F',
    inputs: [
      { name: 'base', type: 'Image', label: 'Base Image' },
      { name: 'overlay', type: 'Image', label: 'Overlay' }
    ],
    outputs: [{ name: 'image', type: 'Image', label: 'Composited' }],
    config: [
      { name: 'position', type: 'select', label: 'Position',
        options: [{ value: 'center', label: 'Center' }, { value: 'top-left', label: 'Top-Left' },
                  { value: 'top-right', label: 'Top-Right' }, { value: 'bottom-left', label: 'Bottom-Left' },
                  { value: 'bottom-right', label: 'Bottom-Right' }, { value: 'tile', label: 'Tile' }], default: 'bottom-right' },
      { name: 'opacity', type: 'range', label: 'Opacity %', min: 0, max: 100, default: 50 },
      { name: 'scale', type: 'range', label: 'Scale %', min: 10, max: 200, default: 100 }
    ],
    execute: async function (inputs, config) {
      var baseImg = await blobToImage(inputs.base);
      var overImg = await blobToImage(inputs.overlay);
      var canvas = document.createElement('canvas');
      canvas.width = baseImg.width; canvas.height = baseImg.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(baseImg, 0, 0);

      var opacity = (parseInt(config.opacity) || 50) / 100;
      var scale = (parseInt(config.scale) || 100) / 100;
      var ow = Math.round(overImg.width * scale), oh = Math.round(overImg.height * scale);
      var pad = 20, pos = config.position || 'bottom-right';

      ctx.globalAlpha = opacity;
      if (pos === 'tile') {
        for (var ty = 0; ty < canvas.height; ty += oh + pad) {
          for (var tx = 0; tx < canvas.width; tx += ow + pad) {
            ctx.drawImage(overImg, tx, ty, ow, oh);
          }
        }
      } else {
        var x = 0, y = 0;
        if (pos === 'center') { x = (canvas.width - ow) / 2; y = (canvas.height - oh) / 2; }
        else if (pos === 'top-left') { x = pad; y = pad; }
        else if (pos === 'top-right') { x = canvas.width - ow - pad; y = pad; }
        else if (pos === 'bottom-left') { x = pad; y = canvas.height - oh - pad; }
        else { x = canvas.width - ow - pad; y = canvas.height - oh - pad; }
        ctx.drawImage(overImg, x, y, ow, oh);
      }
      ctx.globalAlpha = 1.0;
      var blob = await canvasToBlob(canvas, 'image/png');
      canvas.width = 0;
      return { image: blob };
    }
  });

  // ── Image Compress ──
  NodeRegistry.register({
    id: 'image-compress', name: 'Image Compress', category: 'Image', icon: '\uD83D\uDDDC\uFE0F',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'image', type: 'Image', label: 'Compressed' }],
    config: [
      { name: 'quality', type: 'range', label: 'Quality', min: 1, max: 100, default: 80 },
      { name: 'format', type: 'select', label: 'Format',
        options: [{ value: 'image/jpeg', label: 'JPEG' }, { value: 'image/webp', label: 'WebP' }], default: 'image/jpeg' }
    ],
    execute: async function (inputs, config) {
      var img = await blobToImage(inputs.image);
      var canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      var format = config.format || 'image/jpeg';
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      var quality = (parseInt(config.quality) || 80) / 100;
      var blob = await canvasToBlob(canvas, format, quality);
      canvas.width = 0;
      return { image: blob };
    }
  });

  // ── Images to PDF ──
  NodeRegistry.register({
    id: 'images-to-pdf', name: 'Images to PDF', category: 'Data', icon: '\uD83D\uDCC4',
    inputs: [{ name: 'image', type: 'Image', label: 'Image' }],
    outputs: [{ name: 'pdf', type: 'Text', label: 'PDF (data URL)' }],
    config: [
      { name: 'pageSize', type: 'select', label: 'Page Size',
        options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'fit', label: 'Fit to Image' }], default: 'a4' },
      { name: 'fit', type: 'select', label: 'Image Fit',
        options: [{ value: 'contain', label: 'Contain' }, { value: 'cover', label: 'Cover' }, { value: 'stretch', label: 'Stretch' }], default: 'contain' }
    ],
    execute: async function (inputs, config) {
      if (!inputs.image) throw new Error('No image input');
      // Load jsPDF dynamically
      if (typeof window.jspdf === 'undefined') {
        await new Promise(function (resolve, reject) {
          var s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      var jsPDF = window.jspdf.jsPDF;
      var img = await blobToImage(inputs.image);
      var pageDims = { a4: { w: 595.28, h: 841.89 }, letter: { w: 612, h: 792 } };
      var pw, ph;
      if (config.pageSize === 'fit') { pw = img.width * 0.75; ph = img.height * 0.75; }
      else { pw = pageDims[config.pageSize || 'a4'].w; ph = pageDims[config.pageSize || 'a4'].h; }
      var doc = new jsPDF({ unit: 'pt', format: [pw, ph] });
      var canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      var dw, dh, dx, dy;
      if (config.pageSize === 'fit' || config.fit === 'stretch') { dx = 0; dy = 0; dw = pw; dh = ph; }
      else if (config.fit === 'cover') {
        var cs = Math.max(pw / img.width, ph / img.height);
        dw = img.width * cs; dh = img.height * cs; dx = (pw - dw) / 2; dy = (ph - dh) / 2;
      } else {
        var fs = Math.min(pw / img.width, ph / img.height) * 0.9;
        dw = img.width * fs; dh = img.height * fs; dx = (pw - dw) / 2; dy = (ph - dh) / 2;
      }
      doc.addImage(dataUrl, 'JPEG', dx, dy, dw, dh);
      canvas.width = 0;
      var pdfDataUrl = doc.output('datauristring');
      return { pdf: pdfDataUrl };
    }
  });

  // Caesar Cipher helper
  function caesarShift(text, shift, decode) {
    var s = ((decode ? -shift : shift) % 26 + 26) % 26;
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code >= 65 && code <= 90) out += String.fromCharCode((code - 65 + s) % 26 + 65);
      else if (code >= 97 && code <= 122) out += String.fromCharCode((code - 97 + s) % 26 + 97);
      else out += text.charAt(i);
    }
    return out;
  }

  // Vigenere Cipher helper
  function vigenereCipher(text, key, decode) {
    var k = (key || '').toLowerCase();
    if (!k || /[^a-z]/.test(k)) throw new Error('Vigenere keyword must contain only letters (A-Z).');
    var sign = decode ? -1 : 1;
    var out = '', ki = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      var keyShift = k.charCodeAt(ki % k.length) - 97;
      var s = ((sign * keyShift) % 26 + 26) % 26;
      if (code >= 65 && code <= 90) { out += String.fromCharCode((code - 65 + s) % 26 + 65); ki++; }
      else if (code >= 97 && code <= 122) { out += String.fromCharCode((code - 97 + s) % 26 + 97); ki++; }
      else out += text.charAt(i);
    }
    return out;
  }

  // Caesar Encode
  NodeRegistry.register({
    id: 'caesar-encode', name: 'Caesar Encode', category: 'Data', icon: '🔑',
    inputs: [{ name: 'text', type: 'Text', label: 'Text' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Encoded' }],
    config: [{ name: 'shift', type: 'number', label: 'Shift (1-25)', default: 3, min: 1, max: 25 }],
    execute: async function (inputs, config) {
      if (!inputs.text) throw new Error('No text input');
      var shift = parseInt(config.shift, 10) || 3;
      return { text: caesarShift(inputs.text, shift, false) };
    }
  });

  // Caesar Decode
  NodeRegistry.register({
    id: 'caesar-decode', name: 'Caesar Decode', category: 'Data', icon: '🔓',
    inputs: [{ name: 'text', type: 'Text', label: 'Encoded' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Decoded' }],
    config: [{ name: 'shift', type: 'number', label: 'Shift (1-25)', default: 3, min: 1, max: 25 }],
    execute: async function (inputs, config) {
      if (!inputs.text) throw new Error('No text input');
      var shift = parseInt(config.shift, 10) || 3;
      return { text: caesarShift(inputs.text, shift, true) };
    }
  });

  // Keyword (Vigenere) Encode
  NodeRegistry.register({
    id: 'keyword-encode', name: 'Keyword Encode', category: 'Data', icon: '🔐',
    inputs: [{ name: 'text', type: 'Text', label: 'Text' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Encoded' }],
    config: [{ name: 'key', type: 'text', label: 'Keyword (letters only)', default: 'soup' }],
    execute: async function (inputs, config) {
      if (!inputs.text) throw new Error('No text input');
      return { text: vigenereCipher(inputs.text, config.key, false) };
    }
  });

  // Keyword (Vigenere) Decode
  NodeRegistry.register({
    id: 'keyword-decode', name: 'Keyword Decode', category: 'Data', icon: '🔒',
    inputs: [{ name: 'text', type: 'Text', label: 'Encoded' }],
    outputs: [{ name: 'text', type: 'Text', label: 'Decoded' }],
    config: [{ name: 'key', type: 'text', label: 'Keyword (letters only)', default: 'soup' }],
    execute: async function (inputs, config) {
      if (!inputs.text) throw new Error('No text input');
      return { text: vigenereCipher(inputs.text, config.key, true) };
    }
  });

  // ── Markdown to HTML (for pipeline) ──
  NodeRegistry.register({
    id: 'markdown-to-html', name: 'Markdown to HTML', category: 'Data', icon: '\uD83D\uDCDD',
    inputs: [{ name: 'text', type: 'Text', label: 'Markdown' }],
    outputs: [{ name: 'text', type: 'Text', label: 'HTML' }],
    config: [],
    execute: async function (inputs, config) {
      if (!inputs.text) throw new Error('No text input');
      var md = inputs.text;
      var html = md
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
        .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
        .replace(/^---+$/gm, '<hr>')
        .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/\n\n/g, '</p><p>');
      html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '');
      return { text: '<p>' + html + '</p>' };
    }
  });

  // ── Table Text → CSV ──
  // The text-domain slice of the Document to Spreadsheet tool: reflow a
  // whitespace/tab-aligned plain-text table (e.g. from PDF to Text) into CSV.
  // (Binary PDF/DOCX table extraction lives in the standalone tool, which
  // needs per-item coordinates the pipeline's Text ports can't carry.)
  NodeRegistry.register({
    id: 'table-text-to-csv', name: 'Table Text to CSV', category: 'Data', icon: '📐',
    inputs: [{ name: 'text', type: 'Text', label: 'Table Text' }],
    outputs: [{ name: 'text', type: 'Text', label: 'CSV' }],
    config: [
      { name: 'split', type: 'select', label: 'Column Split',
        options: [
          { value: 'auto', label: 'Auto (tabs or 2+ spaces)' },
          { value: 'whitespace', label: 'Any whitespace run' },
          { value: 'tab', label: 'Tabs only' }
        ], default: 'auto' }
    ],
    execute: async function (inputs, config) {
      if (!inputs.text) throw new Error('No text input');
      var mode = config.split || 'auto';
      var lines = inputs.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      var rows = [];
      lines.forEach(function (line) {
        if (!line.trim()) return;
        var cells;
        if (mode === 'tab') cells = line.split('\t');
        else if (mode === 'whitespace') cells = line.trim().split(/\s+/);
        else cells = line.split(/\t|\s{2,}/);
        rows.push(cells.map(function (c) { return c.trim(); }));
      });
      var w = 0;
      rows.forEach(function (r) { if (r.length > w) w = r.length; });
      rows = rows.map(function (r) { while (r.length < w) r.push(''); return r; });
      return { text: rows.map(function (r) { return r.map(escapeCsvField).join(','); }).join('\n') };
    }
  });

  // ── Image Tiler ──
  NodeRegistry.register({
    id: 'image-tiler',
    name: 'Image Tiler',
    category: 'Image',
    icon: '🧱',
    inputs: [
      { name: 'image1', type: 'Image', label: 'Image 1' },
      { name: 'image2', type: 'Image', label: 'Image 2' },
      { name: 'images', type: 'ImageArray', label: 'More Images' }
    ],
    outputs: [{ name: 'image', type: 'Image', label: 'Tiled' }],
    config: [
      { name: 'mode', type: 'select', label: 'Mode',
        options: [
          { value: 'single', label: 'Single (repeat image 1)' },
          { value: 'checkered', label: 'Checkered (images 1+2)' },
          { value: 'layers', label: 'Layers (stack all, repeat)' },
          { value: 'pattern4x4', label: '4x4 Pattern (1=center/corners, 2=edges)' },
          { value: 'mix', label: 'Mix (random placement)' }
        ], default: 'single' },
      { name: 'cols', type: 'number', label: 'Columns (2-10)', default: 4 },
      { name: 'rows', type: 'number', label: 'Rows (2-10)', default: 4 },
      { name: 'tile', type: 'number', label: 'Tile Size px (0 = auto)', default: 0 }
    ],
    execute: async function (inputs, config) {
      var blobs = [];
      if (inputs.image1) blobs.push(inputs.image1);
      if (inputs.image2) blobs.push(inputs.image2);
      if (Array.isArray(inputs.images)) blobs = blobs.concat(inputs.images);
      if (blobs.length === 0) throw new Error('No images connected');

      var mode = config.mode || 'single';
      var minImages = { single: 1, checkered: 2, layers: 2, pattern4x4: 2, mix: 1 };
      if (blobs.length < minImages[mode]) {
        throw new Error(mode + ' mode needs at least ' + minImages[mode] + ' images (got ' + blobs.length + ')');
      }

      var imgs = [];
      for (var i = 0; i < blobs.length; i++) imgs.push(await blobToImage(blobs[i]));

      var clampGrid = function (v) { return Math.max(2, Math.min(10, parseInt(v, 10) || 4)); };
      var cols = mode === 'pattern4x4' ? 4 : clampGrid(config.cols);
      var rows = mode === 'pattern4x4' ? 4 : clampGrid(config.rows);
      var tile = parseInt(config.tile, 10) || 0;
      var tw = tile > 0 ? Math.min(tile, 1024) : Math.min(imgs[0].width, 512);
      var th = tile > 0 ? Math.min(tile, 1024) : Math.min(imgs[0].height, 512);

      var cc = drawImageToCanvas(imgs[0], cols * tw, rows * th);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = c * tw, y = r * th;
          if (mode === 'layers') {
            for (var l = 0; l < imgs.length; l++) cc.ctx.drawImage(imgs[l], x, y, tw, th);
          } else {
            var idx = 0;
            if (mode === 'checkered') idx = (r + c) % 2;
            else if (mode === 'pattern4x4') {
              var corner = (r === 0 || r === 3) && (c === 0 || c === 3);
              var center = r >= 1 && r <= 2 && c >= 1 && c <= 2;
              idx = (corner || center) ? 0 : 1;
            } else if (mode === 'mix') idx = Math.floor(Math.random() * imgs.length);
            cc.ctx.drawImage(imgs[idx], x, y, tw, th);
          }
        }
      }
      var blob = await canvasToBlob(cc.canvas, 'image/png');
      cc.canvas.width = 0;
      return { image: blob };
    }
  });

})();
