(function () {
    var decimalInput = document.getElementById('decimalInput');
    var repeatingToggle = document.getElementById('repeatingToggle');
    var errorMsg = document.getElementById('errorMsg');
    var simplifiedFraction = document.getElementById('simplifiedFraction');
    var originalFraction = document.getElementById('originalFraction');
    var mixedNumber = document.getElementById('mixedNumber');
    var percentage = document.getElementById('percentage');
    var stepsContent = document.getElementById('stepsContent');

    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) { var t = b; b = a % t; a = t; }
        return a;
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = msg ? 'block' : 'none';
    }

    function toMixed(num, den) {
        var absNum = Math.abs(num);
        var sign = num < 0 ? '-' : '';
        var whole = Math.floor(absNum / den);
        var rem = absNum % den;
        if (whole === 0) return sign + absNum + '/' + den;
        if (rem === 0) return sign + whole;
        return sign + whole + ' ' + rem + '/' + den;
    }

    function addStep(steps, num, text) {
        var step = document.createElement('div');
        step.className = 'step';
        step.innerHTML = '<div class="step-num">' + num + '</div><div class="step-text">' + text + '</div>';
        steps.appendChild(step);
    }

    function convertRepeating(decStr) {
        // Handle repeating decimals
        var negative = decStr.charAt(0) === '-';
        var abs = negative ? decStr.substring(1) : decStr;
        var steps = [];

        // Split into integer and decimal parts
        var parts = abs.split('.');
        var intPart = parseInt(parts[0]) || 0;
        var decPart = parts[1] || '';

        // Remove trailing repeated digits to find the repeating block
        // Strategy: try block sizes from 1 up to half the decimal length
        var block = decPart;
        var nonRepeating = '';
        var repeating = decPart;

        // Try to find the repeating pattern
        for (var bLen = 1; bLen <= Math.floor(decPart.length / 2); bLen++) {
            var candidate = decPart.substring(decPart.length - bLen);
            var matches = true;
            // Check if this pattern repeats from the end
            for (var i = decPart.length - bLen * 2; i >= decPart.length - bLen * Math.floor(decPart.length / bLen); i -= bLen) {
                if (i < 0) break;
                var segment = decPart.substring(i, i + bLen);
                if (segment !== candidate) { matches = false; break; }
            }
            if (matches && Math.floor(decPart.length / bLen) >= 2) {
                // Found repeating block
                var fullRepeats = Math.floor(decPart.length / bLen);
                var startOfRepeat = decPart.length - fullRepeats * bLen;
                nonRepeating = decPart.substring(0, startOfRepeat);
                repeating = candidate;
                break;
            }
        }

        // If no pattern found, treat entire decimal as repeating
        // Use the formula: for 0.NR where N is non-repeating and R is repeating
        // fraction = (NR - N) / (999...000...) where 9s = length of R, 0s = length of N
        var nrLen = nonRepeating.length;
        var rLen = repeating.length;

        var nines = '';
        for (var i = 0; i < rLen; i++) nines += '9';
        var zeros = '';
        for (var i = 0; i < nrLen; i++) zeros += '0';

        var denominator = parseInt(nines + zeros);
        var allDigits = parseInt(nonRepeating + repeating) || 0;
        var nonRepVal = parseInt(nonRepeating) || 0;
        var numerator = allDigits - nonRepVal;

        // Add the integer part
        numerator = numerator + intPart * denominator;

        if (negative) numerator = -numerator;

        steps.push('Identify the repeating block: 0.' + nonRepeating + '<strong>' + repeating + '</strong>...');
        steps.push('Denominator: <code>' + nines + zeros + '</code> (' + rLen + ' nines' + (nrLen > 0 ? ' and ' + nrLen + ' zeros' : '') + ')');
        steps.push('Numerator: <code>' + (nonRepeating + repeating) + ' \u2212 ' + (nonRepeating || '0') + ' = ' + (allDigits - nonRepVal) + '</code>' + (intPart > 0 ? ' + ' + intPart + ' \u00d7 ' + denominator + ' = ' + Math.abs(numerator) : ''));

        var g = gcd(Math.abs(numerator), denominator);
        var sNum = numerator / g;
        var sDen = denominator / g;

        steps.push('Simplify by dividing both by GCD(' + Math.abs(numerator) + ', ' + denominator + ') = ' + g + ': <code>' + sNum + '/' + sDen + '</code>');

        return { num: numerator, den: denominator, sNum: sNum, sDen: sDen, steps: steps };
    }

    function convertTerminating(decStr) {
        var negative = decStr.charAt(0) === '-';
        var abs = negative ? decStr.substring(1) : decStr;
        var steps = [];

        var parts = abs.split('.');
        var intPart = parseInt(parts[0]) || 0;
        var decPart = parts[1] || '0';

        // Remove trailing zeros for display but keep for calculation
        var decLen = decPart.length;
        var denominator = Math.pow(10, decLen);
        var numerator = parseInt(parts[0] + decPart);

        if (negative) numerator = -numerator;

        steps.push('Write <strong>' + decStr + '</strong> as a fraction: <code>' + numerator + '/' + denominator + '</code> (move decimal ' + decLen + ' place' + (decLen > 1 ? 's' : '') + ' right)');

        var g = gcd(Math.abs(numerator), denominator);
        var sNum = numerator / g;
        var sDen = denominator / g;

        if (g > 1) {
            steps.push('Find GCD(' + Math.abs(numerator) + ', ' + denominator + ') = <code>' + g + '</code>');
            steps.push('Divide both by ' + g + ': <code>' + Math.abs(numerator) + ' \u00f7 ' + g + ' = ' + Math.abs(sNum) + '</code>, <code>' + denominator + ' \u00f7 ' + g + ' = ' + sDen + '</code>');
            steps.push('Simplified fraction: <code>' + sNum + '/' + sDen + '</code>');
        } else {
            steps.push('GCD is 1, so the fraction is already in simplest form: <code>' + sNum + '/' + sDen + '</code>');
        }

        return { num: numerator, den: denominator, sNum: sNum, sDen: sDen, steps: steps };
    }

    function update() {
        showError('');
        var val = decimalInput.value.trim();

        if (!val) {
            simplifiedFraction.textContent = '—';
            originalFraction.textContent = '—';
            mixedNumber.textContent = '—';
            percentage.textContent = '—';
            stepsContent.innerHTML = '';
            return;
        }

        // Validate input
        if (!/^-?\d*\.?\d+$/.test(val)) {
            showError('Please enter a valid decimal number (e.g., 0.75 or -3.125).');
            return;
        }

        var isRepeating = repeatingToggle.checked;
        var result;

        if (isRepeating && val.indexOf('.') !== -1 && val.split('.')[1].length > 0) {
            result = convertRepeating(val);
        } else {
            result = convertTerminating(val);
        }

        // Display results
        simplifiedFraction.textContent = result.sNum + '/' + result.sDen;

        if (isRepeating) {
            originalFraction.textContent = result.num + '/' + result.den;
        } else {
            originalFraction.textContent = result.num + '/' + result.den;
        }

        // Mixed number
        var absNum = Math.abs(result.sNum);
        if (absNum > result.sDen) {
            mixedNumber.textContent = toMixed(result.sNum, result.sDen);
        } else {
            mixedNumber.textContent = '—';
        }

        // Percentage
        var pct = (result.sNum / result.sDen) * 100;
        percentage.textContent = parseFloat(pct.toFixed(6)) + '%';

        // Steps
        stepsContent.innerHTML = '';
        result.steps.forEach(function (text, i) {
            addStep(stepsContent, i + 1, text);
        });
    }

    decimalInput.addEventListener('input', update);
    repeatingToggle.addEventListener('change', update);

    // Initial render
    update();
})();
