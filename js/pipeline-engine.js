/* Pipeline Engine
   Core graph model, topological sort, async runner, and serialization.
   Zero DOM dependencies — pure data and logic. */

var PipelineEngine = (function () {
  'use strict';

  function createEngine() {
    return {
      nodes: new Map(),
      connections: [],
      running: false
    };
  }

  function generateId() {
    return 'n_' + Math.random().toString(36).slice(2, 10);
  }

  function addNode(engine, type, x, y, config) {
    var id = generateId();
    engine.nodes.set(id, {
      id: id,
      type: type,
      x: x,
      y: y,
      config: config || {},
      state: 'idle',
      outputs: null,
      error: null
    });
    return id;
  }

  function removeNode(engine, nodeId) {
    engine.nodes.delete(nodeId);
    engine.connections = engine.connections.filter(function (c) {
      return c.fromNode !== nodeId && c.toNode !== nodeId;
    });
  }

  function addConnection(engine, fromNode, fromPort, toNode, toPort) {
    // Remove any existing connection to the same input port
    engine.connections = engine.connections.filter(function (c) {
      return !(c.toNode === toNode && c.toPort === toPort);
    });
    engine.connections.push({
      fromNode: fromNode,
      fromPort: fromPort,
      toNode: toNode,
      toPort: toPort
    });
  }

  function removeConnection(engine, fromNode, fromPort, toNode, toPort) {
    engine.connections = engine.connections.filter(function (c) {
      return !(c.fromNode === fromNode && c.fromPort === fromPort &&
               c.toNode === toNode && c.toPort === toPort);
    });
  }

  function validateConnection(engine, fromNode, fromPort, toNode, toPort) {
    if (fromNode === toNode) return { valid: false, reason: 'Cannot connect a node to itself' };

    var srcNode = engine.nodes.get(fromNode);
    var dstNode = engine.nodes.get(toNode);
    if (!srcNode || !dstNode) return { valid: false, reason: 'Node not found' };

    var srcType = NodeRegistry.get(srcNode.type);
    var dstType = NodeRegistry.get(dstNode.type);
    if (!srcType || !dstType) return { valid: false, reason: 'Unknown node type' };

    var srcOutput = srcType.outputs.find(function (o) { return o.name === fromPort; });
    var dstInput = dstType.inputs.find(function (i) { return i.name === toPort; });
    if (!srcOutput || !dstInput) return { valid: false, reason: 'Port not found' };

    if (!typesCompatible(srcOutput.type, dstInput.type)) {
      return { valid: false, reason: srcOutput.type + ' cannot connect to ' + dstInput.type };
    }

    // Check for cycles
    if (wouldCreateCycle(engine, fromNode, toNode)) {
      return { valid: false, reason: 'Would create a cycle' };
    }

    return { valid: true };
  }

  function typesCompatible(srcType, dstType) {
    if (srcType === dstType) return true;
    // Image can connect to a generic File/Image input
    if (srcType === 'Image' && dstType === 'Any') return true;
    if (srcType === 'Text' && dstType === 'Any') return true;
    if (srcType === 'ImageArray' && dstType === 'Any') return true;
    return false;
  }

  function wouldCreateCycle(engine, fromNode, toNode) {
    // BFS from fromNode backwards to see if we can reach toNode
    var visited = new Set();
    var queue = [fromNode];
    while (queue.length > 0) {
      var current = queue.shift();
      if (current === toNode) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      engine.connections.forEach(function (c) {
        if (c.toNode === current) queue.push(c.fromNode);
      });
    }
    return false;
  }

  function topoSort(engine) {
    var inDegree = {};
    var adj = {};
    engine.nodes.forEach(function (node) {
      inDegree[node.id] = 0;
      adj[node.id] = [];
    });

    engine.connections.forEach(function (c) {
      if (inDegree[c.toNode] !== undefined) {
        inDegree[c.toNode]++;
      }
      if (adj[c.fromNode]) {
        adj[c.fromNode].push(c.toNode);
      }
    });

    var queue = [];
    for (var id in inDegree) {
      if (inDegree[id] === 0) queue.push(id);
    }

    var order = [];
    while (queue.length > 0) {
      var nodeId = queue.shift();
      order.push(nodeId);
      adj[nodeId].forEach(function (target) {
        inDegree[target]--;
        if (inDegree[target] === 0) queue.push(target);
      });
    }

    if (order.length !== engine.nodes.size) {
      throw new Error('Pipeline contains a cycle');
    }
    return order;
  }

  async function run(engine, callbacks) {
    callbacks = callbacks || {};
    var onStart = callbacks.onNodeStart || function () {};
    var onDone = callbacks.onNodeDone || function () {};
    var onError = callbacks.onNodeError || function () {};
    var onPipelineDone = callbacks.onPipelineDone || function () {};

    // Reset all node states
    engine.nodes.forEach(function (node) {
      node.state = 'idle';
      node.outputs = null;
      node.error = null;
    });

    engine.running = true;
    var order;
    try {
      order = topoSort(engine);
    } catch (e) {
      engine.running = false;
      throw e;
    }

    var dataStore = {};

    for (var i = 0; i < order.length; i++) {
      if (!engine.running) break; // cancelled

      var nodeId = order[i];
      var node = engine.nodes.get(nodeId);
      var nodeType = NodeRegistry.get(node.type);

      if (!nodeType) {
        node.state = 'error';
        node.error = 'Unknown node type: ' + node.type;
        onError(nodeId, node.error);
        engine.running = false;
        return;
      }

      node.state = 'running';
      onStart(nodeId);

      // Gather inputs
      var inputs = {};
      engine.connections.forEach(function (c) {
        if (c.toNode === nodeId && dataStore[c.fromNode]) {
          inputs[c.toPort] = dataStore[c.fromNode][c.fromPort];
        }
      });

      try {
        var outputs = await nodeType.execute(inputs, node.config);
        dataStore[nodeId] = outputs || {};
        node.outputs = outputs;
        node.state = 'done';
        onDone(nodeId, outputs);
      } catch (err) {
        node.state = 'error';
        node.error = err.message || String(err);
        onError(nodeId, node.error);
        engine.running = false;
        return;
      }
    }

    engine.running = false;
    onPipelineDone();
  }

  function stop(engine) {
    engine.running = false;
  }

  function serialize(engine) {
    var nodes = [];
    engine.nodes.forEach(function (n) {
      nodes.push({ id: n.id, type: n.type, x: n.x, y: n.y, config: n.config });
    });
    return JSON.stringify({
      version: 1,
      nodes: nodes,
      connections: engine.connections
    });
  }

  function deserialize(json) {
    var data = JSON.parse(json);
    var engine = createEngine();
    (data.nodes || []).forEach(function (n) {
      engine.nodes.set(n.id, {
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        config: n.config || {},
        state: 'idle',
        outputs: null,
        error: null
      });
    });
    engine.connections = data.connections || [];
    return engine;
  }

  return {
    create: createEngine,
    addNode: addNode,
    removeNode: removeNode,
    addConnection: addConnection,
    removeConnection: removeConnection,
    validateConnection: validateConnection,
    topoSort: topoSort,
    run: run,
    stop: stop,
    serialize: serialize,
    deserialize: deserialize
  };
})();

/* Node Registry — shared between engine and nodes */
var NodeRegistry = (function () {
  var types = {};

  return {
    register: function (def) { types[def.id] = def; },
    get: function (id) { return types[id] || null; },
    getAll: function () { return Object.values(types); },
    getByCategory: function (cat) {
      return Object.values(types).filter(function (t) { return t.category === cat; });
    },
    categories: function () {
      var cats = [];
      Object.values(types).forEach(function (t) {
        if (cats.indexOf(t.category) === -1) cats.push(t.category);
      });
      return cats;
    }
  };
})();
