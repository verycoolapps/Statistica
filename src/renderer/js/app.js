window.app = {};
let _lang = 'en', _data = null, _fileName = '', _currentAnalysis = null;
const _charts = window.charts || {};
const _stats = window.stats || {};

// Get translation
function _t(path) {
  try {
    const obj = window.i18n[_lang];
    return path.split('.').reduce((o,k)=>o?o[k]:undefined, obj) || path;
  } catch(e) { return path; }
}

window.t = _t;

function setLang(l) {
  _lang = l;
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.toggle('active', b.dataset.lang===l));
  updateUI();
}

function updateUI() {
  // Title
  document.getElementById('app-title').textContent = _t('app.title');
  document.getElementById('app-sub').textContent = _t('app.sub');
  // Menu groups
  document.querySelectorAll('.menu-group-header').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.querySelector('.gname').textContent = _t('menu.'+key);
  });
  // Menu items
  document.querySelectorAll('.menu-item').forEach(el => {
    const key = el.dataset.i18n;
    if (key) {
      const icon = el.querySelector('.icon');
      const text = el.childNodes[el.childNodes.length-1];
      const txt = _t('items.'+key);
      if (text) text.textContent = txt;
    }
  });
  // Welcome
  const welc = document.getElementById('welcome-area');
  if (welc && !welc.classList.contains('hidden')) {
    welc.querySelector('h2').textContent = _t('app.title');
    welc.querySelector('p').textContent = _t('desc.about');
    document.querySelectorAll('.step h4').forEach(el => {
      if (el.dataset.i18n) el.textContent = _t('ui.'+el.dataset.i18n);
    });
  }
  // Analysis description
  const descEl = document.getElementById('analysis-desc');
  if (descEl && _currentAnalysis) descEl.textContent = _t('desc.'+_currentAnalysis);
  // Toolbar title
  const tt = document.getElementById('toolbar-title');
  if (tt && _currentAnalysis) tt.textContent = _t('items.'+_currentAnalysis);
  // Footer
  document.querySelector('.sidebar-footer span').textContent = _t('app.copyright');
  // Buttons
  document.querySelectorAll('[data-i18n-btn]').forEach(el => {
    el.textContent = _t('ui.'+el.dataset.i18nBtn);
  });
  // Data panel
  document.querySelectorAll('[data-i18n-dp]').forEach(el => {
    el.textContent = _t('ui.'+el.dataset.i18nDp);
  });
  document.getElementById('data-panel-title').textContent = _t('ui.preview');
}

// Menu structure
const menuStructure = [
  { key:'basic', items:['group-data','single-series','categorical-data','norm-reference','param-estimation','hypothesis-test','sampling'] },
  { key:'psychometric', items:['ctt','content-validity','inter-rater','predictive-validity','usability','irt','g-theory','cdm','cat','equating','standard-setting'] },
  { key:'factor', items:['efa','cfa-single','cfa-bayesian','cfa-multigroup','mtmm-cfa','mimic'] },
  { key:'modeling', items:['correlation','cb-sem','pls-sem','path-analysis','linear-regression','logistic-regression','multilevel-regression'] },
  { key:'compare', items:['gained-score','one-sample-t','paired-t','independent-t','oneway-anova','ancova','twoway-manova'] },
  { key:'ml', items:['pattern-discovery','symptom-network','random-forest'] },
  { key:'dl', items:['id-cdf','neural-icd','ann','svm','mf'] },
  { key:'datagen', items:['monte-carlo'] },
  { key:'about', items:[] }
];

// Build menu
function buildMenu() {
  const container = document.getElementById('sidebar-menu');
  container.innerHTML = '';
  menuStructure.forEach(group => {
    if (group.key === 'about') return; // about is separate
    const gDiv = document.createElement('div');
    gDiv.className = 'menu-group';
    const gHeader = document.createElement('div');
    gHeader.className = 'menu-group-header';
    gHeader.dataset.i18n = group.key;
    gHeader.innerHTML = `<span class="gname">${_t('menu.'+group.key)}</span><span class="arrow">▼</span>`;
    gHeader.addEventListener('click', () => gHeader.classList.toggle('collapsed'));
    const gItems = document.createElement('div');
    gItems.className = 'menu-items';
    group.items.forEach(itemKey => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.dataset.i18n = itemKey;
      item.innerHTML = `<span class="icon">${getIcon(itemKey)}</span>${_t('items.'+itemKey)}`;
      item.addEventListener('click', () => selectAnalysis(itemKey));
      gItems.appendChild(item);
    });
    gDiv.appendChild(gHeader);
    gDiv.appendChild(gItems);
    container.appendChild(gDiv);
  });
  
  // About button
  const aboutDiv = document.createElement('div');
  aboutDiv.className = 'menu-group';
  const aboutItem = document.createElement('div');
  aboutItem.className = 'menu-item';
  aboutItem.innerHTML = '<span class="icon">ℹ️</span>About';
  aboutItem.addEventListener('click', () => showAbout());
  aboutDiv.appendChild(aboutItem);
  container.appendChild(aboutDiv);
}

function getIcon(key) {
  const icons = {
    'group-data':'📊','single-series':'📈','categorical-data':'🏷️','norm-reference':'📏',
    'param-estimation':'🎯','hypothesis-test':'⚖️','sampling':'🎲',
    'ctt':'📐','content-validity':'✅','inter-rater':'🤝','predictive-validity':'🔮',
    'usability':'🖱️','irt':'📉','g-theory':'🌐','cdm':'🧩','cat':'💻','equating':'⚗️',
    'standard-setting':'📋','efa':'🔍','cfa-single':'🔬','cfa-bayesian':'🧠',
    'cfa-multigroup':'👥','mtmm-cfa':'🔄','mimic':'🔗','correlation':'🔗',
    'cb-sem':'🏗️','pls-sem':'📡','path-analysis':'🛤️','linear-regression':'📈',
    'logistic-regression':'🔀','multilevel-regression':'🗂️','gained-score':'📊',
    'one-sample-t':'1️⃣','paired-t':'👫','independent-t':'✌️','oneway-anova':'📊',
    'ancova':'📐','twoway-manova':'🎭','pattern-discovery':'🔎','symptom-network':'🕸️',
    'random-forest':'🌲','id-cdf':'🧬','neural-icd':'🧠','ann':'🔗','svm':'🎯','mf':'🧮',
    'monte-carlo':'🎲'
  };
  return icons[key]||'📋';
}

// Select analysis
function selectAnalysis(key) {
  if (key === 'about') { showAbout(); return; }
  _currentAnalysis = key;
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.menu-item[data-i18n="${key}"]`)?.classList.add('active');
  
  document.getElementById('welcome-area').classList.add('hidden');
  document.getElementById('analysis-view').classList.remove('hidden');
  document.getElementById('toolbar-title').textContent = _t('items.'+key);
  document.getElementById('analysis-desc').textContent = _t('desc.'+key);
  
  // Show data panel
  document.getElementById('data-panel').classList.remove('hidden');
  
  // Build analysis form
  buildAnalysisForm(key);
  showResult('summary', `<p style="color:var(--text2);padding:20px">${_t('ui.no_result')}</p>`);
  showResult('chart', '');
}

function showAbout() {
  _currentAnalysis = null;
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  document.getElementById('welcome-area').classList.add('hidden');
  document.getElementById('analysis-view').classList.remove('hidden');
  document.getElementById('data-panel').classList.add('hidden');
  document.getElementById('toolbar-title').textContent = _t('app.title');
  document.getElementById('analysis-desc').textContent = '';
  document.getElementById('analysis-form').innerHTML = `
    <div class="about-content">
      <h2>Statistica</h2>
      <p>${_t('desc.about')}</p>
      <p style="margin-top:12px">${_t('app.sub')}</p>
      <div class="copyright">${_t('app.copyright')}</div>
      <p style="margin-top:16px;color:var(--text2);font-size:12px">Version 1.0.0</p>
    </div>
  `;
  showResult('summary', '');
  showResult('chart', '');
}

// Build analysis form dynamically
function buildAnalysisForm(key) {
  const form = document.getElementById('analysis-form');
  let html = '<div class="run-section">';
  
  const needsData = ['group-data','single-series','norm-reference','hypothesis-test',
    'one-sample-t','paired-t','independent-t','oneway-anova','ancova','twoway-manova',
    'gained-score','correlation','linear-regression','logistic-regression',
    'multilevel-regression','efa','cfa-single','ctt','irt','categorical-data',
    'sampling','param-estimation'];
  
  if (needsData.includes(key) || !key) {
    html += `<button class="tb-btn" onclick="window.uploadCSV()" data-i18n-btn="upload" style="margin-bottom:12px">📂 ${_t('ui.upload')}</button>`;
    if (!_data) html += `<p style="color:var(--text2);font-size:12px">${_t('ui.no_data')}</p>`;
  }
  
  if (_data && _data.length > 0) {
    const cols = Object.keys(_data[0]);
    const numCols = cols.filter(c => _data.some(r => !isNaN(parseFloat(r[c]))));
    
    switch(key) {
      case 'group-data': case 'single-series': case 'norm-reference': case 'hypothesis-test': {
        const labelX = key==='group-data'?'select_group':'select_var';
        html += variableSelect(cols, numCols, key==='group-data'?2:1, key);
        break;
      }
      case 'one-sample-t': {
        html += variableSelect(cols, numCols, 1, key);
        html += `<div class="var-select"><label>${_t('stats.mean')} H₀ (μ₀)</label><input type="number" id="param-mu" value="0" step="0.01"></div>`;
        break;
      }
      case 'paired-t': {
        const remaining = numCols.filter(c => c);
        html += `<div class="var-select"><label>${_t('ui.var_x')}</label><select id="var-x">${remaining.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        html += `<div class="var-select"><label>${_t('ui.var_y')}</label><select id="var-y">${remaining.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        break;
      }
      case 'independent-t': {
        html += variableSelect(cols, numCols, 1, key);
        const grpCols = cols.filter(c => [...new Set(_data.map(r=>r[c]))].length <= 20);
        html += `<div class="var-select"><label>${_t('ui.group')}</label><select id="var-group">${grpCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        break;
      }
      case 'oneway-anova': case 'ancova': {
        html += variableSelect(cols, numCols, 1, key);
        const grpCols = cols.filter(c => [...new Set(_data.map(r=>r[c]))].length <= 30);
        html += `<div class="var-select"><label>${_t('ui.group')}</label><select id="var-group">${grpCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        break;
      }
      case 'gained-score': {
        const remaining = numCols.filter(c => c);
        html += `<div class="var-select"><label>Pre-test</label><select id="var-pre">${remaining.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        html += `<div class="var-select"><label>Post-test</label><select id="var-post">${remaining.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        break;
      }
      case 'correlation': {
        html += variableSelect(cols, numCols, 3, key, true);
        break;
      }
      case 'linear-regression': case 'logistic-regression': {
        html += `<div class="var-select"><label>${_t('ui.var_y')} (Dependent)</label><select id="var-y">${numCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        html += `<div class="var-select"><label>${_t('ui.var_x')} (Independent, multiple)</label><select id="var-x" multiple>${numCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        break;
      }
      case 'ctt': {
        html += variableSelect(cols, numCols, 3, key, true);
        break;
      }
      case 'irt': {
        const binCols = numCols.filter(c => {
          const vals = _data.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v));
          return vals.length>0 && vals.every(v=>v===0||v===1);
        });
        if (binCols.length<2) binCols.push(...numCols);
        html += variableSelect(cols, [...new Set([...binCols,...numCols])], 3, key, true);
        break;
      }
      case 'categorical-data': {
        html += `<div class="var-select"><label>${_t('ui.var_x')}</label><select id="var-x">${cols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        html += `<div class="var-select"><label>${_t('ui.var_y')}</label><select id="var-y">${cols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        break;
      }
      case 'efa': {
        html += variableSelect(cols, numCols, 3, key, true);
        html += `<div class="var-select"><label>${_t('stats.eigenvalue')} (n Factors)</label><input type="number" id="param-nfactors" value="3" min="1" max="${numCols.length}" step="1"></div>`;
        break;
      }
      case 'monte-carlo': {
        html += `<div class="var-select"><label>Distribution</label><select id="param-dist"><option value="normal">Normal</option><option value="uniform">Uniform</option><option value="binomial">Binomial</option><option value="poisson">Poisson</option><option value="exponential">Exponential</option><option value="beta">Beta</option></select></div>`;
        html += `<div class="var-select"><label>N Simulations</label><input type="number" id="param-nsim" value="1000" min="10" max="100000"></div>`;
        html += `<div class="var-select"><label>Mean (normal) / n (binomial) / rate (exp)</label><input type="text" id="param-p1" value="0"></div>`;
        html += `<div class="var-select"><label>SD (normal) / p (binomial) / min (uniform)</label><input type="text" id="param-p2" value="1"></div>`;
        break;
      }
      case 'twoway-manova': {
        html += variableSelect(cols, numCols, 2, key, true);
        const grpCols = cols.filter(c => [...new Set(_data.map(r=>r[c]))].length <= 20);
        html += `<div class="var-select"><label>${_t('ui.group')} 1</label><select id="var-group1">${grpCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        html += `<div class="var-select"><label>${_t('ui.group')} 2</label><select id="var-group2">${grpCols.filter(g=>g!==grpCols[0]).map(c=>`<option>${c}</option>`).join('')}</select></div>`;
        break;
      }
      default: {
        if (needsData.includes(key)) {
          html += variableSelect(cols, numCols, 1, key);
        } else {
          html += `<p style="color:var(--text2);font-size:12px">Analysis UI coming soon</p>`;
        }
      }
    }
    
    if (key !== 'about') {
      html += `<div style="margin-top:16px"><button class="run-btn" onclick="runAnalysis('${key}')" data-i18n-btn="run">▶ ${_t('ui.run')}</button></div>`;
    }
  }
  
  html += '</div>';
  form.innerHTML = html;
}

function variableSelect(cols, numCols, count, key, multi=false) {
  const label = count===1 ? 'select_var' : 'select_vars';
  if (multi) {
    return `<div class="var-select"><label>${_t('ui.'+label)}</label><select id="vars-select" multiple>${numCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
  }
  if (count === 1) {
    return `<div class="var-select"><label>${_t('ui.'+label)}</label><select id="var-x">${numCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
  }
  let html = '';
  for (let i=0; i<count; i++) {
    html += `<div class="var-select"><label>Variable ${i+1}</label><select id="var-${i}">${numCols.map(c=>`<option>${c}</option>`).join('')}</select></div>`;
  }
  return html;
}

// RUN ANALYSIS
function runAnalysis(key) {
  const btn = document.querySelector('.run-btn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${_t('ui.running')}`;
  
  setTimeout(() => {
    try {
      let result;
      switch(key) {
        case 'group-data': result = runGroupData(); break;
        case 'single-series': result = runSingleSeries(); break;
        case 'norm-reference': result = runNormality(); break;
        case 'one-sample-t': result = runOneSampleT(); break;
        case 'paired-t': result = runPairedT(); break;
        case 'independent-t': result = runIndependentT(); break;
        case 'oneway-anova': result = runOneWayAnova(); break;
        case 'gained-score': result = runGainedScore(); break;
        case 'correlation': result = runCorrelation(); break;
        case 'linear-regression': result = runLinearRegression(); break;
        case 'logistic-regression': result = runLogisticRegression(); break;
        case 'categorical-data': result = runChiSquare(); break;
        case 'ctt': result = runReliability(); break;
        case 'irt': result = runIRT(); break;
        case 'efa': result = runEFA(); break;
        case 'monte-carlo': result = runMonteCarlo(); break;
        case 'hypothesis-test': result = runHypothesisTest(); break;
        default: result = { summary: `Analysis "${key}" output will appear here.`, charts: [] };
      }
      if (result) displayResult(key, result);
    } catch(e) {
      showResult('summary', `<p style="color:var(--danger)">Error: ${e.message}</p>`);
    }
    btn.disabled = false;
    btn.innerHTML = `▶ ${_t('ui.run')}`;
  }, 100);
}

// Data access helpers
function getVarVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}
function getVarVals(id) {
  const el = document.getElementById(id);
  return el ? [...el.selectedOptions].map(o=>o.value) : [];
}

// --- Analysis Runners ---
function runGroupData() {
  const vars = getVarVals('vars-select') || [getVarVal('var-0')||getVarVal('var-x')];
  if (vars.length<2) throw new Error('Select value and group columns');
  const res = _stats.groupData(_data, vars[1], vars[0]);
  let html = `<h3>${_t('items.group-data')}</h3><table><tr><th>Group</th><th>N</th><th>Mean</th><th>Median</th><th>SD</th><th>Var</th><th>Min</th><th>Max</th><th>Skew</th><th>Kurt</th></tr>`;
  res.forEach(r => { html += `<tr><td>${r.name}</td><td>${r.n}</td><td>${r.mean.toFixed(3)}</td><td>${r.median.toFixed(3)}</td><td>${r.sd.toFixed(3)}</td><td>${r.var.toFixed(3)}</td><td>${r.min}</td><td>${r.max}</td><td>${r.skew}</td><td>${r.kurt}</td></tr>`; });
  html += '</table>';
  showResult('summary', html);
  // Charts
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  res.forEach(r => {
    const c = document.createElement('div');
    c.className = 'chart-container';
    c.id = 'chart-box-'+r.name.replace(/[^a-z0-9]/gi,'');
    m.appendChild(c);
    if (_charts.barChart) _charts.barChart([r.name],[r.mean], c.id, `${r.name}: Mean±SD`, [{y:r.sd}]);
  });
  return { summary: html };
}

function runSingleSeries() {
  const col = getVarVal('var-x') || (getVarVals('vars-select')||[])[0];
  if (!col) throw new Error('Select a variable');
  const res = _stats.singleSeries(_data, col);
  let html = `<h3>${_t('items.single-series')}: ${col}</h3><table><tr>`;
  ['count','sum','mean','median','sd','variance','min','max','range','q1','q3','skew','kurtosis'].forEach(k => {
    html += `<th>${_t('stats.'+k)}</th>`;
  });
  html += `</tr><tr>`;
  ['n','sum','mean','median','sd','var','min','max','range','q1','q3','skew','kurtosis'].forEach(k => {
    html += `<td>${typeof res[k]==='number'?res[k].toFixed(3):res[k]}</td>`;
  });
  html += '</tr></table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const histContainer = document.createElement('div');
  histContainer.className = 'chart-container'; histContainer.id = 'chart-hist';
  m.appendChild(histContainer);
  if (_charts.histogram) _charts.histogram(res.data, Math.ceil(Math.sqrt(res.n)), 'chart-hist', col);
  return { summary: html };
}

function runNormality() {
  const col = getVarVal('var-x') || (getVarVals('vars-select')||[])[0];
  if (!col) throw new Error('Select a variable');
  const res = _stats.normality(_data, col);
  let html = `<h3>${_t('items.norm-reference')}: ${col}</h3>`;
  html += `<table><tr><th>Test</th><th>Statistic</th><th>p-value</th><th>${_t('stats.sig')}</th></tr>`;
  html += `<tr><td>Shapiro-Wilk</td><td>${res.swStat}</td><td>${res.swP}</td><td class="${res.swSig?'sig':'ns'}">${res.swSig?'✓ '+_t('stats.ns'):'✗ '+_t('stats.ns')}</td></tr>`;
  html += `<tr><td>Kolmogorov-Smirnov</td><td>${res.ksStat}</td><td>${res.ksP}</td><td class="${res.ksSig?'sig':'ns'}">${res.ksSig?'✓ '+_t('stats.ns'):'✗ '+_t('stats.ns')}</td></tr>`;
  html += '</table>';
  if (res.swP < 0.05) html += `<p style="color:var(--warning);font-size:12px">⚠ Data tidak berdistribusi normal (p<0.05)</p>`;
  else html += `<p style="color:var(--success);font-size:12px">✓ Data berdistribusi normal (p≥0.05)</p>`;
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c1 = document.createElement('div'); c1.className='chart-container'; c1.id='chart-qq';
  const c2 = document.createElement('div'); c2.className='chart-container'; c2.id='chart-hist2';
  m.appendChild(c1); m.appendChild(c2);
  if (_charts.qqPlot) _charts.qqPlot(res.data, 'chart-qq', `Q-Q Plot: ${col}`);
  if (_charts.histogram) _charts.histogram(res.data, Math.ceil(Math.sqrt(res.data.length)), 'chart-hist2', `Histogram: ${col}`);
  return { summary: html };
}

function runOneSampleT() {
  const col = getVarVal('var-x') || (getVarVals('vars-select')||[])[0];
  const mu = parseFloat(document.getElementById('param-mu')?.value || 0);
  if (!col) throw new Error('Select a variable');
  const res = _stats.oneSampleT(_data, col, mu);
  let html = `<h3>${_t('items.one-sample-t')}: ${col} vs μ₀=${mu}</h3>`;
  html += `<table><tr><th>t</th><th>df</th><th>p-value</th><th>Mean</th><th>SE</th><th>Cohen's d</th><th>95% CI</th><th>${_t('stats.sig')}</th></tr>`;
  html += `<tr><td>${res.t}</td><td>${res.df}</td><td>${res.p}</td><td>${res.mean.toFixed(3)}</td><td>${res.se}</td><td>${res.d}</td><td>[${res.ci[0]}, ${res.ci[1]}]</td><td class="${res.sig?'sig':'ns'}">${res.sig?'✓ '+_t('stats.sig'):'✗ '+_t('stats.ns')}</td></tr>`;
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-ts';
  m.appendChild(c);
  if (_charts.barChart) _charts.barChart([col, 'H₀: μ='+mu], [res.mean, mu], 'chart-ts', 'Mean Comparison', [{y:res.se}]);
  return { summary: html };
}

function runPairedT() {
  const c1 = getVarVal('var-x'), c2 = getVarVal('var-y');
  if (!c1||!c2) throw new Error('Select both variables');
  const res = _stats.pairedT(_data, c1, c2);
  let html = `<h3>${_t('items.paired-t')}: ${c1} vs ${c2}</h3>`;
  html += `<table><tr><th>n</th><th>Mean₁</th><th>Mean₂</th><th>Diff</th><th>t</th><th>df</th><th>p</th><th>d</th><th>${_t('stats.sig')}</th></tr>`;
  html += `<tr><td>${res.n}</td><td>${res.m1}</td><td>${res.m2}</td><td>${res.diff}</td><td>${res.t}</td><td>${res.df}</td><td>${res.p}</td><td>${res.d}</td><td class="${res.sig?'sig':'ns'}">${res.sig?'✓ '+_t('stats.sig'):'✗ '+_t('stats.ns')}</td></tr>`;
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-paired';
  m.appendChild(c);
  if (_charts.barChart) _charts.barChart([c1, c2], [res.m1, res.m2], 'chart-paired', 'Paired Comparison', [{y:res.m1>res.m2?res.se*Math.sqrt(2):res.se}]);
  return { summary: html };
}

function runIndependentT() {
  const col = getVarVal('var-x') || (getVarVals('vars-select')||[])[0];
  const grp = getVarVal('var-group');
  if (!col||!grp) throw new Error('Select variable and group');
  const vals = [...new Set(_data.map(r=>r[grp]))];
  const g1 = vals[0], g2 = vals[1];
  if (!g1||!g2) throw new Error('Group needs 2+ categories');
  const res = _stats.independentT(_data, col, grp, g1, g2);
  let html = `<h3>${_t('items.independent-t')}: ${col} by ${grp}</h3>`;
  html += `<p style="font-size:12px;color:var(--text2)">${g1} (n=${res.data1.length}) vs ${g2} (n=${res.data2.length})</p>`;
  html += `<table><tr><th>t</th><th>df</th><th>p</th><th>d</th><th>Levene F</th><th>Levene p</th><th>${_t('stats.sig')}</th></tr>`;
  html += `<tr><td>${res.t}</td><td>${res.df}</td><td>${res.p}</td><td>${res.d}</td><td>${res.leveneF}</td><td>${res.leveneP}</td><td class="${res.sig?'sig':'ns'}">${res.sig?'✓':'✗'}</td></tr>`;
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-indt';
  m.appendChild(c);
  if (_charts.barChart) _charts.barChart([g1, g2], [res.m1, res.m2], 'chart-indt', `${col} by Group`, [{y:Math.sqrt(variance(res.data1)/res.data1.length + variance(res.data2)/res.data2.length)}]);
  return { summary: html };
}

function runOneWayAnova() {
  const col = getVarVal('var-x') || (getVarVals('vars-select')||[])[0];
  const grp = getVarVal('var-group');
  if (!col||!grp) throw new Error('Select variable and group');
  const res = _stats.oneWayAnova(_data, col, grp);
  let html = `<h3>${_t('items.oneway-anova')}: ${col} by ${grp}</h3>`;
  html += `<table><tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p</th></tr>`;
  html += `<tr><td>Between</td><td>${res.ssb}</td><td>${res.dfb}</td><td>${res.msb}</td><td rowspan="2">${res.f}</td><td rowspan="2">${res.p} ${res.sig?'*':''}</td></tr>`;
  html += `<tr><td>Within</td><td>${res.ssw}</td><td>${res.dfw}</td><td>${res.msw}</td></tr>`;
  html += `<tr><td>Total</td><td>${(res.ssb+res.ssw).toFixed(3)}</td><td>${res.dfb+res.dfw}</td><td></td><td></td><td></td></tr>`;
  html += '</table>';
  html += `<p style="font-size:12px">η² = ${res.etaSq} | Grand Mean = ${res.grandMean}</p>`;
  if (res.posthoc.length > 0) {
    html += `<h4>Post-hoc (Tukey)</h4><table><tr><th>Pair</th><th>Diff</th><th>p</th><th>Sig</th></tr>`;
    res.posthoc.forEach(p => { html += `<tr><td>${p.g1} vs ${p.g2}</td><td>${p.diff}</td><td>${p.p}</td><td class="${p.sig?'sig':'ns'}">${p.sig?'*':''}</td></tr>`; });
    html += '</table>';
  }
  // Means table
  html += `<h4>Group Means</h4><table><tr><th>Group</th><th>N</th><th>Mean</th><th>SD</th></tr>`;
  res.groups.forEach(([name, vals]) => { html += `<tr><td>${name}</td><td>${vals.length}</td><td>${mean(vals).toFixed(3)}</td><td>${sd(vals).toFixed(3)}</td></tr>`; });
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-anova';
  m.appendChild(c);
  const names = res.groups.map(([n])=>n);
  const means = res.groups.map(([_,v])=>mean(v));
  const sds = res.groups.map(([_,v])=>sd(v));
  if (_charts.barChart) _charts.barChart(names, means, 'chart-anova', `${col} by ${grp}`, sds.map(s=>({y:s})));
  return { summary: html };
}

function runGainedScore() {
  const pre = getVarVal('var-pre'), post = getVarVal('var-post');
  if (!pre||!post) throw new Error('Select pre and post');
  const res = _stats.gainedScore(_data, pre, post);
  let html = `<h3>${_t('items.gained-score')}: ${pre} → ${post}</h3>`;
  html += `<table><tr><th>N-Gain</th><th>Category</th><th>Pre Mean</th><th>Post Mean</th><th>N</th></tr>`;
  html += `<tr><td>${res.nGain}</td><td>${res.nGainCat}</td><td>${res.preMean}</td><td>${res.postMean}</td><td>${res.n}</td></tr>`;  
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-gain';
  m.appendChild(c);
  if (_charts.lineChart) _charts.lineChart(['Pre','Post'], [{label:res.nGainCat, data:[res.preMean, res.postMean], borderColor:'#6c63ff'}], 'chart-gain', 'Pre-Post Comparison');
  return { summary: html };
}

function runCorrelation() {
  const cols = getVarVals('vars-select');
  if (cols.length < 2) throw new Error('Select 2+ variables');
  const res = _stats.correlation(_data, cols);
  let html = `<h3>${_t('items.correlation')}</h3>`;
  html += `<table><tr><th></th>${res.names.map(n=>`<th>${n}</th>`).join('')}</tr>`;
  res.matrix.forEach((row,i) => {
    html += `<tr><th>${res.names[i]}</th>`;
    row.forEach((v,j) => {
      const sig = res.pvalues[i][j] < 0.05;
      html += `<td style="color:${Math.abs(v)>0.7?'var(--accent)':Math.abs(v)>0.4?'var(--primary)':'var(--text2)'}">${v}${sig?'*':''}</td>`;
    });
    html += '</tr>';
  });
  html += '</table>';
  html += `<p style="font-size:11px;color:var(--text2)">* p<0.05 | n=${res.n}</p>`;
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-cormat';
  m.appendChild(c);
  if (_charts.correlationMatrix) _charts.correlationMatrix(res.matrix, res.names, 'chart-cormat', 'Correlation Matrix');
  // Scatter for first two
  if (res.names.length === 2) {
    const sc = document.createElement('div'); sc.className='chart-container'; sc.id='chart-scatter';
    m.appendChild(sc);
    if (_charts.scatterPlot) _charts.scatterPlot(res.data[0], res.data[1], 'chart-scatter', `${res.names[0]} vs ${res.names[1]}`, true);
  }
  return { summary: html };
}

function runLinearRegression() {
  const y = getVarVal('var-y'), xCols = getVarVals('var-x');
  if (!y || xCols.length===0) throw new Error('Select Y and X variables');
  const res = _stats.linearRegression(_data, y, xCols);
  let html = `<h3>${_t('items.linear-regression')}</h3>`;
  html += `<table><tr><th>Variable</th><th>Coef</th><th>SE</th><th>t</th><th>p</th><th>Sig</th></tr>`;
  res.coefs.forEach(c => { html += `<tr><td>${c.name}</td><td>${c.coef}</td><td>${c.se}</td><td>${c.t}</td><td>${c.p}</td><td class="${c.sig?'sig':'ns'}">${c.sig?'*':''}</td></tr>`; });
  html += '</table>';
  html += `<p style="font-size:12px">R² = ${res.rsq} | Adj R² = ${res.adjRsq} | F(${res.k},${res.n-res.k-1}) = ${res.fStat}, p = ${res.fPval} | MSE = ${res.mse}</p>`;
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-reg';
  m.appendChild(c);
  if (_charts.scatterPlot) _charts.scatterPlot(res.yHat, res.resid, 'chart-reg', 'Fitted vs Residuals', false);
  return { summary: html };
}

function runLogisticRegression() {
  const y = getVarVal('var-y'), xCols = getVarVals('var-x');
  if (!y || xCols.length===0) throw new Error('Select Y and X variables');
  const res = _stats.logisticRegression(_data, y, xCols);
  let html = `<h3>${_t('items.logistic-regression')}</h3>`;
  html += `<table><tr><th>Variable</th><th>Coef</th><th>Odds Ratio</th></tr>`;
  res.coefs.forEach(c => { html += `<tr><td>${c.name}</td><td>${c.coef}</td><td>${c.or}</td></tr>`; });
  html += '</table>';
  html += `<p style="font-size:12px">Accuracy = ${res.accuracy} | N = ${res.n}</p>`;
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-logit';
  m.appendChild(c);
  if (_charts.rocCurve && res.pi) {
    const fpr=[0], tpr=[0];
    const sorted = res.pi.map((p,i)=>({p,y:res.yv[i]})).sort((a,b)=>b.p-a.p);
    let tp=0,fp=0,tn=sorted.filter(s=>s.y===0).length, fn=sorted.filter(s=>s.y===1).length;
    sorted.forEach(s=>{ if(s.y===1){tp++;fn--}else{fp++;tn--} fpr.push(fp/(fp+tn)); tpr.push(tp/(tp+fn)); });
    _charts.rocCurve(fpr, tpr, 'chart-logit', 'ROC Curve', res.accuracy);
  }
  return { summary: html };
}

function runChiSquare() {
  const c1 = getVarVal('var-x'), c2 = getVarVal('var-y');
  if (!c1||!c2) throw new Error('Select two categorical variables');
  const res = _stats.chiSquare(_data, c1, c2);
  let html = `<h3>${_t('items.categorical-data')}: ${c1} × ${c2}</h3>`;
  html += `<table><tr><th>χ²</th><th>df</th><th>p</th><th>Cramer's V</th><th>${_t('stats.sig')}</th></tr>`;
  html += `<tr><td>${res.chisq}</td><td>${res.df}</td><td>${res.p}</td><td>${res.cramerV}</td><td class="${res.sig?'sig':'ns'}">${res.sig?'✓':'✗'}</td></tr>`;
  html += '</table>';
  // Observed table
  html += `<h4>Observed</h4><table><tr><th></th>${res.cats2.map(c=>`<th>${c}</th>`).join('')}</tr>`;
  res.observed.forEach((row,i) => { html += `<tr><th>${res.cats1[i]}</th>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`; });
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const ch = document.createElement('div'); ch.className='chart-container'; ch.id='chart-chi';
  m.appendChild(ch);
  if (_charts.heatmap) _charts.heatmap(res.observed, res.cats1, res.cats2, 'chart-chi', 'Observed Frequencies');
  return { summary: html };
}

function runReliability() {
  const cols = getVarVals('vars-select');
  if (cols.length < 2) throw new Error('Select 2+ items');
  const res = _stats.cronbachAlpha(_data, cols);
  let html = `<h3>${_t('items.ctt')} — ${_t('stats.alpha_cronbach')}</h3>`;
  html += `<table><tr><th>Alpha</th><th>Items (k)</th><th>N</th><th>Var Total</th><th>Var Sum</th></tr>`;
  html += `<tr><td style="font-size:20px;font-weight:700;color:${res.alpha>=0.7?'var(--success)':res.alpha>=0.5?'var(--warning)':'var(--danger)'}">${res.alpha}</td><td>${res.k}</td><td>${res.n}</td><td>${res.varTotal.toFixed(3)}</td><td>${res.varSum.toFixed(3)}</td></tr>`;
  html += '</table>';
  html += `<p style="font-size:12px;margin-top:8px">Interpretasi: ${res.alpha>=0.9?'Excellent':res.alpha>=0.8?'Good':res.alpha>=0.7?'Acceptable':res.alpha>=0.6?'Questionable':res.alpha>=0.5?'Poor':'Unacceptable'}</p>`;
  showResult('summary', html);
  return { summary: html };
}

function runIRT() {
  const cols = getVarVals('vars-select');
  if (cols.length < 2) throw new Error('Select 2+ items');
  const res = _stats.irt2pl(_data, cols);
  let html = `<h3>${_t('items.irt')} — 2PL Model</h3>`;
  html += `<table><tr><th>Item</th><th>a (Discrimination)</th><th>b (Difficulty)</th><th>p(Correct)</th></tr>`;
  res.itemParams.forEach(r => { html += `<tr><td>${r.item}</td><td>${r.a}</td><td>${r.b}</td><td>${r.pCorrect}</td></tr>`; });
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  // IRF curves
  const irfC = document.createElement('div'); irfC.className='chart-container'; irfC.id='chart-irf';
  m.appendChild(irfC);
  if (_charts.irfPlot) {
    const datasets = res.itemParams.map((ip,i)=>({label:ip.item, data:res.irf[i], borderColor: ['#6c63ff','#00d4aa','#ff6b6b','#ffd93d','#6bcb77'][i%5]}));
    _charts.irfPlot(res.theta, datasets, 'chart-irf', 'Item Response Functions');
  }
  // TIF
  const tifC = document.createElement('div'); tifC.className='chart-container'; tifC.id='chart-tif';
  m.appendChild(tifC);
  if (_charts.lineChart) _charts.lineChart(res.theta, [{label:'TIF', data:res.tif, borderColor:'#6c63ff'}], 'chart-tif', 'Test Information Function');
  // MIRT 2D
  if (res.itemParams.length >= 3) {
    const mirtRes = _stats.mirt2d(_data, cols);
    const mirtC = document.createElement('div'); mirtC.className='chart-container'; mirtC.id='chart-mirt';
    m.appendChild(mirtC);
    if (_charts.mirt2dPlot) _charts.mirt2dPlot(mirtRes.theta1, mirtRes.theta2, mirtRes.probSurface, 'chart-mirt', 'MIRT 2D - Probability Surface');
  }
  return { summary: html };
}

function runEFA() {
  const cols = getVarVals('vars-select');
  const nf = parseInt(document.getElementById('param-nfactors')?.value || 3);
  if (cols.length < 2) throw new Error('Select 2+ variables');
  const res = _stats.efa(_data, cols, nf);
  let html = `<h3>${_t('items.efa')}</h3>`;
  html += `<h4>Eigenvalues</h4><table><tr><th>Factor</th>${res.eigenvalues.map((_,i)=>`<th>F${i+1}</th>`).join('')}</tr>`;
  html += `<tr><td>Eigenvalue</td>${res.eigenvalues.map(v=>`<td>${v}</td>`).join('')}</tr></table>`;
  html += `<p style="font-size:12px">Total variance explained: ${(res.explained*100).toFixed(1)}% by ${nf} factors</p>`;
  html += `<h4>Factor Loadings</h4><table><tr><th>Variable</th>${Array.from({length:nf},(_,i)=>`<th>F${i+1}</th>`).join('')}<th>Communality</th></tr>`;
  res.loadings.forEach((row,i) => {
    html += `<tr><td>${res.names[i]}</td>${row.map(v=>`<td style="color:${Math.abs(v)>0.4?'var(--accent)':'var(--text2)'}">${v}</td>`).join('')}<td>${res.communalities[i]}</td></tr>`;
  });
  html += '</table>';
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const sc = document.createElement('div'); sc.className='chart-container'; sc.id='chart-scree';
  m.appendChild(sc);
  if (_charts.screePlot) _charts.screePlot(res.eigenvalues, 'chart-scree', 'Scree Plot');
  if (nf >= 2) {
    const fc = document.createElement('div'); fc.className='chart-container'; fc.id='chart-fload';
    m.appendChild(fc);
    if (_charts.factorLoadingPlot) _charts.factorLoadingPlot(res.loadings.map(l=>[l[0],l[1]]), res.names, 'chart-fload', 'Factor Loading Plot (F1 vs F2)');
  }
  return { summary: html };
}

function runMonteCarlo() {
  const dist = document.getElementById('param-dist')?.value || 'normal';
  const n = parseInt(document.getElementById('param-nsim')?.value || 1000);
  const p1 = parseFloat(document.getElementById('param-p1')?.value || 0);
  const p2 = parseFloat(document.getElementById('param-p2')?.value || 1);
  const params = dist==='normal'?{mean:p1,sd:p2}:
    dist==='uniform'?{min:p1,max:p2}:
    dist==='binomial'?{n:p1,p:p2}:
    dist==='poisson'?{lambda:p1}:
    dist==='exponential'?{rate:p1}:
    dist==='beta'?{alpha:p1,beta:p2}:{};
  const res = _stats.monteCarlo(n, dist, params);
  let html = `<h3>${_t('items.monte-carlo')}: ${dist}</h3>`;
  html += `<table><tr><th>N</th><th>Mean</th><th>SD</th></tr>`;
  html += `<tr><td>${res.n}</td><td>${res.mean.toFixed(4)}</td><td>${res.sd.toFixed(4)}</td></tr></table>`;
  showResult('summary', html);
  const m = document.getElementById('chart-output');
  m.innerHTML = '';
  const c = document.createElement('div'); c.className='chart-container'; c.id='chart-mc';
  m.appendChild(c);
  if (_charts.histogram) _charts.histogram(res.data, Math.min(50, Math.floor(Math.sqrt(n))), 'chart-mc', `Monte Carlo: ${dist}`);
  return { summary: html };
}

function runHypothesisTest() {
  const col = getVarVal('var-x') || (getVarVals('vars-select')||[])[0];
  if (!col) throw new Error('Select a variable');
  const res = _stats.oneSampleT(_data, col, 0);
  let html = `<h3>${_t('items.hypothesis-test')}: ${col}</h3>`;
  html += `<table><tr><th>t</th><th>df</th><th>p</th><th>Mean</th><th>95% CI</th></tr>`;
  html += `<tr><td>${res.t}</td><td>${res.df}</td><td>${res.p}</td><td>${res.mean.toFixed(3)}</td><td>[${res.ci[0]}, ${res.ci[1]}]</td></tr>`;
  html += '</table>';
  html += `<p>H₀: μ = 0 | H₁: μ ≠ 0</p>`;
  html += `<p style="font-size:14px;font-weight:600;color:${res.sig?'var(--success)':'var(--text2)'}">${res.sig?'✓ Reject H₀ — mean significantly differs from 0':'✗ Fail to reject H₀'}</p>`;
  showResult('summary', html);
  return { summary: html };
}

// Display results
function showResult(tab, content) {
  if (tab === 'summary') {
    document.getElementById('result-summary').innerHTML = content;
  } else if (tab === 'chart') {
    document.getElementById('chart-output').innerHTML = content;
  }
}

function switchResultTab(tab) {
  document.querySelectorAll('.result-tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
  document.getElementById('result-summary').style.display = tab==='summary'?'block':'none';
  document.getElementById('result-chart').style.display = tab==='chart'?'block':'none';
}

function displayResult(key, res) {
  // Charts are rendered by run functions now
}

// CSV Upload
function handleCSV(text, fileName) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV needs header + data rows');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g,''));
  const data = [];
  for (let i=1; i<lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g,''));
    if (vals.length === headers.length && vals.some(v=>v)) {
      const row = {};
      headers.forEach((h, j) => row[h] = vals[j] || '');
      data.push(row);
    }
  }
  _data = data;
  _fileName = fileName;
  document.getElementById('data-info').innerHTML = `${headers.length} ${_t('ui.cols')}, ${_data.length} ${_t('ui.rows')} | ${fileName}`;
  
  // Show table preview
  let tbl = '<div class="table-preview"><table><tr>';
  headers.slice(0,8).forEach(h => tbl += `<th>${h}</th>`);
  tbl += '</tr>';
  data.slice(0,10).forEach(r => {
    tbl += '<tr>';
    headers.slice(0,8).forEach(h => tbl += `<td>${(r[h]||'').toString().slice(0,15)}</td>`);
    tbl += '</tr>';
  });
  tbl += '</table>';
  if (data.length > 10) tbl += `<p style="font-size:11px;color:var(--text2)">... ${data.length-10} more rows</p>`;
  tbl += '</div>';
  document.getElementById('data-preview').innerHTML = tbl;
  
  // Rebuild form for current analysis
  if (_currentAnalysis) buildAnalysisForm(_currentAnalysis);
}

window.uploadCSV = function() {
  if (window.electronAPI) {
    window.electronAPI.openFile().then(res => {
      if (res) handleCSV(res.content, res.path.split('/').pop());
    });
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => handleCSV(ev.target.result, file.name);
        reader.readAsText(file);
      }
    };
    input.click();
  }
};

// Export functions
window.exportAll = function() {
  const summary = document.getElementById('result-summary');
  const charts = document.getElementById('chart-output');
  alert('Export functionality: Save individual charts via right-click context menu. Full ZIP export coming in v1.1');
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  buildMenu();
  // Lang buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  setLang('en');
  // File drop
  const dz = document.getElementById('drop-zone');
  if (dz) {
    dz.addEventListener('click', window.uploadCSV);
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (ev) => handleCSV(ev.target.result, file.name);
        reader.readAsText(file);
      }
    });
  }
  // Export button
  document.getElementById('btn-export')?.addEventListener('click', window.exportAll);
  // Tab switching
  document.querySelectorAll('.result-tab').forEach(tab => {
    tab.addEventListener('click', () => switchResultTab(tab.dataset.tab));
  });
  // Hide splash
  setTimeout(() => document.getElementById('splash')?.classList.add('hidden'), 1500);
  // Close data panel
  document.getElementById('close-data-panel')?.addEventListener('click', () => {
    document.getElementById('data-panel').classList.add('hidden');
  });
});
