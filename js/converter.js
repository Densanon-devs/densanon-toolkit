/* Universal Image Converter
   Usage: initConverter({ from: 'image/png', to: 'image/jpeg', mountTo: '#converter-mount' })
   Supports all browser-native image format conversions.
   The user can change from/to even if preset. */

const CONVERTER_FORMATS = {
  'image/png':  { label: 'PNG',  ext: '.png',  lossy: false },
  'image/jpeg': { label: 'JPG',  ext: '.jpg',  lossy: true  },
  'image/webp': { label: 'WebP', ext: '.webp', lossy: true  },
  'image/bmp':  { label: 'BMP',  ext: '.bmp',  lossy: false }
};

const CONVERTER_ACCEPT = 'image/png,image/jpeg,image/webp,image/bmp,image/gif,image/svg+xml,.svg';

function initConverter(config = {}) {
  const presetFrom = config.from || null;
  const presetTo = config.to || 'image/png';
  const mountEl = document.querySelector(config.mountTo || '#converter-mount');
  if (!mountEl) return;

  // Build UI
  mountEl.innerHTML = `
    <div class="converter-drop-zone" id="cvtDropZone">
      <p class="drop-label">Drop an image here or click to upload</p>
      <span class="drop-hint">PNG, JPG, WebP, BMP, GIF, SVG</span>
      <input type="file" id="cvtFileInput" accept="${CONVERTER_ACCEPT}" hidden>
    </div>

    <div class="converter-format-row">
      <label>From</label>
      <select id="cvtFromFormat" disabled>
        <option value="">Upload a file</option>
      </select>
      <span class="converter-arrow">&#8594;</span>
      <label>To</label>
      <select id="cvtToFormat">
        ${Object.entries(CONVERTER_FORMATS).map(([mime, f]) =>
          `<option value="${mime}"${mime === presetTo ? ' selected' : ''}>${f.label}</option>`
        ).join('')}
      </select>
    </div>

    <div class="converter-options" id="cvtOptions" style="display:none;">
      <div class="converter-option-group">
        <label>Quality <span class="range-val" id="cvtQualityVal">92%</span></label>
        <input type="range" id="cvtQualitySlider" min="1" max="100" value="92">
      </div>
    </div>

    <div class="converter-actions">
      <button class="converter-btn-primary" id="cvtConvertBtn" disabled>Convert</button>
      <button class="converter-btn-secondary" id="cvtDownloadBtn" style="display:none;">Download</button>
    </div>

    <div class="converter-status" id="cvtStatus"></div>

    <div class="converter-preview" id="cvtPreview">
      <h3>Preview</h3>
      <div class="converter-compare">
        <div class="converter-pane">
          <div class="pane-label">Original</div>
          <img id="cvtOrigImg" alt="Original">
          <div class="pane-meta" id="cvtOrigMeta"></div>
        </div>
        <div class="converter-pane">
          <div class="pane-label">Converted</div>
          <img id="cvtConvImg" alt="Converted">
          <div class="pane-meta" id="cvtConvMeta"></div>
        </div>
      </div>
    </div>
  `;

  // Elements
  const dropZone = document.getElementById('cvtDropZone');
  const fileInput = document.getElementById('cvtFileInput');
  const fromSelect = document.getElementById('cvtFromFormat');
  const toSelect = document.getElementById('cvtToFormat');
  const optionsRow = document.getElementById('cvtOptions');
  const qualitySlider = document.getElementById('cvtQualitySlider');
  const qualityVal = document.getElementById('cvtQualityVal');
  const convertBtn = document.getElementById('cvtConvertBtn');
  const downloadBtn = document.getElementById('cvtDownloadBtn');
  const statusEl = document.getElementById('cvtStatus');
  const previewEl = document.getElementById('cvtPreview');
  const origImg = document.getElementById('cvtOrigImg');
  const convImg = document.getElementById('cvtConvImg');
  const origMeta = document.getElementById('cvtOrigMeta');
  const convMeta = document.getElementById('cvtConvMeta');

  let loadedImage = null;
  let loadedFile = null;
  let convertedBlob = null;

  const FORMAT_NAMES = {};
  const FORMAT_EXTS = {};
  for (const [mime, f] of Object.entries(CONVERTER_FORMATS)) {
    FORMAT_NAMES[mime] = f.label;
    FORMAT_EXTS[mime] = f.ext;
  }
  FORMAT_NAMES['image/gif'] = 'GIF';
  FORMAT_NAMES['image/svg+xml'] = 'SVG';

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
      fromSelect.innerHTML = '<option>' + (FORMAT_NAMES[file.type] || file.type) + '</option>';
      convertBtn.disabled = false;
      updateQualityVis();
      hideResult();
    };
    img.src = url;
  }

  // Quality
  toSelect.addEventListener('change', updateQualityVis);
  qualitySlider.addEventListener('input', () => {
    qualityVal.textContent = qualitySlider.value + '%';
  });

  function updateQualityVis() {
    const to = toSelect.value;
    const isLossy = CONVERTER_FORMATS[to] && CONVERTER_FORMATS[to].lossy;
    optionsRow.style.display = isLossy ? 'flex' : 'none';
  }
  updateQualityVis();

  function hideResult() {
    previewEl.classList.remove('visible');
    downloadBtn.style.display = 'none';
    statusEl.className = 'converter-status';
    convertedBlob = null;
  }

  // Convert
  convertBtn.addEventListener('click', () => {
    if (!loadedImage) return;

    const toFormat = toSelect.value;
    const fmt = CONVERTER_FORMATS[toFormat];
    const quality = fmt && fmt.lossy ? parseInt(qualitySlider.value) / 100 : undefined;

    const canvas = document.createElement('canvas');
    let imgW = loadedImage.naturalWidth;
    let imgH = loadedImage.naturalHeight;
    // SVG files may not report proper dimensions — default to 1024px wide
    if (loadedFile.type === 'image/svg+xml' && (!imgW || !imgH || imgW < 2)) {
      imgW = 1024;
      imgH = 1024;
    }
    canvas.width = imgW;
    canvas.height = imgH;
    const ctx = canvas.getContext('2d');

    if (toFormat === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(loadedImage, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) {
        statusEl.textContent = 'Conversion failed. This format may not be supported by your browser.';
        statusEl.className = 'converter-status error';
        return;
      }

      convertedBlob = blob;
      const convUrl = URL.createObjectURL(blob);

      origImg.src = loadedImage.src;
      origMeta.textContent = (FORMAT_NAMES[loadedFile.type] || 'Image') + ' \u2014 ' + formatSize(loadedFile.size);
      convImg.src = convUrl;
      convMeta.textContent = FORMAT_NAMES[toFormat] + ' \u2014 ' + formatSize(blob.size);

      const ratio = ((blob.size / loadedFile.size) * 100).toFixed(0);
      const diff = blob.size < loadedFile.size
        ? formatSize(loadedFile.size - blob.size) + ' smaller (' + ratio + '% of original)'
        : formatSize(blob.size - loadedFile.size) + ' larger (' + ratio + '% of original)';

      statusEl.textContent = 'Converted successfully. ' + diff;
      statusEl.className = 'converter-status success';
      previewEl.classList.add('visible');
      downloadBtn.style.display = 'inline-block';
    }, toFormat, quality);
  });

  // Download
  downloadBtn.addEventListener('click', () => {
    if (!convertedBlob) return;
    const ext = FORMAT_EXTS[toSelect.value] || '.png';
    const baseName = loadedFile.name.replace(/\.[^.]+$/, '');
    const link = document.createElement('a');
    link.download = baseName + ext;
    link.href = URL.createObjectURL(convertedBlob);
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // Helpers
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
