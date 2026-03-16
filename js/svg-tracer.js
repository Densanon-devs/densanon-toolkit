/* Raster-to-SVG Image Tracer
   Usage: initSvgTracer({ from: 'image/png', mountTo: '#converter-mount' })
   Converts raster images to SVG using color quantization and path tracing. */

const TRACER_ACCEPT = 'image/png,image/jpeg,image/webp,image/bmp,image/gif';

function initSvgTracer(config = {}) {
  const presetFrom = config.from || null;
  const mountEl = document.querySelector(config.mountTo || '#converter-mount');
  if (!mountEl) return;

  const acceptFromLabel = {
    'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP',
    'image/bmp': 'BMP', 'image/gif': 'GIF'
  };

  mountEl.innerHTML = `
    <div class="converter-drop-zone" id="tracerDropZone">
      <p class="drop-label">Drop an image here or click to upload</p>
      <span class="drop-hint">${presetFrom ? (acceptFromLabel[presetFrom] || 'Image') + ' files' : 'PNG, JPG, WebP, BMP, GIF'}</span>
      <input type="file" id="tracerFileInput" accept="${presetFrom || TRACER_ACCEPT}" hidden>
    </div>

    <div class="converter-options" id="tracerOptions" style="display:none;">
      <div class="converter-option-group">
        <label>Colors <span class="range-val" id="tracerColorVal">16</span></label>
        <input type="range" id="tracerColorSlider" min="2" max="64" value="16">
      </div>
      <div class="converter-option-group">
        <label>Detail <span class="range-val" id="tracerDetailVal">Medium</span></label>
        <input type="range" id="tracerDetailSlider" min="1" max="3" value="2">
      </div>
    </div>

    <div class="converter-actions">
      <button class="converter-btn-primary" id="tracerConvertBtn" disabled>Trace to SVG</button>
      <button class="converter-btn-secondary" id="tracerDownloadBtn" style="display:none;">Download SVG</button>
    </div>

    <div class="converter-status" id="tracerStatus"></div>

    <div class="converter-preview" id="tracerPreview">
      <h3>Preview</h3>
      <div class="converter-compare">
        <div class="converter-pane">
          <div class="pane-label">Original</div>
          <img id="tracerOrigImg" alt="Original">
          <div class="pane-meta" id="tracerOrigMeta"></div>
        </div>
        <div class="converter-pane">
          <div class="pane-label">Traced SVG</div>
          <img id="tracerSvgImg" alt="SVG">
          <div class="pane-meta" id="tracerSvgMeta"></div>
        </div>
      </div>
    </div>
  `;

  const dropZone = document.getElementById('tracerDropZone');
  const fileInput = document.getElementById('tracerFileInput');
  const optionsRow = document.getElementById('tracerOptions');
  const colorSlider = document.getElementById('tracerColorSlider');
  const colorVal = document.getElementById('tracerColorVal');
  const detailSlider = document.getElementById('tracerDetailSlider');
  const detailVal = document.getElementById('tracerDetailVal');
  const convertBtn = document.getElementById('tracerConvertBtn');
  const downloadBtn = document.getElementById('tracerDownloadBtn');
  const statusEl = document.getElementById('tracerStatus');
  const previewEl = document.getElementById('tracerPreview');
  const origImg = document.getElementById('tracerOrigImg');
  const svgImg = document.getElementById('tracerSvgImg');
  const origMeta = document.getElementById('tracerOrigMeta');
  const svgMeta = document.getElementById('tracerSvgMeta');

  let loadedImage = null;
  let loadedFile = null;
  let svgString = null;

  const detailLabels = { '1': 'Low', '2': 'Medium', '3': 'High' };

  // Drop zone
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) return;
    loadedFile = file;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      dropZone.querySelector('.drop-label').innerHTML = '<span class="file-name">' + escapeHtml(file.name) + '</span>';
      dropZone.querySelector('.drop-hint').textContent = img.naturalWidth + ' \u00d7 ' + img.naturalHeight + 'px';
      convertBtn.disabled = false;
      optionsRow.style.display = 'flex';
      hideResult();
    };
    img.src = url;
  }

  colorSlider.addEventListener('input', () => { colorVal.textContent = colorSlider.value; });
  detailSlider.addEventListener('input', () => { detailVal.textContent = detailLabels[detailSlider.value] || 'Medium'; });

  function hideResult() {
    previewEl.classList.remove('visible');
    downloadBtn.style.display = 'none';
    statusEl.className = 'converter-status';
    svgString = null;
  }

  // Convert
  convertBtn.addEventListener('click', () => {
    if (!loadedImage) return;

    statusEl.textContent = 'Tracing...';
    statusEl.className = 'converter-status success';

    // Use requestAnimationFrame to let status render before heavy computation
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const numColors = parseInt(colorSlider.value);
          const detail = parseInt(detailSlider.value);

          // Scale down large images for performance
          const maxDim = detail === 1 ? 256 : detail === 2 ? 512 : 800;
          let w = loadedImage.naturalWidth;
          let h = loadedImage.naturalHeight;
          const scale = Math.min(1, maxDim / Math.max(w, h));
          w = Math.round(w * scale);
          h = Math.round(h * scale);

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(loadedImage, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          svgString = traceImage(imageData, numColors, loadedImage.naturalWidth, loadedImage.naturalHeight);
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
          const svgUrl = URL.createObjectURL(svgBlob);

          origImg.src = loadedImage.src;
          origMeta.textContent = formatSize(loadedFile.size) + ' \u2014 ' + loadedImage.naturalWidth + '\u00d7' + loadedImage.naturalHeight + 'px';
          svgImg.src = svgUrl;
          svgMeta.textContent = formatSize(svgBlob.size) + ' \u2014 SVG with ' + numColors + ' colors';

          statusEl.textContent = 'Traced successfully. SVG is ' + formatSize(svgBlob.size) + '.';
          statusEl.className = 'converter-status success';
          previewEl.classList.add('visible');
          downloadBtn.style.display = 'inline-block';
        } catch (err) {
          statusEl.textContent = 'Tracing failed: ' + err.message;
          statusEl.className = 'converter-status error';
        }
      }, 50);
    });
  });

  // Download
  downloadBtn.addEventListener('click', () => {
    if (!svgString) return;
    const baseName = loadedFile.name.replace(/\.[^.]+$/, '');
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = baseName + '.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // ── Image Tracing Engine ──

  function traceImage(imageData, numColors, origW, origH) {
    const { width, height, data } = imageData;
    const pixelCount = width * height;

    // 1. Build pixel array
    const pixels = new Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      const o = i * 4;
      pixels[i] = [data[o], data[o + 1], data[o + 2]];
    }

    // 2. Quantize colors
    const palette = medianCut(pixels, numColors);

    // 3. Map each pixel to nearest palette color
    const indexed = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      indexed[i] = nearestColor(pixels[i], palette);
    }

    // 4. For each color, extract optimized rectangles
    const scaleX = origW / width;
    const scaleY = origH / height;

    let paths = '';
    for (let c = 0; c < palette.length; c++) {
      const rects = extractMergedRects(indexed, width, height, c);
      if (rects.length === 0) continue;

      const [r, g, b] = palette[c];
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

      let d = '';
      for (const rect of rects) {
        const rx = (rect.x * scaleX).toFixed(1);
        const ry = (rect.y * scaleY).toFixed(1);
        const rw = (rect.w * scaleX).toFixed(1);
        const rh = (rect.h * scaleY).toFixed(1);
        d += 'M' + rx + ' ' + ry + 'h' + rw + 'v' + rh + 'h-' + rw + 'Z';
      }
      paths += '<path fill="' + hex + '" d="' + d + '"/>\n';
    }

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + origW + ' ' + origH +
      '" width="' + origW + '" height="' + origH + '">\n' +
      paths + '</svg>';
  }

  // ── Median Cut Color Quantization ──

  function medianCut(pixels, numColors) {
    if (pixels.length === 0) return [[0, 0, 0]];

    let buckets = [pixels.slice()];

    while (buckets.length < numColors) {
      // Find bucket with greatest range
      let maxRange = -1;
      let maxIdx = 0;
      for (let i = 0; i < buckets.length; i++) {
        const range = bucketRange(buckets[i]);
        if (range.maxRange > maxRange) {
          maxRange = range.maxRange;
          maxIdx = i;
        }
      }

      if (buckets[maxIdx].length < 2) break;

      const bucket = buckets[maxIdx];
      const range = bucketRange(bucket);

      // Sort by the channel with the greatest range
      bucket.sort((a, b) => a[range.channel] - b[range.channel]);

      const mid = Math.floor(bucket.length / 2);
      buckets.splice(maxIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
    }

    // Average each bucket
    return buckets.map(bucket => {
      if (bucket.length === 0) return [0, 0, 0];
      let r = 0, g = 0, b = 0;
      for (const p of bucket) { r += p[0]; g += p[1]; b += p[2]; }
      const n = bucket.length;
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    });
  }

  function bucketRange(bucket) {
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (const p of bucket) {
      if (p[0] < minR) minR = p[0]; if (p[0] > maxR) maxR = p[0];
      if (p[1] < minG) minG = p[1]; if (p[1] > maxG) maxG = p[1];
      if (p[2] < minB) minB = p[2]; if (p[2] > maxB) maxB = p[2];
    }
    const rRange = maxR - minR;
    const gRange = maxG - minG;
    const bRange = maxB - minB;
    const maxRange = Math.max(rRange, gRange, bRange);
    const channel = maxRange === rRange ? 0 : maxRange === gRange ? 1 : 2;
    return { maxRange, channel };
  }

  function nearestColor(pixel, palette) {
    let minDist = Infinity;
    let idx = 0;
    for (let i = 0; i < palette.length; i++) {
      const dr = pixel[0] - palette[i][0];
      const dg = pixel[1] - palette[i][1];
      const db = pixel[2] - palette[i][2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) { minDist = dist; idx = i; }
    }
    return idx;
  }

  // ── Rectangle Extraction with Vertical Merging ──

  function extractMergedRects(indexed, w, h, colorIdx) {
    // Scan rows to find horizontal runs, then merge vertically
    const rects = [];
    // active[i] = { x, w, y0, y1 } — rects being extended downward
    let active = [];

    for (let y = 0; y < h; y++) {
      const runs = [];
      let x = 0;
      while (x < w) {
        if (indexed[y * w + x] === colorIdx) {
          const x0 = x;
          while (x < w && indexed[y * w + x] === colorIdx) x++;
          runs.push({ x: x0, w: x - x0 });
        } else {
          x++;
        }
      }

      // Try to extend active rects
      const newActive = [];
      const matched = new Set();

      for (const run of runs) {
        let found = false;
        for (let a = 0; a < active.length; a++) {
          if (!matched.has(a) && active[a].x === run.x && active[a].w === run.w && active[a].y1 === y) {
            active[a].y1 = y + 1;
            newActive.push(active[a]);
            matched.add(a);
            found = true;
            break;
          }
        }
        if (!found) {
          newActive.push({ x: run.x, w: run.w, y0: y, y1: y + 1 });
        }
      }

      // Flush unmatched active rects
      for (let a = 0; a < active.length; a++) {
        if (!matched.has(a)) {
          rects.push({ x: active[a].x, y: active[a].y0, w: active[a].w, h: active[a].y1 - active[a].y0 });
        }
      }

      active = newActive;
    }

    // Flush remaining
    for (const a of active) {
      rects.push({ x: a.x, y: a.y0, w: a.w, h: a.y1 - a.y0 });
    }

    return rects;
  }

  // ── Helpers ──

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
