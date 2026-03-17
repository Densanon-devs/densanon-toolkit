/* Statistics Calculator — Universal Engine
   Usage: initStatisticsCalculator({ focus: 'all'|'mean'|'median'|'mode', mountTo: '#selector' })
   Builds the full calculator UI, preset to highlight the focused stat. */

function initStatisticsCalculator(config) {
  var focus = config.focus || 'all';
  var mount = document.querySelector(config.mountTo || '#calculator-mount');
  if (!mount) return;

  // Build UI
  mount.innerHTML = buildUI(focus);

  // Grab elements
  var numbersInput = mount.querySelector('#sc-numbersInput');
  var errorMsg = mount.querySelector('#sc-errorMsg');
  var meanValue = mount.querySelector('#sc-meanValue');
  var medianValue = mount.querySelector('#sc-medianValue');
  var modeValue = mount.querySelector('#sc-modeValue');
  var rangeValue = mount.querySelector('#sc-rangeValue');
  var countValue = mount.querySelector('#sc-countValue');
  var sumValue = mount.querySelector('#sc-sumValue');
  var minValue = mount.querySelector('#sc-minValue');
  var maxValue = mount.querySelector('#sc-maxValue');
  var sortedList = mount.querySelector('#sc-sortedList');
  var barChart = mount.querySelector('#sc-barChart');

  function buildUI(f) {
    var focusLabel = { all: 'Mean / Median / Mode', mean: 'Mean (Average)', median: 'Median', mode: 'Mode' }[f] || 'Statistics';

    return '<div class="sc-input-panel">' +
      '<label for="sc-numbersInput">Enter numbers separated by commas or spaces:</label>' +
      '<textarea id="sc-numbersInput" placeholder="e.g. 5, 12, 7, 3, 12, 9, 15, 7, 12">5, 12, 7, 3, 12, 9, 15, 7, 12</textarea>' +
      '<div class="sc-error" id="sc-errorMsg"></div>' +
    '</div>' +
    '<div class="sc-results-grid">' +
      '<div class="sc-result-card sc-highlight-mean' + (f === 'mean' ? ' sc-focused' : '') + '">' +
        '<div class="sc-label">Mean</div><div class="sc-value" id="sc-meanValue">&mdash;</div></div>' +
      '<div class="sc-result-card sc-highlight-median' + (f === 'median' ? ' sc-focused' : '') + '">' +
        '<div class="sc-label">Median</div><div class="sc-value" id="sc-medianValue">&mdash;</div></div>' +
      '<div class="sc-result-card sc-highlight-mode' + (f === 'mode' ? ' sc-focused' : '') + '">' +
        '<div class="sc-label">Mode</div><div class="sc-value" id="sc-modeValue">&mdash;</div></div>' +
      '<div class="sc-result-card"><div class="sc-label">Range</div><div class="sc-value" id="sc-rangeValue">&mdash;</div></div>' +
      '<div class="sc-result-card"><div class="sc-label">Count</div><div class="sc-value" id="sc-countValue">&mdash;</div></div>' +
      '<div class="sc-result-card"><div class="sc-label">Sum</div><div class="sc-value" id="sc-sumValue">&mdash;</div></div>' +
      '<div class="sc-result-card"><div class="sc-label">Min</div><div class="sc-value" id="sc-minValue">&mdash;</div></div>' +
      '<div class="sc-result-card"><div class="sc-label">Max</div><div class="sc-value" id="sc-maxValue">&mdash;</div></div>' +
    '</div>' +
    '<div class="sc-sorted-section">' +
      '<h4>Sorted Values <span style="font-weight:400;font-size:0.8rem;color:var(--color-text-muted);">(orange = mode, purple = median)</span></h4>' +
      '<div class="sc-sorted-list" id="sc-sortedList"></div>' +
    '</div>' +
    '<div class="sc-chart-section">' +
      '<h4>Value Distribution</h4>' +
      '<canvas id="sc-barChart" width="600" height="250"></canvas>' +
    '</div>';
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = msg ? 'block' : 'none';
  }

  function parseNumbers(str) {
    var tokens = str.split(/[,\s\t\n]+/).filter(function (t) { return t.trim() !== ''; });
    var numbers = [];
    for (var i = 0; i < tokens.length; i++) {
      var n = parseFloat(tokens[i]);
      if (isNaN(n)) return null;
      numbers.push(n);
    }
    return numbers;
  }

  function calcMean(nums) {
    var sum = 0;
    for (var i = 0; i < nums.length; i++) sum += nums[i];
    return sum / nums.length;
  }

  function calcMedian(sorted) {
    var n = sorted.length;
    if (n % 2 === 1) {
      return { value: sorted[Math.floor(n / 2)], indices: [Math.floor(n / 2)] };
    }
    var mid1 = n / 2 - 1;
    var mid2 = n / 2;
    return { value: (sorted[mid1] + sorted[mid2]) / 2, indices: [mid1, mid2] };
  }

  function calcMode(nums) {
    var freq = {};
    var maxFreq = 0;
    nums.forEach(function (n) {
      var key = n.toString();
      freq[key] = (freq[key] || 0) + 1;
      if (freq[key] > maxFreq) maxFreq = freq[key];
    });
    if (maxFreq === 1) return { values: [], freq: 1 };
    var modes = [];
    var keys = Object.keys(freq);
    for (var i = 0; i < keys.length; i++) {
      if (freq[keys[i]] === maxFreq) modes.push(parseFloat(keys[i]));
    }
    if (modes.length === keys.length) return { values: [], freq: maxFreq };
    return { values: modes, freq: maxFreq };
  }

  function formatNum(n) {
    return parseFloat(n.toFixed(10)).toString();
  }

  function drawChart(sorted, mean, modeVals) {
    var dpr = window.devicePixelRatio || 1;
    var container = barChart.parentElement;
    var displayWidth = Math.min(600, container.clientWidth - 40);
    var displayHeight = 220;
    barChart.width = displayWidth * dpr;
    barChart.height = displayHeight * dpr;
    barChart.style.width = displayWidth + 'px';
    barChart.style.height = displayHeight + 'px';
    var ctx = barChart.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    if (sorted.length === 0) return;

    var padding = { top: 20, right: 20, bottom: 30, left: 20 };
    var chartW = displayWidth - padding.left - padding.right;
    var chartH = displayHeight - padding.top - padding.bottom;
    var baseVal = Math.min(0, sorted[0]);
    var topVal = Math.max(0, sorted[sorted.length - 1]);
    var fullRange = topVal - baseVal || 1;
    var barWidth = Math.max(2, (chartW / sorted.length) - 2);
    var gap = Math.max(1, (chartW - barWidth * sorted.length) / (sorted.length + 1));

    var modeSet = {};
    modeVals.forEach(function (v) { modeSet[v.toString()] = true; });

    sorted.forEach(function (val, i) {
      var x = padding.left + gap + i * (barWidth + gap);
      var barH = ((val - baseVal) / fullRange) * chartH;
      var y = padding.top + chartH - barH;
      ctx.fillStyle = modeSet[val.toString()] ? '#fb923c' : '#e53e3e';
      ctx.fillRect(x, y, barWidth, barH);
    });

    var meanY = padding.top + chartH - ((mean - baseVal) / fullRange) * chartH;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, meanY);
    ctx.lineTo(displayWidth - padding.right, meanY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#60a5fa';
    ctx.font = '12px sans-serif';
    ctx.fillText('Mean: ' + formatNum(mean), padding.left + 4, meanY - 6);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    if (sorted.length <= 20) {
      sorted.forEach(function (val, i) {
        var x = padding.left + gap + i * (barWidth + gap) + barWidth / 2;
        ctx.fillText(formatNum(val), x, displayHeight - 6);
      });
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(sorted.length + ' values (sorted)', padding.left, displayHeight - 6);
    }
  }

  function update() {
    showError('');
    var raw = numbersInput.value.trim();
    if (!raw) { clearResults(); return; }

    var nums = parseNumbers(raw);
    if (!nums || nums.length === 0) {
      showError('Please enter valid numbers separated by commas or spaces.');
      clearResults();
      return;
    }

    var sorted = nums.slice().sort(function (a, b) { return a - b; });
    var sum = 0;
    for (var i = 0; i < nums.length; i++) sum += nums[i];
    var mean = sum / nums.length;
    var median = calcMedian(sorted);
    var mode = calcMode(nums);
    var min = sorted[0];
    var max = sorted[sorted.length - 1];
    var range = max - min;

    meanValue.textContent = formatNum(mean);
    medianValue.textContent = formatNum(median.value);
    modeValue.textContent = mode.values.length > 0
      ? mode.values.map(formatNum).join(', ') + ' (\u00d7' + mode.freq + ')'
      : 'No mode';
    rangeValue.textContent = formatNum(range);
    countValue.textContent = nums.length;
    sumValue.textContent = formatNum(sum);
    minValue.textContent = formatNum(min);
    maxValue.textContent = formatNum(max);

    sortedList.innerHTML = '';
    var modeSet = {};
    mode.values.forEach(function (v) { modeSet[v.toString()] = true; });
    sorted.forEach(function (val, idx) {
      var span = document.createElement('span');
      span.className = 'sc-sorted-item';
      if (modeSet[val.toString()]) span.className += ' sc-is-mode';
      if (median.indices.indexOf(idx) >= 0) span.className += ' sc-is-median';
      span.textContent = formatNum(val);
      sortedList.appendChild(span);
    });

    drawChart(sorted, mean, mode.values);
  }

  function clearResults() {
    [meanValue, medianValue, modeValue, rangeValue, countValue, sumValue, minValue, maxValue].forEach(function (el) { el.textContent = '\u2014'; });
    sortedList.innerHTML = '';
    var ctx = barChart.getContext('2d');
    ctx.clearRect(0, 0, barChart.width, barChart.height);
  }

  numbersInput.addEventListener('input', update);
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(update, 200);
  });
  update();
}
