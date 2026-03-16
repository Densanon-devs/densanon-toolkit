(function () {
    var ratioA = document.getElementById('ratioA');
    var ratioB = document.getElementById('ratioB');
    var ratioC = document.getElementById('ratioC');
    var colonC = document.getElementById('colonC');
    var threePartToggle = document.getElementById('threePartToggle');
    var scaleWhich = document.getElementById('scaleWhich');
    var scaleTarget = document.getElementById('scaleTarget');
    var errorMsg = document.getElementById('errorMsg');

    var originalRatio = document.getElementById('originalRatio');
    var simplifiedRatio = document.getElementById('simplifiedRatio');
    var gcdValue = document.getElementById('gcdValue');
    var scaledRatio = document.getElementById('scaledRatio');
    var equivList = document.getElementById('equivList');

    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) { var t = b; b = a % t; a = t; }
        return a;
    }

    function gcdMultiple(arr) {
        var result = arr[0];
        for (var i = 1; i < arr.length; i++) {
            result = gcd(result, arr[i]);
        }
        return result;
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = msg ? 'block' : 'none';
    }

    function toWholeNumbers(values) {
        // Convert decimal values to whole numbers by multiplying by appropriate power of 10
        var maxDecimals = 0;
        values.forEach(function (v) {
            var s = v.toString();
            var dot = s.indexOf('.');
            if (dot >= 0) {
                var dec = s.length - dot - 1;
                if (dec > maxDecimals) maxDecimals = dec;
            }
        });

        if (maxDecimals === 0) return values.map(function (v) { return Math.round(v); });

        var factor = Math.pow(10, maxDecimals);
        return values.map(function (v) { return Math.round(v * factor); });
    }

    function updateScaleOptions() {
        var isThree = threePartToggle.checked;
        scaleWhich.innerHTML = '';
        var opt1 = document.createElement('option');
        opt1.value = '0'; opt1.textContent = '1st term';
        scaleWhich.appendChild(opt1);
        var opt2 = document.createElement('option');
        opt2.value = '1'; opt2.textContent = '2nd term';
        scaleWhich.appendChild(opt2);
        if (isThree) {
            var opt3 = document.createElement('option');
            opt3.value = '2'; opt3.textContent = '3rd term';
            scaleWhich.appendChild(opt3);
        }
    }

    function update() {
        showError('');
        var isThree = threePartToggle.checked;

        var a = parseFloat(ratioA.value);
        var b = parseFloat(ratioB.value);
        var c = isThree ? parseFloat(ratioC.value) : 0;

        if (isNaN(a) || isNaN(b) || (isThree && isNaN(c))) {
            originalRatio.textContent = '—';
            simplifiedRatio.textContent = '—';
            gcdValue.textContent = '—';
            scaledRatio.textContent = '—';
            equivList.innerHTML = '';
            return;
        }

        if (a < 0 || b < 0 || (isThree && c < 0)) {
            showError('Ratio terms must be zero or positive.');
            return;
        }

        var values = isThree ? [a, b, c] : [a, b];
        var whole = toWholeNumbers(values);

        // Original
        originalRatio.textContent = isThree ? a + ' : ' + b + ' : ' + c : a + ' : ' + b;

        // GCD and simplification
        var allZero = whole.every(function (v) { return v === 0; });
        if (allZero) {
            simplifiedRatio.textContent = isThree ? '0 : 0 : 0' : '0 : 0';
            gcdValue.textContent = '—';
            scaledRatio.textContent = '—';
            equivList.innerHTML = '';
            return;
        }

        var nonZero = whole.filter(function (v) { return v > 0; });
        var g = nonZero.length > 0 ? gcdMultiple(nonZero) : 1;
        var simplified = whole.map(function (v) { return v === 0 ? 0 : v / g; });

        simplifiedRatio.textContent = simplified.join(' : ');
        gcdValue.textContent = g;

        // Scaling
        var target = parseFloat(scaleTarget.value);
        var whichIdx = parseInt(scaleWhich.value);
        if (!isNaN(target) && target > 0) {
            var base = simplified[whichIdx];
            if (base === 0) {
                scaledRatio.textContent = 'Cannot scale by 0';
            } else {
                var factor = target / base;
                var scaled = simplified.map(function (v) {
                    var sv = v * factor;
                    return parseFloat(sv.toFixed(6));
                });
                scaledRatio.textContent = scaled.join(' : ');
            }
        } else {
            scaledRatio.textContent = '—';
        }

        // Equivalent ratios
        equivList.innerHTML = '';
        for (var m = 1; m <= 6; m++) {
            var eq = simplified.map(function (v) { return v * m; });
            var span = document.createElement('span');
            span.className = 'equiv-ratio';
            span.textContent = eq.join(':');
            equivList.appendChild(span);
            if (m < 6) {
                var eqSign = document.createElement('span');
                eqSign.className = 'equiv-equals';
                eqSign.textContent = '=';
                equivList.appendChild(eqSign);
            }
        }
    }

    // 3-part toggle
    threePartToggle.addEventListener('change', function () {
        var show = threePartToggle.checked;
        ratioC.style.display = show ? 'inline-block' : 'none';
        colonC.style.display = show ? 'inline' : 'none';
        updateScaleOptions();
        update();
    });

    // Input listeners
    [ratioA, ratioB, ratioC, scaleTarget].forEach(function (el) {
        el.addEventListener('input', update);
    });
    scaleWhich.addEventListener('change', update);

    // Initial
    updateScaleOptions();
    update();
})();
