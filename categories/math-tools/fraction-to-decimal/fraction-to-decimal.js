(function () {
    var wholeInput = document.getElementById('wholeInput');
    var numInput = document.getElementById('numInput');
    var denInput = document.getElementById('denInput');
    var errorMsg = document.getElementById('errorMsg');
    var decimalValue = document.getElementById('decimalValue');
    var percentValue = document.getElementById('percentValue');
    var decimalType = document.getElementById('decimalType');
    var repeatingPattern = document.getElementById('repeatingPattern');

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = msg ? 'block' : 'none';
    }

    function longDivision(numerator, denominator, maxDigits) {
        // Perform long division to find decimal representation
        // Returns { intPart, decimalDigits, repeatingStart, repeatingLength }
        maxDigits = maxDigits || 2000;

        var intPart = Math.floor(numerator / denominator);
        var remainder = numerator % denominator;

        var digits = [];
        var remainders = {};
        var repeatingStart = -1;

        for (var i = 0; i < maxDigits; i++) {
            if (remainder === 0) {
                break;
            }

            if (remainders.hasOwnProperty(remainder)) {
                repeatingStart = remainders[remainder];
                break;
            }

            remainders[remainder] = i;
            remainder *= 10;
            var digit = Math.floor(remainder / denominator);
            digits.push(digit);
            remainder = remainder % denominator;
        }

        return {
            intPart: intPart,
            digits: digits,
            repeatingStart: repeatingStart,
            isRepeating: repeatingStart >= 0
        };
    }

    function formatDecimalResult(result) {
        var str = result.intPart + '.';
        if (result.digits.length === 0) {
            return { display: result.intPart.toString(), pattern: '' };
        }

        if (!result.isRepeating) {
            // Terminating
            str += result.digits.join('');
            return { display: str, pattern: '' };
        }

        // Repeating
        var nonRepeating = result.digits.slice(0, result.repeatingStart).join('');
        var repeating = result.digits.slice(result.repeatingStart).join('');

        var display = result.intPart + '.' + nonRepeating + repeating + '...';
        var patternHtml = result.intPart + '.' + nonRepeating + '<span class="repeating-highlight">' + repeating + '</span>';

        return { display: display, pattern: patternHtml };
    }

    function update() {
        showError('');

        var whole = parseInt(wholeInput.value) || 0;
        var num = parseInt(numInput.value);
        var den = parseInt(denInput.value);

        if (isNaN(num) || isNaN(den)) {
            decimalValue.textContent = '—';
            percentValue.textContent = '—';
            decimalType.innerHTML = '—';
            repeatingPattern.innerHTML = '—';
            return;
        }

        if (den <= 0) {
            showError('Denominator must be a positive number.');
            return;
        }

        if (num < 0) {
            showError('Numerator must be zero or positive.');
            return;
        }

        // Convert mixed number to improper fraction
        var totalNum = whole * den + num;

        var result = longDivision(totalNum, den);
        var formatted = formatDecimalResult(result);

        // Decimal value
        decimalValue.textContent = formatted.display;

        // Percentage
        var pct = (totalNum / den) * 100;
        if (result.isRepeating) {
            var pctResult = longDivision(totalNum * 100, den, 20);
            var pctFormatted = formatDecimalResult(pctResult);
            percentValue.textContent = pctFormatted.display + '%';
        } else {
            percentValue.textContent = parseFloat(pct.toFixed(10)) + '%';
        }

        // Type
        if (result.isRepeating) {
            decimalType.innerHTML = '<span class="type-badge repeating">Repeating</span>';
        } else {
            decimalType.innerHTML = '<span class="type-badge terminating">Terminating</span>';
        }

        // Repeating pattern
        if (result.isRepeating && formatted.pattern) {
            repeatingPattern.innerHTML = formatted.pattern;
        } else {
            repeatingPattern.innerHTML = result.isRepeating ? '—' : 'N/A (terminates)';
        }
    }

    wholeInput.addEventListener('input', update);
    numInput.addEventListener('input', update);
    denInput.addEventListener('input', update);

    // Initial render
    update();
})();
