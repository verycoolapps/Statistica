/**
 * charts.js — Statistical Chart Rendering Module
 * 
 * Provides all chart rendering for the statistical analysis Electron app.
 * Uses Chart.js with registered plugins. Exported as window.charts.
 * 
 * Dark theme colors:
 *   bg:       #0f0f1a
 *   surface:  #1a1a2e
 *   primary:  #6c63ff
 *   accent:   #00d4aa
 */

(function () {
  'use strict';

  /* ─── Theme Constants ──────────────────────────────────────────── */
  const COLORS = {
    bg:       '#0f0f1a',
    surface:  '#1a1a2e',
    primary:  '#6c63ff',
    accent:   '#00d4aa',
    text:     '#e0e0e0',
    grid:     '#2a2a3e',
    error:    '#ff6b6b',
    warn:     '#ffd93d',
  };

  const FONT = {
    family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    color:  COLORS.text,
  };

  /* ─── Internal helpers ──────────────────────────────────────────── */

  /**
   * Destroy any existing Chart.js instance bound to a canvas inside the
   * container, then clear the container of children.
   * @param {string|HTMLElement} containerId
   */
  function clearContainer(containerId) {
    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) return;

    // Destroy existing Chart.js instance referenced via canvas.dataset
    const oldCanvas = el.querySelector('canvas');
    if (oldCanvas && oldCanvas.dataset.chartInstance) {
      try {
        oldCanvas.dataset.chartInstance.destroy();
      } catch (_) { /* ignore */ }
    }

    el.innerHTML = '';
  }

  /**
   * Create a <canvas> inside container, return { canvas, ctx, container }.
   */
  function makeCanvas(containerId, width, height) {
    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) throw new Error(`Container #${containerId} not found`);

    clearContainer(containerId);

    const canvas = document.createElement('canvas');
    canvas.style.width  = (width || '100%');
    canvas.style.height = (height || '400px');
    el.appendChild(canvas);

    return { canvas, ctx: canvas.getContext('2d'), container: el };
  }

  /**
   * Build a Chart.js config skeleton with shared dark-theme defaults.
   */
  function chartDefaults(type, data, options) {
    const merged = Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: COLORS.text, font: { family: FONT.family } },
        },
        title: {
          display: true,
          color:   COLORS.text,
          font:    { family: FONT.family, size: 16 },
        },
      },
      scales: {
        x: {
          grid:  { color: COLORS.grid },
          ticks: { color: COLORS.text, font: { family: FONT.family } },
        },
        y: {
          grid:  { color: COLORS.grid },
          ticks: { color: COLORS.text, font: { family: FONT.family } },
        },
      },
    }, options);

    return { type, data, options: merged };
  }

  /**
   * Create a Chart.js instance inside containerId and save reference.
   */
  function renderChart(containerId, config) {
    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) throw new Error(`Container #${containerId} not found`);

    clearContainer(containerId);

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const instance = new Chart(ctx, config);

    // Store reference so we can destroy later
    canvas.dataset.chartInstance = instance;

    return instance;
  }

  /**
   * Compute normal distribution PDF values.
   */
  function normalPDF(x, mean, std) {
    const z = (x - mean) / std;
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
  }

  /**
   * Compute simple linear regression (y = ax + b).
   */
  function linearRegression(xArr, yArr) {
    const n = xArr.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sx  += xArr[i];
      sy  += yArr[i];
      sxx += xArr[i] * xArr[i];
      sxy += xArr[i] * yArr[i];
    }
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const b = (sy - a * sx) / n;
    return { slope: a, intercept: b };
  }

  /**
   * Compute the quantiles of data (for Q-Q plot).
   */
  function quantile(sorted, p) {
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  /* ─── Histogram ────────────────────────────────────────────────── */

  /**
   * Draw a histogram with an optional normal bell-curve overlay.
   * @param {number[]} data        - Raw data values.
   * @param {number}   bins        - Number of bins (or 'auto').
   * @param {string}   containerId - DOM element id.
   * @param {string}   title       - Chart title.
   */
  function histogram(data, bins, containerId, title) {
    if (!data || data.length === 0) return;

    // Bin the data
    const nBins = (bins === 'auto' || !bins)
      ? Math.max(6, Math.round(Math.sqrt(data.length)))
      : bins;

    const min = Math.min.apply(null, data);
    const max = Math.max.apply(null, data);
    const binWidth = (max - min) / nBins || 1;

    const binCounts = new Array(nBins).fill(0);
    const binEdges  = [];
    for (let i = 0; i <= nBins; i++) binEdges.push(min + i * binWidth);

    for (let i = 0; i < data.length; i++) {
      let idx = Math.floor((data[i] - min) / binWidth);
      if (idx === nBins) idx = nBins - 1;
      binCounts[idx]++;
    }

    const binLabels = [];
    for (let i = 0; i < nBins; i++) {
      const mid = (binEdges[i] + binEdges[i + 1]) / 2;
      binLabels.push(mid.toFixed(2));
    }

    // Bell-curve overlay
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const std  = Math.sqrt(
      data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length
    );

    const curvePoints = 100;
    const curveX = [];
    const curveY = [];
    for (let i = 0; i <= curvePoints; i++) {
      const x = min + (i / curvePoints) * (max - min);
      curveX.push(x.toFixed(2));
      curveY.push(normalPDF(x, mean, std) * nBins * binWidth);
    }

    const config = chartDefaults('bar', {
      labels: binLabels,
      datasets: [
        {
          label: 'Frequency',
          data: binCounts,
          backgroundColor: 'rgba(108, 99, 255, 0.6)',
          borderColor: COLORS.primary,
          borderWidth: 1,
          order: 2,
        },
        {
          label: 'Normal Curve',
          data: curveY,
          type: 'line',
          fill: false,
          borderColor: COLORS.accent,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          order: 1,
          yAxisID: 'y',
        },
      ],
    }, {
      plugins: {
        title: { text: title || 'Histogram' },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── Scatter Plot ─────────────────────────────────────────────── */

  /**
   * @param {number[]} xData
   * @param {number[]} yData
   * @param {string}   containerId
   * @param {string}   title
   * @param {boolean}  regressionLine
   */
  function scatterPlot(xData, yData, containerId, title, regressionLine) {
    if (!xData || !yData || xData.length === 0) return;

    const datasets = [
      {
        label: 'Data',
        data: xData.map((x, i) => ({ x, y: yData[i] })),
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ];

    if (regressionLine) {
      const reg = linearRegression(xData, yData);
      const xMin = Math.min.apply(null, xData);
      const xMax = Math.max.apply(null, xData);
      datasets.push({
        label: `y = ${reg.slope.toFixed(3)}x + ${reg.intercept.toFixed(3)}`,
        data: [
          { x: xMin, y: reg.slope * xMin + reg.intercept },
          { x: xMax, y: reg.slope * xMax + reg.intercept },
        ],
        type: 'line',
        fill: false,
        borderColor: COLORS.accent,
        borderWidth: 2,
        pointRadius: 0,
        pointStyle: 'line',
      });
    }

    const config = chartDefaults('scatter', {
      datasets,
    }, {
      plugins: {
        title: { text: title || 'Scatter Plot' },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              if (ctx.dataset.label === 'Data') {
                return `(${ctx.parsed.x.toFixed(3)}, ${ctx.parsed.y.toFixed(3)})`;
              }
              return ctx.dataset.label;
            },
          },
        },
      },
      scales: {
        x: { type: 'linear', position: 'bottom' },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── Bar Chart ────────────────────────────────────────────────── */

  /**
   * @param {string[]} labels
   * @param {number[]} values
   * @param {string}   containerId
   * @param {string}   title
   * @param {number[]} [errorBars]  - same length as values
   */
  function barChart(labels, values, containerId, title, errorBars) {
    if (!labels || !values || labels.length === 0) return;

    const hasErrors = errorBars && errorBars.length === values.length;

    const dataset = {
      label: title || 'Values',
      data: values,
      backgroundColor: 'rgba(108, 99, 255, 0.6)',
      borderColor: COLORS.primary,
      borderWidth: 1,
    };

    if (hasErrors) {
      // Use barPercentage to leave room for error bar overlay
      dataset.barPercentage = 0.7;
    }

    const config = chartDefaults('bar', {
      labels,
      datasets: [dataset],
    }, {
      plugins: {
        title: { text: title || 'Bar Chart' },
      },
    });

    // Error bars via custom plugin
    if (hasErrors) {
      const errorPlugin = {
        id: 'errorBars',
        afterDraw: function (chart) {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          ctx.save();
          ctx.strokeStyle = COLORS.error;
          ctx.lineWidth = 2;

          meta.data.forEach((bar, idx) => {
            const err = errorBars[idx];
            const x = bar.x;
            const y0 = bar.y;
            const y1 = chart.scales.y.getPixelForValue(values[idx] + err);
            const y2 = chart.scales.y.getPixelForValue(values[idx] - err);

            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.stroke();

            // Ticks
            ctx.beginPath();
            ctx.moveTo(x - 4, y1);
            ctx.lineTo(x + 4, y1);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x - 4, y2);
            ctx.lineTo(x + 4, y2);
            ctx.stroke();
          });

          ctx.restore();
        },
      };

      Chart.register(errorPlugin);

      const instance = renderChart(containerId, config);
      // Store plugin reference for cleanup (optional)
      return instance;
    }

    renderChart(containerId, config);
  }

  /* ─── Box Plot ─────────────────────────────────────────────────── */

  /**
   * Draw side-by-side box plots (Tukey style) using a composite Chart.js
   * bar + scatter approach.
   * @param {number[][]} data   - Array of arrays (one per group).
   * @param {string[]}   labels - Group labels.
   * @param {string}     containerId
   * @param {string}     title
   */
  function boxPlot(data, labels, containerId, title) {
    if (!data || data.length === 0) return;

    const stats = data.map((group) => {
      const sorted = group.slice().sort((a, b) => a - b);
      const n = sorted.length;
      const q1 = quantile(sorted, 0.25);
      const q2 = quantile(sorted, 0.50);
      const q3 = quantile(sorted, 0.75);
      const iqr = q3 - q1;
      const min = Math.max(sorted[0], q1 - 1.5 * iqr);
      const max = Math.min(sorted[n - 1], q3 + 1.5 * iqr);
      const outliers = sorted.filter(v => v < min || v > max);
      return { min, q1, q2, q3, max, iqr, outliers, sorted };
    });

    // Build datasets for candlestick-like rendering via bar stacks
    // We'll use a custom canvas drawer instead since Chart.js boxplot
    // isn't standard. We'll draw directly on canvas.

    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) return;
    clearContainer(containerId);

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    const rect = el.getBoundingClientRect();
    canvas.width  = rect.width  || 600;
    canvas.height = rect.height || 400;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 40, bottom: 50, left: 60, right: 30 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // Determine global y-range
    let globalMin = Infinity, globalMax = -Infinity;
    stats.forEach(s => {
      if (s.min < globalMin) globalMin = s.min;
      if (s.max > globalMax) globalMax = s.max;
    });
    const yRange = globalMax - globalMin || 1;

    function yPx(v) { return pad.top + plotH - ((v - globalMin) / yRange) * plotH; }

    const nGroups = stats.length;
    const groupWidth = plotW / nGroups;
    const boxWidth   = Math.min(groupWidth * 0.5, 40);

    // Draw title
    ctx.fillStyle = COLORS.text;
    ctx.font = `16px ${FONT.family}`;
    ctx.textAlign = 'center';
    ctx.fillText(title || 'Box Plot', W / 2, 24);

    // Draw axes
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = COLORS.text;
    ctx.font = `11px ${FONT.family}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const nYTicks = 5;
    for (let i = 0; i <= nYTicks; i++) {
      const v = globalMin + (i / nYTicks) * yRange;
      const y = yPx(v);
      ctx.fillText(v.toFixed(2), pad.left - 8, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }

    stats.forEach((s, idx) => {
      const cx = pad.left + (idx + 0.5) * groupWidth;
      const hw = boxWidth / 2;

      // Whiskers
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, yPx(s.min));
      ctx.lineTo(cx, yPx(s.q1));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, yPx(s.q3));
      ctx.lineTo(cx, yPx(s.max));
      ctx.stroke();

      // Whisker caps
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.6, yPx(s.min));
      ctx.lineTo(cx + hw * 0.6, yPx(s.min));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.6, yPx(s.max));
      ctx.lineTo(cx + hw * 0.6, yPx(s.max));
      ctx.stroke();

      // Box (IQR)
      ctx.fillStyle = 'rgba(108, 99, 255, 0.4)';
      ctx.strokeStyle = COLORS.primary;
      ctx.lineWidth = 1.5;
      const boxTop = yPx(s.q3);
      const boxBot = yPx(s.q1);
      ctx.fillRect(cx - hw, boxTop, boxWidth, boxBot - boxTop);
      ctx.strokeRect(cx - hw, boxTop, boxWidth, boxBot - boxTop);

      // Median line
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - hw, yPx(s.q2));
      ctx.lineTo(cx + hw, yPx(s.q2));
      ctx.stroke();

      // Outliers
      ctx.fillStyle = COLORS.error;
      s.outliers.forEach(v => {
        ctx.beginPath();
        ctx.arc(cx, yPx(v), 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // X-axis label
      ctx.fillStyle = COLORS.text;
      ctx.font = `12px ${FONT.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labels[idx] || `Group ${idx + 1}`, cx, pad.top + plotH + 8);
    });
  }

  /* ─── Q-Q Plot ─────────────────────────────────────────────────── */

  /**
   * Quantile-Quantile plot against normal distribution.
   * @param {number[]} data
   * @param {string}   containerId
   * @param {string}   title
   */
  function qqPlot(data, containerId, title) {
    if (!data || data.length < 4) return;

    const sorted = data.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const theoretical = [];
    for (let i = 0; i < n; i++) {
      // Blom's rankit: (i - 3/8) / (n + 1/4)
      const p = (i + 1 - 3 / 8) / (n + 1 / 4);
      // Approximate inverse normal (Abramowitz & Stegun)
      const t = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p)));
      const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
      const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
      let z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
      if (p > 0.5) z = -z;
      theoretical.push(z);
    }

    // Reference line y = x (scaled)
    const tMin = theoretical[0];
    const tMax = theoretical[n - 1];
    const sMin = sorted[0];
    const sMax = sorted[n - 1];

    const datasets = [
      {
        label: 'Sample Quantiles',
        data: theoretical.map((t, i) => ({ x: t, y: sorted[i] })),
        backgroundColor: COLORS.primary,
        pointRadius: 3,
      },
      {
        label: 'Reference',
        data: [
          { x: tMin, y: sMin },
          { x: tMax, y: sMax },
        ],
        type: 'line',
        fill: false,
        borderColor: COLORS.accent,
        borderWidth: 2,
        pointRadius: 0,
        pointStyle: 'line',
      },
    ];

    const config = chartDefaults('scatter', { datasets }, {
      plugins: {
        title: { text: title || 'Q-Q Plot' },
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: { display: true, text: 'Theoretical Quantiles', color: COLORS.text },
        },
        y: {
          title: { display: true, text: 'Sample Quantiles', color: COLORS.text },
        },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── Line Chart (multiple series) ────────────────────────────── */

  /**
   * @param {string[]} labels  - X-axis labels.
   * @param {object[]} datasets - Array of { label, data, color?, dash? }.
   * @param {string}   containerId
   * @param {string}   title
   */
  function lineChart(labels, datasets, containerId, title) {
    if (!labels || !datasets || datasets.length === 0) return;

    const palette = [COLORS.primary, COLORS.accent, COLORS.error, COLORS.warn, '#b388ff', '#ff8a80'];
    const chartDatasets = datasets.map((ds, i) => ({
      label: ds.label || `Series ${i + 1}`,
      data: ds.data || [],
      fill: false,
      borderColor: ds.color || palette[i % palette.length],
      backgroundColor: ds.color || palette[i % palette.length],
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      borderDash: ds.dash || [],
    }));

    const config = chartDefaults('line', {
      labels,
      datasets: chartDatasets,
    }, {
      plugins: {
        title: { text: title || 'Line Chart' },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── Heatmap ──────────────────────────────────────────────────── */

  /**
   * Color-coded heatmap using HTML5 Canvas directly.
   * @param {number[][]} matrix     - 2D array [rows][cols].
   * @param {string[]}   rowLabels
   * @param {string[]}   colLabels
   * @param {string}     containerId
   * @param {string}     title
   */
  function heatmap(matrix, rowLabels, colLabels, containerId, title) {
    if (!matrix || matrix.length === 0) return;

    const nRows = matrix.length;
    const nCols = matrix[0].length;

    // Determine global min/max
    let minV = Infinity, maxV = -Infinity;
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const v = matrix[r][c];
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
    }
    const range = maxV - minV || 1;

    function valueColor(v) {
      const t = (v - minV) / range; // 0..1
      // Interpolate: cold (blue) -> mid (purple) -> hot (accent/green)
      const r = Math.round(255 * (t < 0.5 ? t * 2 : 1));
      const g = Math.round(255 * (t < 0.5 ? 0 : (t - 0.5) * 2));
      const b = Math.round(255 * (1 - t));
      return `rgb(${r}, ${g}, ${b})`;
    }

    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) return;
    clearContainer(containerId);

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = `${nCols} / ${nRows}`;
    const rect = el.getBoundingClientRect();
    const W = rect.width || 600;
    const H = Math.max(300, W * (nRows / (nCols || 1)));
    canvas.width = W * 2; // HiDPI
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const pad = { top: 40, bottom: 40, left: 80, right: 80 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const cellW = plotW / nCols;
    const cellH = plotH / nRows;

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = `16px ${FONT.family}`;
    ctx.textAlign = 'center';
    ctx.fillText(title || 'Heatmap', W / 2, 22);

    // Cells
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const x = pad.left + c * cellW;
        const y = pad.top + r * cellH;
        ctx.fillStyle = valueColor(matrix[r][c]);
        ctx.fillRect(x, y, cellW, cellH);

        // Value text
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(11, cellW * 0.3)}px ${FONT.family}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(matrix[r][c].toFixed(2), x + cellW / 2, y + cellH / 2);
      }
    }

    // Row labels
    ctx.fillStyle = COLORS.text;
    ctx.font = `10px ${FONT.family}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < nRows; r++) {
      ctx.fillText(rowLabels[r] || `R${r}`, pad.left - 6, pad.top + (r + 0.5) * cellH);
    }

    // Col labels (rotated via canvas)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c < nCols; c++) {
      const x = pad.left + (c + 0.5) * cellW;
      const y = pad.top + plotH + 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(colLabels[c] || `C${c}`, 0, 0);
      ctx.restore();
    }
  }

  /* ─── Pie Chart ────────────────────────────────────────────────── */

  /**
   * @param {string[]} labels
   * @param {number[]} values
   * @param {string}   containerId
   * @param {string}   title
   */
  function pieChart(labels, values, containerId, title) {
    if (!labels || !values || labels.length === 0) return;

    const palette = [
      COLORS.primary, COLORS.accent, COLORS.error, COLORS.warn,
      '#b388ff', '#ff8a80', '#82b1ff', '#b9f6ca',
    ];
    const bgColors = values.map((_, i) => palette[i % palette.length]);
    const borderColors = bgColors;

    const config = chartDefaults('pie', {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderColor: '#0f0f1a',
        borderWidth: 2,
      }],
    }, {
      plugins: {
        title: { text: title || 'Pie Chart' },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── Factor Loading Plot (2D scatter) ────────────────────────── */

  /**
   * @param {number[][]} loadings    - Array of [factor1, factor2] per item.
   * @param {string[]}   itemNames
   * @param {string}     containerId
   * @param {string}     title
   */
  function factorLoadingPlot(loadings, itemNames, containerId, title) {
    if (!loadings || loadings.length === 0) return;

    // Determine axis range (add padding)
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    loadings.forEach(([x, y]) => {
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
    });
    const padR = Math.max(0.2, (xMax - xMin) * 0.15 || 0.5);
    const padL = Math.max(0.2, (yMax - yMin) * 0.15 || 0.5);
    xMin -= padR; xMax += padR;
    yMin -= padL; yMax += padL;

    const datasets = [
      {
        label: 'Factor Loadings',
        data: loadings.map(([x, y]) => ({ x, y })),
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        pointRadius: 6,
        pointHoverRadius: 9,
      },
    ];

    // Add item name labels via custom plugin
    const labelPlugin = {
      id: 'factorLabels',
      afterDraw: function (chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = COLORS.text;
        ctx.font = `11px ${FONT.family}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((point, i) => {
          const label = itemNames[i] || `Item ${i + 1}`;
          ctx.fillText(label, point.x + 8, point.y - 4);
        });
        ctx.restore();
      },
    };

    Chart.register(labelPlugin);

    const config = chartDefaults('scatter', { datasets }, {
      plugins: {
        title: { text: title || 'Factor Loading Plot' },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const idx = ctx.dataIndex;
              const name = itemNames[idx] || `Item ${idx + 1}`;
              return `${name}: (${ctx.parsed.x.toFixed(3)}, ${ctx.parsed.y.toFixed(3)})`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: xMin, max: xMax,
          title: { display: true, text: 'Factor 1', color: COLORS.text },
          grid: { color: COLORS.grid },
        },
        y: {
          min: yMin, max: yMax,
          title: { display: true, text: 'Factor 2', color: COLORS.text },
          grid: { color: COLORS.grid },
        },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── MIRT 2D Plot (contour / heatmap using Canvas) ───────────── */

  /**
   * Draw a 2D contour plot for Multidimensional Item Response Theory.
   * Uses HTML5 Canvas directly.
   * @param {number[]} theta1      - grid of theta-1 values
   * @param {number[]} theta2      - grid of theta-2 values
   * @param {number[][]} probability - 2D array [i][j] of probabilities
   * @param {string}   containerId
   * @param {string}   title
   */
  function mirt2dPlot(theta1, theta2, probability, containerId, title) {
    if (!theta1 || !theta2 || !probability || probability.length === 0) return;

    const nT1 = theta1.length;
    const nT2 = theta2.length;

    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) return;
    clearContainer(containerId);

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    const rect = el.getBoundingClientRect();
    const W = rect.width || 600;
    const H = 400;
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const pad = { top: 40, bottom: 50, left: 60, right: 40 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // Map theta to pixel
    const t1Min = theta1[0], t1Max = theta1[nT1 - 1];
    const t2Min = theta2[0], t2Max = theta2[nT2 - 1];

    function tx(v) { return pad.left + ((v - t1Min) / (t1Max - t1Min)) * plotW; }
    function ty(v) { return pad.top + plotH - ((v - t2Min) / (t2Max - t2Min)) * plotH; }

    // Draw heatmap cells
    for (let i = 0; i < nT1 - 1; i++) {
      for (let j = 0; j < nT2 - 1; j++) {
        const p = probability[j] ? probability[j][i] : 0.5;
        // Color: 0=blue, 0.5=green, 1=red
        const r = Math.round(255 * p);
        const g = Math.round(255 * (1 - Math.abs(p - 0.5) * 2));
        const b = Math.round(255 * (1 - p));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;

        const x = tx(theta1[i]);
        const y = ty(theta2[j + 1]);
        const w = (tx(theta1[i + 1]) - tx(theta1[i]));
        const h = (ty(theta2[j]) - ty(theta2[j + 1]));
        ctx.fillRect(x, y, w, h);
      }
    }

    // Contour lines (simple marching squares approximation)
    function interpolate(t, a, b) { return a + t * (b - a); }

    for (let level = 0.2; level <= 0.8; level += 0.2) {
      ctx.strokeStyle = level === 0.5 ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = level === 0.5 ? 2 : 1;

      for (let i = 0; i < nT1 - 1; i++) {
        for (let j = 0; j < nT2 - 1; j++) {
          const p00 = probability[j]   ? probability[j][i]   : 0.5;
          const p10 = probability[j]   ? probability[j][i+1] : 0.5;
          const p01 = probability[j+1] ? probability[j+1][i] : 0.5;
          const p11 = probability[j+1] ? probability[j+1][i+1] : 0.5;

          const corners = [p00, p10, p11, p01];
          const signs = corners.map(v => v >= level);

          // All same — skip
          if (signs.every(s => s) || signs.every(s => !s)) continue;

          const pts = [
            { x: theta1[i],   y: theta2[j] },
            { x: theta1[i+1], y: theta2[j] },
            { x: theta1[i+1], y: theta2[j+1] },
            { x: theta1[i],   y: theta2[j+1] },
          ];

          // Edge interpolations
          function edgeP(e1, e2) {
            const v1 = corners[e1], v2 = corners[e2];
            const t = (level - v1) / (v2 - v1);
            return {
              x: interpolate(t, pts[e1].x, pts[e2].x),
              y: interpolate(t, pts[e1].y, pts[e2].y),
            };
          }

          const edges = [];
          for (let e = 0; e < 4; e++) {
            const next = (e + 1) % 4;
            if (signs[e] !== signs[next]) {
              edges.push(edgeP(e, next));
            }
          }

          if (edges.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(tx(edges[0].x), ty(edges[0].y));
            ctx.lineTo(tx(edges[1].x), ty(edges[1].y));
            ctx.stroke();
          }
        }
      }
    }

    // Axes
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = COLORS.text;
    ctx.font = `12px ${FONT.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('θ₁ (Ability Dimension 1)', pad.left + plotW / 2, pad.top + plotH + 12);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('θ₂ (Ability Dimension 2)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = `16px ${FONT.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(title || 'MIRT 2D Probability Surface', W / 2, pad.top - 6);

    // Color bar
    const barX = W - 30;
    const barY = pad.top;
    const barH = plotH;
    const barW = 14;
    for (let i = 0; i <= barH; i++) {
      const p = 1 - i / barH;
      const r = Math.round(255 * p);
      const g = Math.round(255 * (1 - Math.abs(p - 0.5) * 2));
      const b = Math.round(255 * (1 - p));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(barX, barY + i, barW, 1);
    }
    ctx.strokeStyle = COLORS.grid;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = COLORS.text;
    ctx.font = `9px ${FONT.family}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('1.0', barX + barW + 4, barY);
    ctx.fillText('0.5', barX + barW + 4, barY + barH / 2);
    ctx.fillText('0.0', barX + barW + 4, barY + barH);
  }

  /* ─── Item Response Function (IRF) ─────────────────────────────── */

  /**
   * @param {number[]} theta         - Ability levels.
   * @param {number[]} probabilities - Response probabilities.
   * @param {string}   containerId
   * @param {string}   title
   */
  function irfPlot(theta, probabilities, containerId, title) {
    if (!theta || !probabilities || theta.length === 0) return;

    const config = chartDefaults('line', {
      labels: theta.map(t => t.toFixed(2)),
      datasets: [
        {
          label: 'P(θ)',
          data: probabilities,
          fill: false,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primary,
          borderWidth: 3,
          pointRadius: 2,
          tension: 0.3,
        },
      ],
    }, {
      plugins: {
        title: { text: title || 'Item Response Function' },
      },
      scales: {
        x: {
          title: { display: true, text: 'θ (Ability)', color: COLORS.text },
          min: Math.min.apply(null, theta),
          max: Math.max.apply(null, theta),
        },
        y: {
          title: { display: true, text: 'P(θ)', color: COLORS.text },
          min: 0, max: 1,
        },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── SEM Path Diagram (simple canvas) ─────────────────────────── */

  /**
   * Draw a simple SEM path diagram using HTML5 Canvas.
   * Model format: { variables: [{name, x, y}], paths: [{from, to, label?}] }
   * @param {object}   model
   * @param {string}   containerId
   * @param {string}   title
   */
  function semPathDiagram(model, containerId, title) {
    if (!model || !model.variables || model.variables.length === 0) return;

    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) return;
    clearContainer(containerId);

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    const rect = el.getBoundingClientRect();
    const W = rect.width || 700;
    const H = 400;
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = `16px ${FONT.family}`;
    ctx.textAlign = 'center';
    ctx.fillText(title || 'Path Diagram', W / 2, 24);

    // Fixed positions if not specified
    const vars = model.variables.map((v, i) => {
      if (v.x !== undefined && v.y !== undefined) return v;
      // Auto-layout in a circle if no positions given
      const angle = (2 * Math.PI * i) / model.variables.length - Math.PI / 2;
      return {
        name: v.name,
        x: v.x !== undefined ? v.x : W / 2 + 150 * Math.cos(angle),
        y: v.y !== undefined ? v.y : H / 2 + 100 * Math.sin(angle),
      };
    });

    // Draw paths
    if (model.paths) {
      model.paths.forEach(path => {
        const from = vars.find(v => v.name === path.from);
        const to   = vars.find(v => v.name === path.to);
        if (!from || !to) return;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrowhead
        const headLen = 10;
        const nx = dx / dist;
        const ny = dy / dist;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - nx * headLen - ny * headLen * 0.4, to.y - ny * headLen + nx * headLen * 0.4);
        ctx.lineTo(to.x - nx * headLen + ny * headLen * 0.4, to.y - ny * headLen - nx * headLen * 0.4);
        ctx.closePath();
        ctx.fillStyle = COLORS.primary;
        ctx.fill();

        // Path label
        if (path.label) {
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          ctx.fillStyle = COLORS.accent;
          ctx.font = `11px ${FONT.family}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(path.label, mx + ny * 14, my - nx * 14);
        }
      });
    }

    // Draw variable nodes
    vars.forEach(v => {
      const radius = 28;

      // Shadow
      ctx.beginPath();
      ctx.arc(v.x + 2, v.y + 2, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(v.x, v.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.surface;
      ctx.fill();
      ctx.strokeStyle = COLORS.primary;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = COLORS.text;
      ctx.font = `bold 12px ${FONT.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(v.name, v.x, v.y);
    });
  }

  /* ─── Correlation Matrix ───────────────────────────────────────── */

  /**
   * Color-coded correlation matrix heatmap.
   * @param {number[][]} corrMatrix - n×n correlation matrix.
   * @param {string[]}   varNames
   * @param {string}     containerId
   * @param {string}     title
   */
  function correlationMatrix(corrMatrix, varNames, containerId, title) {
    if (!corrMatrix || corrMatrix.length === 0) return;

    const n = corrMatrix.length;

    const el = (typeof containerId === 'string')
      ? document.getElementById(containerId)
      : containerId;
    if (!el) return;
    clearContainer(containerId);

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = '1 / 1';
    const rect = el.getBoundingClientRect();
    const size = Math.min(rect.width || 500, 500);
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const pad = { top: 60, bottom: 60, left: 80, right: 40 };
    const plotSize = size - pad.left - pad.right;
    const cellSize = plotSize / n;

    // Color mapping: -1 (red) -> 0 (white/purple) -> +1 (green/accent)
    function corrColor(v) {
      let r, g, b;
      if (v >= 0) {
        const t = v; // 0..1
        r = Math.round(255 * (1 - t) + 0 * t);
        g = Math.round(255 * (1 - t) + 212 * t);
        b = Math.round(255 * (1 - t) + 170 * t);
      } else {
        const t = -v; // 0..1
        r = Math.round(255 * (1 - t) + 255 * t);
        g = Math.round(255 * (1 - t) + 107 * t);
        b = Math.round(255 * (1 - t) + 107 * t);
      }
      return `rgb(${r},${g},${b})`;
    }

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = `16px ${FONT.family}`;
    ctx.textAlign = 'center';
    ctx.fillText(title || 'Correlation Matrix', size / 2, 22);

    // Cells
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const x = pad.left + c * cellSize;
        const y = pad.top + r * cellSize;
        const val = corrMatrix[r][c];

        ctx.fillStyle = corrColor(val);
        ctx.fillRect(x, y, cellSize, cellSize);

        // Value text
        ctx.fillStyle = Math.abs(val) > 0.6 ? '#fff' : '#1a1a2e';
        ctx.font = `bold ${Math.min(12, cellSize * 0.35)}px ${FONT.family}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toFixed(2), x + cellSize / 2, y + cellSize / 2);
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(pad.left + i * cellSize, pad.top);
      ctx.lineTo(pad.left + i * cellSize, pad.top + plotSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top + i * cellSize);
      ctx.lineTo(pad.left + plotSize, pad.top + i * cellSize);
      ctx.stroke();
    }

    // Row labels
    ctx.fillStyle = COLORS.text;
    ctx.font = `${Math.min(10, cellSize * 0.4)}px ${FONT.family}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < n; r++) {
      const label = varNames[r] || `V${r + 1}`;
      ctx.fillText(label, pad.left - 6, pad.top + (r + 0.5) * cellSize);
    }

    // Col labels (rotated)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c < n; c++) {
      const label = varNames[c] || `V${c + 1}`;
      const x = pad.left + (c + 0.5) * cellSize;
      const y = pad.top + plotSize + 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Color bar (legend)
    const barX = size - 30;
    const barY = pad.top;
    const barH = plotSize;
    const barW = 12;
    for (let i = 0; i <= barH; i++) {
      const v = 1 - (2 * i) / barH; // +1 at top, -1 at bottom
      const c = corrColor(v);
      ctx.fillStyle = c;
      ctx.fillRect(barX, barY + i, barW, 1);
    }
    ctx.strokeStyle = COLORS.grid;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = COLORS.text;
    ctx.font = `9px ${FONT.family}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('+1', barX + barW + 4, barY);
    ctx.fillText(' 0', barX + barW + 4, barY + barH / 2);
    ctx.fillText('-1', barX + barW + 4, barY + barH);
  }

  /* ─── Scree Plot ───────────────────────────────────────────────── */

  /**
   * @param {number[]} eigenvalues
   * @param {string}   containerId
   * @param {string}   title
   */
  function screePlot(eigenvalues, containerId, title) {
    if (!eigenvalues || eigenvalues.length === 0) return;

    const labels = eigenvalues.map((_, i) => `PC${i + 1}`);

    const config = chartDefaults('bar', {
      labels,
      datasets: [
        {
          label: 'Eigenvalue',
          data: eigenvalues,
          backgroundColor: 'rgba(108, 99, 255, 0.6)',
          borderColor: COLORS.primary,
          borderWidth: 1,
        },
        {
          label: 'Cumulative',
          data: (function () {
            let cum = 0;
            const total = eigenvalues.reduce((a, b) => a + b, 0) || 1;
            return eigenvalues.map(v => { cum += v; return (cum / total) * 100; });
          }()),
          type: 'line',
          fill: false,
          borderColor: COLORS.accent,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: COLORS.accent,
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    }, {
      plugins: {
        title: { text: title || 'Scree Plot' },
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Eigenvalue', color: COLORS.text },
        },
        y1: {
          type: 'linear',
          position: 'right',
          min: 0, max: 100,
          title: { display: true, text: 'Cumulative %', color: COLORS.text },
          grid: { drawOnChartArea: false },
          ticks: { color: COLORS.accent, callback: v => v + '%' },
        },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── ROC Curve ────────────────────────────────────────────────── */

  /**
   * @param {number[]} fpr - False positive rates (x-axis).
   * @param {number[]} tpr - True positive rates (y-axis).
   * @param {string}   containerId
   * @param {string}   title
   * @param {number}   [auc] - Area Under Curve value.
   */
  function rocCurve(fpr, tpr, containerId, title, auc) {
    if (!fpr || !tpr || fpr.length === 0) return;

    const datasets = [
      {
        label: 'ROC Curve' + (auc !== undefined ? ` (AUC = ${auc.toFixed(3)})` : ''),
        data: fpr.map((x, i) => ({ x, y: tpr[i] })),
        fill: false,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
        borderWidth: 2.5,
        pointRadius: 1.5,
        tension: 0.3,
        showLine: true,
      },
      {
        label: 'Chance',
        data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        type: 'line',
        fill: false,
        borderColor: COLORS.grid,
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
      },
    ];

    const config = chartDefaults('scatter', { datasets }, {
      plugins: {
        title: { text: title || 'ROC Curve' },
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0, max: 1,
          title: { display: true, text: 'False Positive Rate (1 — Specificity)', color: COLORS.text },
        },
        y: {
          min: 0, max: 1,
          title: { display: true, text: 'True Positive Rate (Sensitivity)', color: COLORS.text },
        },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── Manhattan Plot ───────────────────────────────────────────── */

  /**
   * Genome-wide association-style Manhattan plot.
   * @param {(number|string)[]} chromosomes
   * @param {number[]}          positions
   * @param {number[]}          pValues
   * @param {string}            containerId
   * @param {string}            title
   */
  function manhattanPlot(chromosomes, positions, pValues, containerId, title) {
    if (!chromosomes || !positions || !pValues || pValues.length === 0) return;

    const n = pValues.length;
    const yVals = pValues.map(p => -Math.log10(Math.max(p, 1e-300)));

    // Map chromosomes to numeric if strings
    const chromMap = {};
    let chromIdx = 0;
    const chromNums = chromosomes.map(c => {
      if (chromMap[c] === undefined) chromMap[c] = chromIdx++;
      return chromMap[c];
    });

    // X position: cumulative across chromosomes with gaps
    const gap = 10000000;
    let xOffset = 0;
    const xVals = [];
    let prevChrom = chromNums[0];
    for (let i = 0; i < n; i++) {
      if (i > 0 && chromNums[i] !== prevChrom) {
        xOffset += gap;
        prevChrom = chromNums[i];
      }
      xVals.push(xOffset + positions[i]);
    }

    // Color by chromosome parity
    const palette = [COLORS.primary, COLORS.accent, COLORS.error, COLORS.warn,
                     '#b388ff', '#82b1ff', '#ff8a80', '#b9f6ca'];
    const pointColors = chromNums.map(c => palette[c % palette.length]);

    // Significance line at -log10(5e-8)
    const sigLine = -Math.log10(5e-8);

    const datasets = [
      {
        label: 'SNP p-values',
        data: xVals.map((x, i) => ({ x, y: yVals[i] })),
        backgroundColor: pointColors,
        borderColor: pointColors,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ];

    if (yVals.some(v => v > sigLine * 0.8)) {
      datasets.push({
        label: 'Genome-wide significance (5×10⁻⁸)',
        data: [
          { x: Math.min.apply(null, xVals), y: sigLine },
          { x: Math.max.apply(null, xVals), y: sigLine },
        ],
        type: 'line',
        fill: false,
        borderColor: COLORS.error,
        borderWidth: 1.5,
        borderDash: [8, 4],
        pointRadius: 0,
      });
    }

    // Build chromosome tick positions
    const chromTicks = [];
    const chromLabels = [];
    const chromKeys = Object.keys(chromMap);
    for (let k = 0; k < chromKeys.length; k++) {
      const key = chromKeys[k];
      const idx = chromMap[key];
      // Find midpoint x for this chromosome
      let sumX = 0, count = 0;
      for (let i = 0; i < n; i++) {
        if (chromNums[i] === idx) {
          sumX += xVals[i];
          count++;
        }
      }
      if (count > 0) {
        chromTicks.push(sumX / count);
        chromLabels.push(String(key));
      }
    }

    const config = chartDefaults('scatter', { datasets }, {
      plugins: {
        title: { text: title || 'Manhattan Plot' },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const i = ctx.dataIndex;
              return `Chr ${chromosomes[i]} Pos ${positions[i]} p=${pValues[i].toExponential(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: { display: true, text: 'Chromosome', color: COLORS.text },
          ticks: {
            callback: function (v) {
              // Find closest chromosome label
              let minDist = Infinity, label = '';
              for (let k = 0; k < chromTicks.length; k++) {
                const d = Math.abs(v - chromTicks[k]);
                if (d < minDist) { minDist = d; label = chromLabels[k]; }
              }
              return label;
            },
          },
        },
        y: {
          title: { display: true, text: '−log₁₀(p)', color: COLORS.text },
        },
      },
    });

    renderChart(containerId, config);
  }

  /* ─── Public API ───────────────────────────────────────────────── */

  window.charts = {
    clearContainer,
    histogram,
    scatterPlot,
    barChart,
    boxPlot,
    qqPlot,
    lineChart,
    heatmap,
    pieChart,
    factorLoadingPlot,
    mirt2dPlot,
    irfPlot,
    semPathDiagram,
    correlationMatrix,
    screePlot,
    rocCurve,
    manhattanPlot,
  };

})();
