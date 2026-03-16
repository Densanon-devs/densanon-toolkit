/* Universal Data Converter Engine
   Usage: initDataConverter({ type: 'csv-to-json', mountTo: '#converter-mount' })
   Supports: csv-to-json, json-to-csv, json-prettify, json-minify,
             tsv-to-csv, csv-to-tsv, markdown-to-html, yaml-to-json,
             base64-encode, base64-decode */

const DC_TYPES = {
  'csv-to-json':     { label: 'CSV to JSON',        ext: '.json' },
  'json-to-csv':     { label: 'JSON to CSV',         ext: '.csv'  },
  'json-prettify':   { label: 'JSON Prettify',       ext: '.json' },
  'json-minify':     { label: 'JSON Minify',         ext: '.json' },
  'tsv-to-csv':      { label: 'TSV to CSV',          ext: '.csv'  },
  'csv-to-tsv':      { label: 'CSV to TSV',          ext: '.tsv'  },
  'markdown-to-html':{ label: 'Markdown to HTML',    ext: '.html' },
  'yaml-to-json':    { label: 'YAML to JSON',        ext: '.json' },
  'base64-encode':   { label: 'Base64 Encode',       ext: '.txt'  },
  'base64-decode':   { label: 'Base64 Decode',       ext: '.txt'  }
};

const DC_PLACEHOLDERS = {
  'csv-to-json':     'name,age,city\nAlice,30,New York\nBob,25,London',
  'json-to-csv':     '[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
  'json-prettify':   '{"name":"Alice","age":30,"city":"New York"}',
  'json-minify':     '{\n  "name": "Alice",\n  "age": 30\n}',
  'tsv-to-csv':      'name\tage\tcity\nAlice\t30\tNew York',
  'csv-to-tsv':      'name,age,city\nAlice,30,New York',
  'markdown-to-html':'# Hello World\n\nThis is **bold** and *italic*.\n\n- Item one\n- Item two',
  'yaml-to-json':    'name: Alice\nage: 30\ncity: New York',
  'base64-encode':   'Hello, World!',
  'base64-decode':   'SGVsbG8sIFdvcmxkIQ=='
};

function initDataConverter(config) {
  const presetType = config.type || 'csv-to-json';
  const mountEl = document.querySelector(config.mountTo || '#converter-mount');
  if (!mountEl) return;

  // Build UI
  mountEl.innerHTML =
    '<div class="dc-drop-zone" id="dcDropZone">' +
      '<p class="drop-label">Drop a text file here or click to upload</p>' +
      '<span class="drop-hint">TXT, CSV, TSV, JSON, YAML, MD</span>' +
      '<input type="file" id="dcFileInput" accept=".txt,.csv,.tsv,.json,.yaml,.yml,.md,.markdown" hidden>' +
    '</div>' +

    '<div class="dc-format-row">' +
      '<label for="dcConversionType">Conversion</label>' +
      '<select id="dcConversionType">' +
        Object.entries(DC_TYPES).map(function(entry) {
          var key = entry[0], info = entry[1];
          return '<option value="' + key + '"' + (key === presetType ? ' selected' : '') + '>' + info.label + '</option>';
        }).join('') +
      '</select>' +
    '</div>' +

    '<textarea class="dc-input-area" id="dcInput" spellcheck="false" placeholder="' +
      escDCAttr(DC_PLACEHOLDERS[presetType] || 'Paste your input here...') + '"></textarea>' +

    '<div class="dc-actions">' +
      '<button class="dc-btn-primary" id="dcConvertBtn">Convert</button>' +
      '<button class="dc-btn-secondary" id="dcCopyBtn" style="display:none;">Copy Result</button>' +
      '<button class="dc-btn-secondary" id="dcDownloadBtn" style="display:none;">Download Result</button>' +
    '</div>' +

    '<div class="dc-status" id="dcStatus"></div>' +

    '<div class="dc-preview" id="dcPreview">' +
      '<h3>Result</h3>' +
      '<pre class="dc-output"><code id="dcOutput"></code></pre>' +
    '</div>';

  // Elements
  var dropZone    = document.getElementById('dcDropZone');
  var fileInput   = document.getElementById('dcFileInput');
  var typeSelect  = document.getElementById('dcConversionType');
  var textInput   = document.getElementById('dcInput');
  var convertBtn  = document.getElementById('dcConvertBtn');
  var copyBtn     = document.getElementById('dcCopyBtn');
  var downloadBtn = document.getElementById('dcDownloadBtn');
  var statusEl    = document.getElementById('dcStatus');
  var previewEl   = document.getElementById('dcPreview');
  var outputEl    = document.getElementById('dcOutput');

  var dataResult = '';
  var dataResultExt = '.txt';

  // Drop zone
  dropZone.addEventListener('click', function() { fileInput.click(); });
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleDataFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) handleDataFile(fileInput.files[0]);
  });

  function handleDataFile(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      textInput.value = ev.target.result;
      dropZone.querySelector('.drop-label').innerHTML =
        'Loaded: <span class="file-name">' + escDCHtml(file.name) + '</span>';
    };
    reader.readAsText(file);
  }

  // Type change updates placeholder
  typeSelect.addEventListener('change', function() {
    textInput.placeholder = DC_PLACEHOLDERS[typeSelect.value] || 'Paste your input here...';
    hideResult();
  });

  function hideResult() {
    previewEl.classList.remove('visible');
    copyBtn.style.display = 'none';
    downloadBtn.style.display = 'none';
    statusEl.className = 'dc-status';
  }

  // Convert
  convertBtn.addEventListener('click', function() {
    var input = textInput.value;
    if (!input.trim()) {
      statusEl.textContent = 'Please enter or paste some input first.';
      statusEl.className = 'dc-status error';
      return;
    }

    try {
      var type = typeSelect.value;
      var result = '';
      var ext = '.txt';

      switch (type) {
        case 'csv-to-json':
          result = dcCsvToJson(input);
          ext = '.json';
          break;
        case 'json-to-csv':
          result = dcJsonToCsv(input);
          ext = '.csv';
          break;
        case 'json-prettify':
          result = JSON.stringify(JSON.parse(input), null, 2);
          ext = '.json';
          break;
        case 'json-minify':
          result = JSON.stringify(JSON.parse(input));
          ext = '.json';
          break;
        case 'tsv-to-csv':
          result = input.split('\n').map(function(line) {
            return dcParseDelimitedLine(line, '\t').map(dcEscapeCsvField).join(',');
          }).join('\n');
          ext = '.csv';
          break;
        case 'csv-to-tsv':
          result = input.split('\n').map(function(line) {
            return dcParseCsvLine(line).join('\t');
          }).join('\n');
          ext = '.tsv';
          break;
        case 'markdown-to-html':
          result = dcMarkdownToHtml(input);
          ext = '.html';
          break;
        case 'yaml-to-json':
          result = JSON.stringify(dcParseSimpleYaml(input), null, 2);
          ext = '.json';
          break;
        case 'base64-encode':
          result = btoa(unescape(encodeURIComponent(input)));
          ext = '.txt';
          break;
        case 'base64-decode':
          result = decodeURIComponent(escape(atob(input.trim())));
          ext = '.txt';
          break;
        default:
          throw new Error('Unknown conversion type');
      }

      dataResult = result;
      dataResultExt = ext;
      outputEl.textContent = result;
      previewEl.classList.add('visible');
      copyBtn.style.display = 'inline-block';
      downloadBtn.style.display = 'inline-block';
      statusEl.textContent = 'Converted successfully.';
      statusEl.className = 'dc-status success';
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'dc-status error';
      hideResult();
      statusEl.className = 'dc-status error';
      statusEl.style.display = 'block';
    }
  });

  // Copy
  copyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(dataResult).then(function() {
      copyBtn.textContent = 'Copied!';
      setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 1500);
    });
  });

  // Download
  downloadBtn.addEventListener('click', function() {
    var blob = new Blob([dataResult], { type: 'text/plain;charset=utf-8' });
    var link = document.createElement('a');
    link.download = 'converted' + dataResultExt;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // ===== PARSERS =====

  function dcParseCsvLine(line) {
    var fields = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  }

  function dcParseDelimitedLine(line, delimiter) {
    var fields = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  }

  function dcEscapeCsvField(field) {
    if (field.indexOf(',') !== -1 || field.indexOf('"') !== -1 || field.indexOf('\n') !== -1) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  function dcCsvToJson(csv) {
    var lines = csv.trim().split('\n');
    if (lines.length < 1) throw new Error('No data found');
    var headers = dcParseCsvLine(lines[0]);
    var result = [];
    for (var i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      var values = dcParseCsvLine(lines[i]);
      var obj = {};
      headers.forEach(function(h, idx) {
        var val = values[idx] !== undefined ? values[idx] : '';
        var num = Number(val);
        obj[h.trim()] = val !== '' && !isNaN(num) && val.trim() === String(num) ? num : val;
      });
      result.push(obj);
    }
    return JSON.stringify(result, null, 2);
  }

  function dcJsonToCsv(jsonStr) {
    var data = JSON.parse(jsonStr);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Input must be a non-empty JSON array of objects');
    var headers = Object.keys(data[0]);
    var lines = [headers.map(dcEscapeCsvField).join(',')];
    data.forEach(function(row) {
      lines.push(headers.map(function(h) {
        return dcEscapeCsvField(String(row[h] !== undefined ? row[h] : ''));
      }).join(','));
    });
    return lines.join('\n');
  }

  function dcMarkdownToHtml(md) {
    var html = md;

    // Fenced code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
      return '<pre><code>' + escDCHtml(code.trimEnd()) + '</code></pre>';
    });

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Headings
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Unordered lists
    html = html.replace(/(^[-*] .+\n?)+/gm, function(match) {
      var items = match.trim().split('\n').map(function(line) {
        return '<li>' + line.replace(/^[-*] /, '') + '</li>';
      }).join('\n');
      return '<ul>\n' + items + '\n</ul>';
    });

    // Ordered lists
    html = html.replace(/(^\d+\. .+\n?)+/gm, function(match) {
      var items = match.trim().split('\n').map(function(line) {
        return '<li>' + line.replace(/^\d+\. /, '') + '</li>';
      }).join('\n');
      return '<ol>\n' + items + '\n</ol>';
    });

    // Paragraphs
    html = html.replace(/^(?!<[a-z/])((?!^\s*$).+)$/gm, '<p>$1</p>');

    // Clean up multiple blank lines
    html = html.replace(/\n{3,}/g, '\n\n');

    return html.trim();
  }

  function dcParseSimpleYaml(yaml) {
    var result = {};
    var lines = yaml.trim().split('\n');
    var currentKey = null;
    var currentList = null;

    for (var li = 0; li < lines.length; li++) {
      var trimmed = lines[li].trim();
      if (!trimmed || trimmed.charAt(0) === '#') continue;

      // List item
      if (trimmed.indexOf('- ') === 0) {
        if (currentKey && currentList) {
          currentList.push(dcParseYamlValue(trimmed.slice(2).trim()));
        }
        continue;
      }

      var colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      var key = trimmed.slice(0, colonIdx).trim();
      var rawVal = trimmed.slice(colonIdx + 1).trim();

      if (rawVal === '') {
        currentKey = key;
        currentList = [];
        result[key] = currentList;
      } else {
        currentKey = key;
        currentList = null;
        result[key] = dcParseYamlValue(rawVal);
      }
    }
    return result;
  }

  function dcParseYamlValue(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null' || val === '~') return null;
    if (/^-?\d+$/.test(val)) return parseInt(val);
    if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
    if ((val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
        (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")) {
      return val.slice(1, -1);
    }
    return val;
  }

  // ===== UTILS =====

  function escDCHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

function escDCAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
}
