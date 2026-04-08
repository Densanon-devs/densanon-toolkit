/* Pipeline Editor
   Visual SVG + HTML canvas editor for the Pipeline Builder.
   Handles node rendering, drag/drop, port connections, and pipeline execution UI. */

var PipelineEditor = (function () {
  'use strict';

  var engine, canvasEl, svgEl, sidebarEl, toolbarEl, statusEl;
  var connecting = null;  // { fromNode, fromPort, tempPath }
  var dragging = null;    // { nodeId, offsetX, offsetY }
  var selectedConn = null;

  function init(cfg) {
    canvasEl = document.getElementById(cfg.canvas);
    svgEl = document.getElementById(cfg.svg);
    sidebarEl = document.getElementById(cfg.sidebar);
    toolbarEl = document.getElementById(cfg.toolbar);
    statusEl = document.getElementById(cfg.status);

    engine = PipelineEngine.create();
    buildSidebar();
    bindToolbar();
    bindCanvasEvents();
    loadFromStorage();
  }

  // ── Sidebar ──

  function buildSidebar() {
    var cats = NodeRegistry.categories();
    var html = '';
    cats.forEach(function (cat) {
      var nodes = NodeRegistry.getByCategory(cat);
      html += '<div class="pl-sidebar-section"><h4>' + cat + '</h4>';
      nodes.forEach(function (n) {
        html += '<div class="pl-palette-node" draggable="true" data-type="' + n.id + '">' +
          '<span class="pl-palette-icon">' + n.icon + '</span> ' + n.name + '</div>';
      });
      html += '</div>';
    });
    sidebarEl.innerHTML = html;

    // Drag from sidebar
    sidebarEl.querySelectorAll('.pl-palette-node').forEach(function (el) {
      el.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', el.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  }

  // ── Toolbar ──

  function bindToolbar() {
    document.getElementById('plRun').addEventListener('click', runPipeline);
    document.getElementById('plClear').addEventListener('click', clearPipeline);
    document.getElementById('plSave').addEventListener('click', saveToStorage);
    document.getElementById('plLoad').addEventListener('click', loadFromStorage);
  }

  // ── Canvas Events ──

  function bindCanvasEvents() {
    canvasEl.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    canvasEl.addEventListener('drop', function (e) {
      e.preventDefault();
      var type = e.dataTransfer.getData('text/plain');
      if (!type || !NodeRegistry.get(type)) return;
      var rect = canvasEl.getBoundingClientRect();
      var x = e.clientX - rect.left + canvasEl.scrollLeft;
      var y = e.clientY - rect.top + canvasEl.scrollTop;
      var nodeId = PipelineEngine.addNode(engine, type, x - 110, y - 20);
      renderNode(nodeId);
      saveToStorage();
    });

    // Connection drawing on canvas mousemove/mouseup
    canvasEl.addEventListener('mousemove', function (e) {
      if (connecting) {
        var rect = canvasEl.getBoundingClientRect();
        var mx = e.clientX - rect.left + canvasEl.scrollLeft;
        var my = e.clientY - rect.top + canvasEl.scrollTop;
        updateTempConnection(mx, my);
      }
    });

    canvasEl.addEventListener('mouseup', function (e) {
      if (connecting) {
        cancelConnection();
      }
    });

    // Delete key for selected connection
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Delete' && selectedConn) {
        PipelineEngine.removeConnection(engine, selectedConn.fromNode, selectedConn.fromPort, selectedConn.toNode, selectedConn.toPort);
        selectedConn = null;
        renderConnections();
        saveToStorage();
      }
    });
  }

  // ── Node Rendering ──

  function renderNode(nodeId) {
    var node = engine.nodes.get(nodeId);
    var type = NodeRegistry.get(node.type);
    if (!type) return;

    var el = document.createElement('div');
    el.className = 'pl-node';
    el.dataset.nodeId = nodeId;
    el.style.transform = 'translate(' + node.x + 'px, ' + node.y + 'px)';

    var html = '<div class="pl-node-header" data-node-id="' + nodeId + '">' +
      '<span class="pl-node-icon">' + type.icon + '</span>' +
      '<span class="pl-node-title">' + type.name + '</span>' +
      '<button class="pl-node-delete" data-node-id="' + nodeId + '">&times;</button></div>';

    // Input ports
    if (type.inputs.length > 0) {
      html += '<div class="pl-node-ports pl-node-inputs">';
      type.inputs.forEach(function (inp) {
        html += '<div class="pl-port pl-port-in" data-node-id="' + nodeId + '" data-port="' + inp.name + '" data-type="' + inp.type + '">' +
          '<span class="pl-port-dot type-' + inp.type.toLowerCase() + '"></span>' +
          '<span class="pl-port-label">' + inp.label + '</span></div>';
      });
      html += '</div>';
    }

    // Config
    if (type.config.length > 0) {
      html += '<div class="pl-node-config">';
      type.config.forEach(function (cfg) {
        html += renderConfigControl(nodeId, node, cfg);
      });
      html += '</div>';
    }

    // Output ports
    if (type.outputs.length > 0) {
      html += '<div class="pl-node-ports pl-node-outputs">';
      type.outputs.forEach(function (out) {
        html += '<div class="pl-port pl-port-out" data-node-id="' + nodeId + '" data-port="' + out.name + '" data-type="' + out.type + '">' +
          '<span class="pl-port-label">' + out.label + '</span>' +
          '<span class="pl-port-dot type-' + out.type.toLowerCase() + '"></span></div>';
      });
      html += '</div>';
    }

    // Status bar
    html += '<div class="pl-node-status" id="plStatus_' + nodeId + '"></div>';

    el.innerHTML = html;
    canvasEl.appendChild(el);

    // Bind header drag
    var header = el.querySelector('.pl-node-header');
    header.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('pl-node-delete')) return;
      e.preventDefault();
      var rect = canvasEl.getBoundingClientRect();
      dragging = {
        nodeId: nodeId,
        el: el,
        offsetX: e.clientX - rect.left + canvasEl.scrollLeft - node.x,
        offsetY: e.clientY - rect.top + canvasEl.scrollTop - node.y
      };
      el.classList.add('dragging');

      function onMove(ev) {
        var nx = ev.clientX - rect.left + canvasEl.scrollLeft - dragging.offsetX;
        var ny = ev.clientY - rect.top + canvasEl.scrollTop - dragging.offsetY;
        node.x = Math.max(0, nx);
        node.y = Math.max(0, ny);
        el.style.transform = 'translate(' + node.x + 'px, ' + node.y + 'px)';
        renderConnections();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        el.classList.remove('dragging');
        dragging = null;
        saveToStorage();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Bind delete
    el.querySelector('.pl-node-delete').addEventListener('click', function () {
      PipelineEngine.removeNode(engine, nodeId);
      el.remove();
      renderConnections();
      saveToStorage();
    });

    // Bind output port drag (start connection)
    el.querySelectorAll('.pl-port-out .pl-port-dot').forEach(function (dot) {
      dot.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var port = dot.closest('.pl-port');
        connecting = {
          fromNode: port.dataset.nodeId,
          fromPort: port.dataset.port,
          fromType: port.dataset.type,
          startX: 0, startY: 0
        };
        // Get dot center position
        var dotRect = dot.getBoundingClientRect();
        var canvasRect = canvasEl.getBoundingClientRect();
        connecting.startX = dotRect.left + dotRect.width / 2 - canvasRect.left + canvasEl.scrollLeft;
        connecting.startY = dotRect.top + dotRect.height / 2 - canvasRect.top + canvasEl.scrollTop;

        // Create temp SVG path
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'pl-conn-temp');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'var(--color-text-muted)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '6,4');
        svgEl.appendChild(path);
        connecting.tempPath = path;
      });
    });

    // Bind input port (complete connection)
    el.querySelectorAll('.pl-port-in .pl-port-dot').forEach(function (dot) {
      dot.addEventListener('mouseup', function (e) {
        e.stopPropagation();
        if (!connecting) return;
        var port = dot.closest('.pl-port');
        var toNode = port.dataset.nodeId;
        var toPort = port.dataset.port;

        var validation = PipelineEngine.validateConnection(engine, connecting.fromNode, connecting.fromPort, toNode, toPort);
        if (validation.valid) {
          PipelineEngine.addConnection(engine, connecting.fromNode, connecting.fromPort, toNode, toPort);
          renderConnections();
          saveToStorage();
        } else {
          showStatus(validation.reason, 'error');
        }
        cancelConnection();
      });
    });

    // Bind config controls
    bindConfigControls(el, nodeId);
  }

  function renderConfigControl(nodeId, node, cfg) {
    var val = node.config[cfg.name] !== undefined ? node.config[cfg.name] : cfg.default;
    if (val === undefined) val = '';

    if (cfg.type === 'select') {
      var opts = (cfg.options || []).map(function (o) {
        var optVal = typeof o === 'string' ? o : o.value;
        var optLabel = typeof o === 'string' ? o : o.label;
        var sel = String(optVal) === String(val) ? ' selected' : '';
        return '<option value="' + optVal + '"' + sel + '>' + optLabel + '</option>';
      }).join('');
      return '<label class="pl-cfg-label">' + cfg.label +
        '<select class="pl-cfg-input" data-cfg="' + cfg.name + '">' + opts + '</select></label>';
    }
    if (cfg.type === 'range') {
      return '<label class="pl-cfg-label">' + cfg.label + ' <span class="pl-cfg-val">' + val + '</span>' +
        '<input type="range" class="pl-cfg-input" data-cfg="' + cfg.name + '" min="' + (cfg.min || 0) +
        '" max="' + (cfg.max || 100) + '" value="' + val + '"></label>';
    }
    if (cfg.type === 'number') {
      return '<label class="pl-cfg-label">' + cfg.label +
        '<input type="number" class="pl-cfg-input" data-cfg="' + cfg.name + '" value="' + val + '"></label>';
    }
    if (cfg.type === 'file') {
      return '<label class="pl-cfg-label">' + cfg.label +
        '<input type="file" class="pl-cfg-input pl-cfg-file" data-cfg="' + cfg.name + '" accept="' + (cfg.accept || '*') + '">' +
        '<span class="pl-cfg-filename" data-cfg-display="' + cfg.name + '">No file</span></label>';
    }
    if (cfg.type === 'textarea') {
      return '<label class="pl-cfg-label">' + cfg.label +
        '<textarea class="pl-cfg-input pl-cfg-textarea" data-cfg="' + cfg.name + '" rows="3">' + escHtml(String(val)) + '</textarea></label>';
    }
    // text
    return '<label class="pl-cfg-label">' + cfg.label +
      '<input type="text" class="pl-cfg-input" data-cfg="' + cfg.name + '" value="' + escAttr(String(val)) + '"></label>';
  }

  function bindConfigControls(el, nodeId) {
    var node = engine.nodes.get(nodeId);
    el.querySelectorAll('.pl-cfg-input').forEach(function (input) {
      var cfgName = input.dataset.cfg;
      var evtType = input.type === 'file' ? 'change' : 'input';

      input.addEventListener(evtType, function () {
        if (input.type === 'file') {
          var file = input.files[0];
          if (file) {
            node.config._fileBlob = file;
            node.config[cfgName] = file.name;
            var display = el.querySelector('[data-cfg-display="' + cfgName + '"]');
            if (display) display.textContent = file.name;
          }
        } else if (input.type === 'range') {
          node.config[cfgName] = parseInt(input.value);
          var valSpan = input.closest('label').querySelector('.pl-cfg-val');
          if (valSpan) valSpan.textContent = input.value;
        } else if (input.type === 'number') {
          node.config[cfgName] = parseInt(input.value) || 0;
        } else if (input.tagName === 'TEXTAREA') {
          node.config['_text'] = input.value;
        } else {
          node.config[cfgName] = input.value;
        }
      });

      // Set initial defaults
      if (input.type !== 'file' && node.config[cfgName] === undefined) {
        var type = NodeRegistry.get(node.type);
        var cfgDef = type.config.find(function (c) { return c.name === cfgName; });
        if (cfgDef && cfgDef.default !== undefined) {
          node.config[cfgName] = cfgDef.default;
        }
      }
    });
  }

  // ── Connection Rendering ──

  function renderConnections() {
    // Remove all existing connection paths (keep temp if active)
    svgEl.querySelectorAll('.pl-conn').forEach(function (p) { p.remove(); });
    svgEl.querySelectorAll('.pl-conn-hit').forEach(function (p) { p.remove(); });

    // Resize SVG to match canvas
    svgEl.setAttribute('width', canvasEl.scrollWidth);
    svgEl.setAttribute('height', canvasEl.scrollHeight);

    engine.connections.forEach(function (conn) {
      var fromDot = getPortDot(conn.fromNode, conn.fromPort, 'out');
      var toDot = getPortDot(conn.toNode, conn.toPort, 'in');
      if (!fromDot || !toDot) return;

      var p1 = dotCenter(fromDot);
      var p2 = dotCenter(toDot);
      var d = bezierPath(p1.x, p1.y, p2.x, p2.y);

      // Invisible wide hit area
      var hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('d', d);
      hit.setAttribute('class', 'pl-conn-hit');
      hit.setAttribute('fill', 'none');
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', '14');
      hit.style.cursor = 'pointer';
      svgEl.appendChild(hit);

      // Visible path
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'pl-conn');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '2');
      svgEl.appendChild(path);

      // Select connection on click
      hit.addEventListener('click', function (e) {
        e.stopPropagation();
        svgEl.querySelectorAll('.pl-conn').forEach(function (p) { p.classList.remove('selected'); });
        path.classList.add('selected');
        selectedConn = conn;
      });
    });

    // Deselect on canvas click
    canvasEl.addEventListener('click', function (e) {
      if (e.target === canvasEl || e.target === svgEl) {
        svgEl.querySelectorAll('.pl-conn.selected').forEach(function (p) { p.classList.remove('selected'); });
        selectedConn = null;
      }
    });
  }

  function getPortDot(nodeId, portName, direction) {
    var nodeEl = canvasEl.querySelector('[data-node-id="' + nodeId + '"].pl-node');
    if (!nodeEl) return null;
    var cls = direction === 'out' ? 'pl-port-out' : 'pl-port-in';
    var port = nodeEl.querySelector('.' + cls + '[data-port="' + portName + '"] .pl-port-dot');
    return port;
  }

  function dotCenter(dot) {
    var rect = dot.getBoundingClientRect();
    var canvasRect = canvasEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - canvasRect.left + canvasEl.scrollLeft,
      y: rect.top + rect.height / 2 - canvasRect.top + canvasEl.scrollTop
    };
  }

  function bezierPath(x1, y1, x2, y2) {
    var dx = Math.abs(x2 - x1) * 0.5;
    var offset = Math.max(dx, 50);
    return 'M' + x1 + ' ' + y1 + ' C' + (x1 + offset) + ' ' + y1 + ', ' + (x2 - offset) + ' ' + y2 + ', ' + x2 + ' ' + y2;
  }

  function updateTempConnection(mx, my) {
    if (!connecting || !connecting.tempPath) return;
    var d = bezierPath(connecting.startX, connecting.startY, mx, my);
    connecting.tempPath.setAttribute('d', d);
  }

  function cancelConnection() {
    if (connecting && connecting.tempPath) {
      connecting.tempPath.remove();
    }
    connecting = null;
  }

  // ── Pipeline Execution ──

  async function runPipeline() {
    if (engine.running) {
      PipelineEngine.stop(engine);
      return;
    }

    var runBtn = document.getElementById('plRun');
    runBtn.textContent = 'Stop';
    runBtn.classList.add('running');
    showStatus('Running pipeline...', 'info');

    // Clear statuses
    canvasEl.querySelectorAll('.pl-node').forEach(function (el) {
      el.classList.remove('state-running', 'state-done', 'state-error');
      var st = el.querySelector('.pl-node-status');
      if (st) st.textContent = '';
    });

    try {
      await PipelineEngine.run(engine, {
        onNodeStart: function (nodeId) {
          var el = canvasEl.querySelector('[data-node-id="' + nodeId + '"].pl-node');
          if (el) el.classList.add('state-running');
        },
        onNodeDone: function (nodeId) {
          var el = canvasEl.querySelector('[data-node-id="' + nodeId + '"].pl-node');
          if (el) {
            el.classList.remove('state-running');
            el.classList.add('state-done');
          }
        },
        onNodeError: function (nodeId, err) {
          var el = canvasEl.querySelector('[data-node-id="' + nodeId + '"].pl-node');
          if (el) {
            el.classList.remove('state-running');
            el.classList.add('state-error');
            var st = el.querySelector('.pl-node-status');
            if (st) st.textContent = err;
          }
        },
        onPipelineDone: function () {
          showStatus('Pipeline completed!', 'success');
        }
      });
    } catch (e) {
      showStatus('Pipeline error: ' + e.message, 'error');
    }

    runBtn.textContent = 'Run Pipeline';
    runBtn.classList.remove('running');
  }

  // ── Save / Load ──

  function saveToStorage() {
    try {
      localStorage.setItem('pipeline-builder-save', PipelineEngine.serialize(engine));
    } catch (e) { /* quota exceeded, ignore */ }
  }

  function loadFromStorage() {
    var json = localStorage.getItem('pipeline-builder-save');
    if (!json) return;
    try {
      engine = PipelineEngine.deserialize(json);
      rebuildCanvas();
    } catch (e) {
      console.warn('Failed to load pipeline:', e);
    }
  }

  function clearPipeline() {
    engine = PipelineEngine.create();
    rebuildCanvas();
    saveToStorage();
    showStatus('Pipeline cleared', 'info');
  }

  function rebuildCanvas() {
    // Remove all node elements
    canvasEl.querySelectorAll('.pl-node').forEach(function (el) { el.remove(); });
    // Re-render all nodes
    engine.nodes.forEach(function (node) {
      renderNode(node.id);
    });
    renderConnections();
  }

  // ── Utilities ──

  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'pl-status ' + (type || '');
    if (type === 'success' || type === 'info') {
      clearTimeout(statusEl._timeout);
      statusEl._timeout = setTimeout(function () { statusEl.textContent = ''; }, 4000);
    }
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  }

  return { init: init };
})();
