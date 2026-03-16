(function () {
    var modeButtons = document.querySelectorAll('.mode-btn');
    var panels = {
        whatIs: document.getElementById('panelWhatIs'),
        whatPercent: document.getElementById('panelWhatPercent'),
        percentChange: document.getElementById('panelPercentChange')
    };

    var currentMode = 'whatIs';

    // Mode switching
    modeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            modeButtons.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            Object.keys(panels).forEach(function (key) {
                panels[key].style.display = key === currentMode ? 'block' : 'none';
            });
        });
    });

    // --- What is X% of Y? ---
    var wiPercent = document.getElementById('wiPercent');
    var wiOf = document.getElementById('wiOf');
    var wiResult = document.getElementById('wiResult');
    var wiFormula = document.getElementById('wiFormula');

    function calcWhatIs() {
        var x = parseFloat(wiPercent.value);
        var y = parseFloat(wiOf.value);
        if (isNaN(x) || isNaN(y)) {
            wiResult.textContent = '—';
            wiFormula.textContent = 'Enter both values';
            return;
        }
        var result = (x / 100) * y;
        var rounded = parseFloat(result.toFixed(10));
        wiResult.textContent = rounded;
        wiFormula.textContent = x + '% \u00d7 ' + y + ' = ' + (x / 100) + ' \u00d7 ' + y + ' = ' + rounded;
    }

    wiPercent.addEventListener('input', calcWhatIs);
    wiOf.addEventListener('input', calcWhatIs);

    // --- X is what % of Y? ---
    var wpX = document.getElementById('wpX');
    var wpY = document.getElementById('wpY');
    var wpResult = document.getElementById('wpResult');
    var wpFormula = document.getElementById('wpFormula');

    function calcWhatPercent() {
        var x = parseFloat(wpX.value);
        var y = parseFloat(wpY.value);
        if (isNaN(x) || isNaN(y)) {
            wpResult.textContent = '—';
            wpFormula.textContent = 'Enter both values';
            return;
        }
        if (y === 0) {
            wpResult.textContent = 'Undefined';
            wpFormula.textContent = 'Cannot divide by zero';
            return;
        }
        var result = (x / y) * 100;
        var rounded = parseFloat(result.toFixed(10));
        wpResult.textContent = rounded + '%';
        wpFormula.textContent = '(' + x + ' / ' + y + ') \u00d7 100 = ' + rounded + '%';
    }

    wpX.addEventListener('input', calcWhatPercent);
    wpY.addEventListener('input', calcWhatPercent);

    // --- % Change from X to Y ---
    var pcFrom = document.getElementById('pcFrom');
    var pcTo = document.getElementById('pcTo');
    var pcResult = document.getElementById('pcResult');
    var pcFormula = document.getElementById('pcFormula');

    function calcPercentChange() {
        var from = parseFloat(pcFrom.value);
        var to = parseFloat(pcTo.value);
        if (isNaN(from) || isNaN(to)) {
            pcResult.textContent = '—';
            pcFormula.textContent = 'Enter both values';
            return;
        }
        if (from === 0) {
            pcResult.textContent = 'Undefined';
            pcFormula.textContent = 'Percentage change from zero is undefined';
            return;
        }
        var change = ((to - from) / Math.abs(from)) * 100;
        var rounded = parseFloat(change.toFixed(10));
        var sign = rounded > 0 ? '+' : '';
        pcResult.textContent = sign + rounded + '%';
        pcFormula.textContent = '((' + to + ' \u2212 ' + from + ') / |' + from + '|) \u00d7 100 = ' + sign + rounded + '%';
    }

    pcFrom.addEventListener('input', calcPercentChange);
    pcTo.addEventListener('input', calcPercentChange);

    // Initial calculations
    calcWhatIs();
    calcWhatPercent();
    calcPercentChange();
})();
