(function () {
    const numA = document.getElementById('numA');
    const denA = document.getElementById('denA');
    const numB = document.getElementById('numB');
    const denB = document.getElementById('denB');
    const fillColorInput = document.getElementById('fillColor');
    const compareToggle = document.getElementById('compareToggle');
    const fractionPanelB = document.getElementById('fractionPanelB');
    const vizPanelB = document.getElementById('vizPanelB');
    const errorMsg = document.getElementById('errorMsg');
    const equivList = document.getElementById('equivList');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const presetButtons = document.querySelectorAll('.preset-btn');

    let currentMode = 'circle';
    let fillColor = '#e53e3e';

    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) { [a, b] = [b, a % b]; }
        return a;
    }

    function simplify(n, d) {
        if (d === 0) return { n: 0, d: 0 };
        const g = gcd(n, d);
        return { n: n / g, d: d / g };
    }

    function toMixed(n, d) {
        if (d === 0) return '';
        const whole = Math.floor(n / d);
        const rem = n % d;
        if (whole === 0) return n + '/' + d;
        if (rem === 0) return '' + whole;
        return whole + ' ' + rem + '/' + d;
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = msg ? 'block' : 'none';
    }

    function createCanvas(width, height) {
        const c = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        c.width = width * dpr;
        c.height = height * dpr;
        c.style.width = width + 'px';
        c.style.height = height + 'px';
        const ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);
        return { canvas: c, ctx };
    }

    function drawCircle(ctx, cx, cy, r, denominator, filledSlices, color) {
        const sliceAngle = (Math.PI * 2) / denominator;
        const startOffset = -Math.PI / 2;

        for (let i = 0; i < denominator; i++) {
            const a1 = startOffset + i * sliceAngle;
            const a2 = a1 + sliceAngle;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, a1, a2);
            ctx.closePath();
            if (i < filledSlices) {
                ctx.fillStyle = color;
            } else {
                ctx.fillStyle = '#2a2e3d';
            }
            ctx.fill();
            ctx.strokeStyle = '#1a1d27';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#3a3f52';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawCircleViz(wrapper, num, den, color) {
        wrapper.innerHTML = '';
        if (den === 0) return;

        const wholeCount = Math.floor(num / den);
        const remainder = num % den;
        const shapes = [];

        for (let i = 0; i < wholeCount; i++) {
            shapes.push(den);
        }
        if (remainder > 0 || wholeCount === 0) {
            shapes.push(remainder);
        }

        const size = shapes.length > 3 ? 100 : (shapes.length > 1 ? 130 : 160);
        const r = size / 2 - 6;

        shapes.forEach(function (filled) {
            const { canvas, ctx } = createCanvas(size, size);
            drawCircle(ctx, size / 2, size / 2, r, den, filled, color);
            wrapper.appendChild(canvas);
        });
    }

    function drawBarViz(wrapper, num, den, color) {
        wrapper.innerHTML = '';
        if (den === 0) return;

        const wholeCount = Math.floor(num / den);
        const remainder = num % den;
        const bars = [];

        for (let i = 0; i < wholeCount; i++) {
            bars.push(den);
        }
        if (remainder > 0 || wholeCount === 0) {
            bars.push(remainder);
        }

        const barWidth = Math.min(260, wrapper.parentElement.clientWidth - 60);
        const barHeight = 40;

        bars.forEach(function (filled) {
            const { canvas, ctx } = createCanvas(barWidth, barHeight);
            const segW = barWidth / den;

            for (let i = 0; i < den; i++) {
                const x = i * segW;
                ctx.fillStyle = i < filled ? color : '#2a2e3d';
                ctx.fillRect(x + 1, 1, segW - 2, barHeight - 2);
                ctx.strokeStyle = '#1a1d27';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, 1, segW - 2, barHeight - 2);
            }

            ctx.strokeStyle = '#3a3f52';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, barWidth, barHeight);
            wrapper.appendChild(canvas);
        });
    }

    function drawGridViz(wrapper, num, den, color) {
        wrapper.innerHTML = '';
        if (den === 0) return;

        const wholeCount = Math.floor(num / den);
        const remainder = num % den;
        const grids = [];

        for (let i = 0; i < wholeCount; i++) {
            grids.push(den);
        }
        if (remainder > 0 || wholeCount === 0) {
            grids.push(remainder);
        }

        grids.forEach(function (filled) {
            const cols = Math.ceil(Math.sqrt(den));
            const rows = Math.ceil(den / cols);
            const cellSize = Math.min(36, Math.floor(160 / Math.max(cols, rows)));
            const w = cols * cellSize;
            const h = rows * cellSize;

            const { canvas, ctx } = createCanvas(w, h);

            let idx = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (idx >= den) break;
                    const x = c * cellSize;
                    const y = r * cellSize;
                    ctx.fillStyle = idx < filled ? color : '#2a2e3d';
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                    ctx.strokeStyle = '#1a1d27';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                    idx++;
                }
            }

            wrapper.appendChild(canvas);
        });
    }

    function renderViz(wrapper, num, den, color) {
        if (currentMode === 'circle') {
            drawCircleViz(wrapper, num, den, color);
        } else if (currentMode === 'bar') {
            drawBarViz(wrapper, num, den, color);
        } else {
            drawGridViz(wrapper, num, den, color);
        }
    }

    function renderInfo(container, num, den) {
        container.innerHTML = '';
        if (den === 0) return;

        const s = simplify(num, den);
        const decimal = (num / den).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
        const percent = ((num / den) * 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '%';
        const simplified = s.n + '/' + s.d;
        const mixed = num >= den ? toMixed(num, den) : '';

        const items = [
            { label: 'Fraction', value: num + '/' + den },
            { label: 'Simplified', value: simplified },
            { label: 'Decimal', value: decimal },
            { label: 'Percentage', value: percent }
        ];

        if (mixed) {
            items.push({ label: 'Mixed Number', value: mixed });
        }

        items.forEach(function (item) {
            const div = document.createElement('div');
            div.className = 'info-item';
            div.innerHTML = '<div class="info-label">' + item.label + '</div><div class="info-value">' + item.value + '</div>';
            container.appendChild(div);
        });
    }

    function renderEquivalents(num, den) {
        equivList.innerHTML = '';
        if (den === 0) return;

        const s = simplify(num, den);
        const fracs = [];
        for (let m = 1; m <= 6; m++) {
            fracs.push({ n: s.n * m, d: s.d * m });
        }

        fracs.forEach(function (f, i) {
            const span = document.createElement('span');
            span.className = 'equiv-fraction';
            span.textContent = f.n + '/' + f.d;
            equivList.appendChild(span);
            if (i < fracs.length - 1) {
                const eq = document.createElement('span');
                eq.className = 'equiv-equals';
                eq.textContent = '=';
                equivList.appendChild(eq);
            }
        });
    }

    function update() {
        showError('');
        const nA = parseInt(numA.value) || 0;
        const dA = parseInt(denA.value) || 0;

        if (dA <= 0) {
            showError('Denominator must be a positive number.');
            return;
        }
        if (nA < 0) {
            showError('Numerator must be zero or positive.');
            return;
        }

        const color = fillColor;
        const wrapperA = document.getElementById('canvasWrapperA');
        const infoA = document.getElementById('infoA');
        const titleA = document.getElementById('vizTitleA');

        titleA.textContent = compareToggle.checked ? 'Fraction A: ' + nA + '/' + dA : nA + '/' + dA;
        renderViz(wrapperA, nA, dA, color);
        renderInfo(infoA, nA, dA);
        renderEquivalents(nA, dA);

        if (compareToggle.checked) {
            const nB = parseInt(numB.value) || 0;
            const dB = parseInt(denB.value) || 0;

            if (dB <= 0) {
                showError('Fraction B denominator must be a positive number.');
                return;
            }

            const wrapperB = document.getElementById('canvasWrapperB');
            const infoB = document.getElementById('infoB');
            const titleB = document.getElementById('vizTitleB');

            titleB.textContent = 'Fraction B: ' + nB + '/' + dB;
            renderViz(wrapperB, nB, dB, color);
            renderInfo(infoB, nB, dB);
        }
    }

    // Mode buttons
    modeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            modeButtons.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            update();
        });
    });

    // Color picker
    fillColorInput.addEventListener('input', function () {
        fillColor = fillColorInput.value;
        update();
    });

    // Compare toggle
    compareToggle.addEventListener('change', function () {
        const show = compareToggle.checked;
        fractionPanelB.style.display = show ? 'block' : 'none';
        vizPanelB.style.display = show ? 'block' : 'none';
        update();
    });

    // Presets
    presetButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            numA.value = btn.dataset.num;
            denA.value = btn.dataset.den;
            update();
        });
    });

    // Input listeners
    [numA, denA, numB, denB].forEach(function (input) {
        input.addEventListener('input', update);
    });

    // Initial render
    update();
})();
