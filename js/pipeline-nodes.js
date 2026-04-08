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

})();
