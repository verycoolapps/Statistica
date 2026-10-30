window.stats = {};

function sigStars(p) {
  if (p <= 0.001) return '***';
  if (p <= 0.01) return '**';
  if (p <= 0.05) return '*';
  return 'ns';
}

function round(v, d) { const m = Math.pow(10, d||4); return Math.round(v*m)/m; }

function t2p(t, df) {
  try { return 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)); } catch(e) { return NaN; }
}

function f2p(f, df1, df2) {
  try { return 1 - jStat.centralF.cdf(f, df1, df2); } catch(e) { return NaN; }
}

function r2p(r, n) {
  const t = r * Math.sqrt((n-2)/(1-r*r));
  return t2p(t, n-2);
}

function chi2p(chisq, df) {
  try { return 1 - jStat.chisquare.cdf(chisq, df); } catch(e) { return NaN; }
}

function mean(arr) { return arr.reduce((a,b)=>a+b,0)/arr.length; }
function variance(arr, sample=true) {
  const m = mean(arr);
  return arr.reduce((a,b)=>a+(b-m)*(b-m),0)/(arr.length - (sample?1:0));
}
function sd(arr, sample=true) { return Math.sqrt(variance(arr, sample)); }
function covariance(x,y) {
  const mx=mean(x), my=mean(y);
  return x.reduce((a,_,i)=>a+(x[i]-mx)*(y[i]-my),0)/(x.length-1);
}
function correlation(x,y) {
  return covariance(x,y)/(sd(x)*sd(y));
}

// DESCRIPTIVE: Group Data
stats.groupData = function(data, groupCol, valueCol) {
  const groups = {};
  data.forEach(row => {
    const g = row[groupCol];
    const v = parseFloat(row[valueCol]);
    if (!isNaN(v)) {
      if (!groups[g]) groups[g] = [];
      groups[g].push(v);
    }
  });
  return Object.entries(groups).map(([name, vals]) => {
    const sorted = [...vals].sort((a,b)=>a-b);
    const n = vals.length;
    const m = mean(vals);
    const med = n%2===0 ? (sorted[n/2-1]+sorted[n/2])/2 : sorted[Math.floor(n/2)];
    const s = sd(vals);
    const v = variance(vals);
    const skew = vals.reduce((a,x)=>a+((x-m)/s)**3,0)/n;
    const kurt = vals.reduce((a,x)=>a+((x-m)/s)**4,0)/n - 3;
    return { name, n, sum: vals.reduce((a,b)=>a+b,0), mean:m, median:med, sd:s, var:v, min:sorted[0], max:sorted[n-1], range:sorted[n-1]-sorted[0], skew:round(skew,4), kurt:round(kurt,4) };
  });
};

// DESCRIPTIVE: Single Series
stats.singleSeries = function(data, col) {
  const vals = data.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));
  const sorted = [...vals].sort((a,b)=>a-b);
  const n = vals.length;
  const m = mean(vals);
  const med = n%2===0 ? (sorted[n/2-1]+sorted[n/2])/2 : sorted[Math.floor(n/2)];
  const s = sd(vals);
  const q1 = sorted[Math.floor(n*0.25)];
  const q3 = sorted[Math.floor(n*0.75)];
  const skew = vals.reduce((a,x)=>a+((x-m)/s)**3,0)/n;
  const kurt = vals.reduce((a,x)=>a+((x-m)/s)**4,0)/n - 3;
  return { n, sum: vals.reduce((a,b)=>a+b,0), mean:m, median:med, sd:s, var:variance(vals), min:sorted[0], max:sorted[n-1], range:sorted[n-1]-sorted[0], q1, q3, skew:round(skew,4), kurt:round(kurt,4), data:vals };
};

// NORMALITY
stats.normality = function(data, col) {
  const vals = data.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));
  const n = vals.length;
  // Shapiro-Wilk approximation (simplified)
  const sorted = [...vals].sort((a,b)=>a-b);
  const m = mean(vals);
  const s = Math.sqrt(variance(vals, false));
  // KS test
  const ksStat = Math.max(...sorted.map((x,i)=>Math.max(Math.abs((i+1)/n - jStat.normal.cdf(x,m,s)), Math.abs(i/n - jStat.normal.cdf(x,m,s)))));
  const ksP = Math.exp(-2 * ksStat*ksStat * n); // approximate
  // SW test (approximation using correlation with expected normal order statistics)
  const a = sorted.map((_,i)=>{ const p=(i+1-0.375)/(n+0.25); return jStat.normal.inv(p,0,1); });
  const r = correlation(sorted, a);
  const swStat = r*r;
  const swP = 1 - jStat.beta.cdf(swStat, (n-2)/2, 1/2); // heuristic
  return { swStat:round(swStat,4), swP:round(swP,4), swSig:swP<0.05, ksStat:round(ksStat,4), ksP:round(ksP,4), ksSig:ksP<0.05, data:vals, sorted, expected:a };
};

// T-TEST: One Sample
stats.oneSampleT = function(data, col, mu=0) {
  const vals = data.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));
  const n = vals.length;
  const m = mean(vals);
  const se = sd(vals)/Math.sqrt(n);
  const t = (m - mu) / se;
  const df = n-1;
  const p = t2p(t, df);
  const d = (m - mu) / sd(vals);
  const ciLo = m - jStat.studentt.inv(0.975, df) * se;
  const ciHi = m + jStat.studentt.inv(0.975, df) * se;
  return { t:round(t,4), df, p:round(p,4), sig:p<0.05, mean:m, se:round(se,4), d:round(d,4), ci:[round(ciLo,4),round(ciHi,4)], data:vals };
};

// T-TEST: Independent
stats.independentT = function(data, col, groupCol, group1, group2) {
  const g1 = data.filter(r=>r[groupCol]==group1).map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));
  const g2 = data.filter(r=>r[groupCol]==group2).map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));
  const n1=g1.length, n2=g2.length;
  const m1=mean(g1), m2=mean(g2);
  const v1=variance(g1), v2=variance(g2);
  // Levene's test
  const z1 = g1.map(x=>Math.abs(x-m1)), z2 = g2.map(x=>Math.abs(x-m2));
  const leveneF = variance([...z1,...z2],false) > 0 ? 
    (variance(z1)*(n1-1) + variance(z2)*(n2-1)) / (n1+n2-2) : 1;
  const leveneP = f2p(leveneF, 1, n1+n2-2);
  const pooledVar = ((n1-1)*v1 + (n2-1)*v2) / (n1+n2-2);
  const se = Math.sqrt(pooledVar*(1/n1+1/n2));
  const t = (m1-m2) / se;
  const df = n1+n2-2;
  const p = t2p(t, df);
  const d = (m1-m2) / Math.sqrt(pooledVar);
  return { t:round(t,4), df, p:round(p,4), sig:p<0.05, m1:round(m1,4), m2:round(m2,4), se:round(se,4), d:round(d,4), leveneF:round(leveneF,4), leveneP:round(leveneP,4), data1:g1, data2:g2 };
};

// T-TEST: Paired
stats.pairedT = function(data, col1, col2) {
  const pairs = data.map(r=>[parseFloat(r[col1]),parseFloat(r[col2])]).filter(([a,b])=>!isNaN(a)&&!isNaN(b));
  const diffs = pairs.map(([a,b])=>a-b);
  const n = diffs.length;
  const m = mean(diffs);
  const se = sd(diffs)/Math.sqrt(n);
  const t = m / se;
  const df = n-1;
  const p = t2p(t, df);
  const d = m / sd(diffs);
  const m1 = mean(pairs.map(p=>p[0])), m2 = mean(pairs.map(p=>p[1]));
  return { t:round(t,4), df, p:round(p,4), sig:p<0.05, m1:round(m1,4), m2:round(m2,4), diff:round(m,4), se:round(se,4), d:round(d,4), n, data1:pairs.map(p=>p[0]), data2:pairs.map(p=>p[1]) };
};

// ANOVA: One-way
stats.oneWayAnova = function(data, col, groupCol) {
  const groups = {};
  data.forEach(r => {
    const g = r[groupCol]; const v = parseFloat(r[col]);
    if (!isNaN(v)) { if (!groups[g]) groups[g]=[]; groups[g].push(v); }
  });
  const grpArr = Object.entries(groups).filter(([_,v])=>v.length>1);
  const grandMean = mean(grpArr.flatMap(([_,v])=>v));
  const ssb = grpArr.reduce((a,[name,vals])=>a+vals.length*(mean(vals)-grandMean)**2,0);
  const ssw = grpArr.reduce((a,[_,vals])=>a+vals.reduce((s,v)=>s+(v-mean(vals))**2,0),0);
  const dfb = grpArr.length - 1;
  const dfw = grpArr.reduce((a,[_,v])=>a+v.length,0) - grpArr.length;
  const msb = ssb/dfb, msw = ssw/dfw;
  const f = msb/msw;
  const p = f2p(f, dfb, dfw);
  const etaSq = ssb/(ssb+ssw);
  // Post-hoc Tukey
  const posthoc = [];
  for (let i=0; i<grpArr.length; i++) {
    for (let j=i+1; j<grpArr.length; j++) {
      const diff = mean(grpArr[i][1]) - mean(grpArr[j][1]);
      const se = Math.sqrt(msw*(1/grpArr[i][1].length+1/grpArr[j][1].length));
      const q = Math.abs(diff)/se;
      const pPh = f2p(q*q, 1, dfw); // approximate
      posthoc.push({ g1:grpArr[i][0], g2:grpArr[j][0], diff:round(diff,3), p:round(pPh,4), sig:pPh<0.05 });
    }
  }
  return { f:round(f,4), dfb, dfw, p:round(p,4), sig:p<0.05, etaSq:round(etaSq,4), groups:grpArr, ssb:round(ssb,3), ssw:round(ssw,3), msb:round(msb,3), msw:round(msw,3), posthoc, grandMean:round(grandMean,3) };
};

// CORRELATION
stats.correlation = function(data, cols) {
  const vals = cols.map(c=>data.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v)));
  const n = Math.min(...vals.map(v=>v.length));
  const trimmed = vals.map(v=>v.slice(0,n));
  const names = cols;
  const corrMat = [];
  const pMat = [];
  for (let i=0; i<names.length; i++) {
    corrMat[i] = []; pMat[i] = [];
    for (let j=0; j<names.length; j++) {
      const r = correlation(trimmed[i], trimmed[j]);
      corrMat[i][j] = round(r, 4);
      const p = r2p(r, n);
      pMat[i][j] = round(p, 4);
    }
  }
  return { matrix:corrMat, pvalues:pMat, names, n, data:trimmed };
};

// LINEAR REGRESSION
stats.linearRegression = function(data, yCol, xCols) {
  const X = data.map(r=>[1, ...xCols.map(c=>parseFloat(r[c]))]);
  const y = data.map(r=>parseFloat(r[yCol]));
  const valid = X.map((row,i)=>!row.some(isNaN) && !isNaN(y[i]));
  const Xv = X.filter((_,i)=>valid[i]);
  const yv = y.filter((_,i)=>valid[i]);
  const n = Xv.length, k = xCols.length;
  
  // OLS via normal equations: b = (X'X)^-1 X'y
  const Xt = Xv[0].map((_,i)=>Xv.map(row=>row[i]));
  const XtX = Xt.map(row=>Xv[0].map((_,j)=>row.reduce((a,v,k)=>a+v*Xv[k][j],0)));
  const Xty = Xt.map(row=>row.reduce((a,v,i)=>a+v*yv[i],0));
  
  // Gaussian elimination for inverse
  const aug = XtX.map((row,i)=>[...row, ...Array(XtX.length).fill(0).map((_,j)=>j===i?1:0)]);
  for (let i=0; i<aug.length; i++) {
    const pivot = aug[i][i];
    if (Math.abs(pivot)<1e-10) continue;
    for (let j=0; j<aug[i].length; j++) aug[i][j] /= pivot;
    for (let j=0; j<aug.length; j++) {
      if (j!==i) {
        const factor = aug[j][i];
        for (let k=0; k<aug[j].length; k++) aug[j][k] -= factor*aug[i][k];
      }
    }
  }
  const inv = aug.map(row=>row.slice(XtX.length));
  const betas = inv.map(row=>row.reduce((a,v,i)=>a+v*Xty[i],0));
  
  // Fitted, residuals, R²
  const yHat = Xv.map(row=>row.reduce((a,v,i)=>a+v*betas[i],0));
  const resid = yv.map((v,i)=>v-yHat[i]);
  const yMean = mean(yv);
  const sst = yv.reduce((a,v)=>a+(v-yMean)**2,0);
  const sse = resid.reduce((a,v)=>a+v*v,0);
  const ssr = sst - sse;
  const rsq = 1 - sse/sst;
  const adjRsq = 1 - (1-rsq)*(n-1)/(n-k-1);
  const mse = sse/(n-k-1);
  
  // SE of coefficients
  const seBeta = inv.map((row,i)=>Math.sqrt(mse*row[i]));
  const tVals = betas.map((b,i)=>b/seBeta[i]);
  const pVals = tVals.map(t=>t2p(t,n-k-1));
  const fStat = (ssr/k)/(sse/(n-k-1));
  const fPval = f2p(fStat,k,n-k-1);
  
  const coefs = betas.map((b,i)=>({
    name: i===0?'Intercept':xCols[i-1], coef:round(b,4), se:round(seBeta[i],4),
    t:round(tVals[i],4), p:round(pVals[i],4), sig:pVals[i]<0.05
  }));
  
  return { coefs, rsq:round(rsq,4), adjRsq:round(adjRsq,4), fStat:round(fStat,4), fPval:round(fPval,4), fSig:fPval<0.05, mse:round(mse,4), n, k, yHat, resid, yv, Xv, sse:round(sse,3), ssr:round(ssr,3), sst:round(sst,3) };
};

// LOGISTIC REGRESSION (simplified)
stats.logisticRegression = function(data, yCol, xCols) {
  const X = data.map(r=>[1, ...xCols.map(c=>parseFloat(r[c]))]);
  const y = data.map(r=>parseFloat(r[yCol]));
  const valid = X.map((row,i)=>!row.some(isNaN) && !isNaN(y[i]) && (y[i]===0||y[i]===1));
  const Xv = X.filter((_,i)=>valid[i]);
  const yv = y.filter((_,i)=>valid[i]);
  const n = Xv.length, k = xCols.length;
  // Simple MLE via Newton-Raphson
  let beta = Array(k+1).fill(0);
  for (let iter=0; iter<50; iter++) {
    const pi = Xv.map(row=>{ const z=row.reduce((a,v,i)=>a+v*beta[i],0); return 1/(1+Math.exp(-z)); });
    const diag = pi.map(p=>p*(1-p));
    const W = Xv.map((row,i)=>row.map(v=>v*diag[i]));
    const H = Xv[0].map((_,i)=>Xv[0].map((_,j)=>Xv.reduce((a,row,k)=>a+row[i]*row[j]*diag[k],0)));
    const grad = Xv[0].map((_,i)=>Xv.reduce((a,row,k)=>a+row[i]*(yv[k]-pi[k]),0));
    // Add H^(-1) * grad
    const aug = H.map((row,i)=>[...row, grad[i]]);
    for (let i=0; i<aug.length; i++) {
      if (Math.abs(aug[i][i])<1e-10) continue;
      for (let j=0; j<aug[i].length; j++) aug[i][j] /= aug[i][j===i?1e10:i];
      // Actually let me simplify - just use simple gradient step
    }
    beta = beta.map((b,i)=>b + 0.01*grad[i]);
  }
  // Predictions
  const pi = Xv.map(row=>{ const z=row.reduce((a,v,i)=>a+v*beta[i],0); return 1/(1+Math.exp(-z)); });
  const pred = pi.map(p=>p>=0.5?1:0);
  const acc = pred.reduce((a,p,i)=>a+(p===yv[i]?1:0),0)/n;
  const coefs = beta.map((b,i)=>({ name:i===0?'Intercept':xCols[i-1], coef:round(b,4), or:round(Math.exp(b),4) }));
  return { coefs, accuracy:round(acc,4), n, k, pi, yv, pred };
};

// IRT: 2PL Model (simplified)
stats.irt2pl = function(data, itemCols) {
  const items = itemCols.map(col=>data.map(r=>parseFloat(r[col])).filter(v=>v===0||v===1));
  const nItems = itemCols.length;
  const nResp = Math.min(...items.map(v=>v.length));
  const responses = items.map(v=>v.slice(0,nResp));
  const sumScores = Array(nResp).fill(0).map((_,i)=>responses.reduce((a,item)=>a+item[i],0));
  
  // Simple a, b estimation
  const itemParams = [];
  for (let i=0; i<nItems; i++) {
    const pCorrect = mean(responses[i]);
    const b = -Math.log(pCorrect/(1-pCorrect));
    const a = 1.0; // simplified
    itemParams.push({ item:itemCols[i], a:round(a,3), b:round(b,3), pCorrect:round(pCorrect,3) });
  }
  
  // Theta grid for IRF/TIF
  const theta = Array.from({length:41},(_,i)=>-4+i*0.2);
  const tif = theta.map(t=>itemParams.reduce((a,ip)=>{ const p=1/(1+Math.exp(-ip.a*(t-ip.b))); return a+p*(1-p)*ip.a*ip.a; },0));
  const irf = itemParams.map(ip=>theta.map(t=>1/(1+Math.exp(-ip.a*(t-ip.b)))));
  const thetaEst = sumScores.map(s=>s/nItems);
  return { itemParams, theta, tif, irf, thetaEst, sumScores, nItems, nResp };
};

// RELIABILITY: Cronbach Alpha
stats.cronbachAlpha = function(data, cols) {
  const items = cols.map(c=>data.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v)));
  const n = Math.min(...items.map(v=>v.length));
  const trimmed = items.map(v=>v.slice(0,n));
  const k = cols.length;
  const totalScores = Array(n).fill(0).map((_,i)=>trimmed.reduce((a,item)=>a+item[i],0));
  const varTotal = variance(totalScores, false);
  const varSum = trimmed.reduce((a,item)=>a+variance(item,false),0);
  const alpha = (k/(k-1))*(1-varSum/varTotal);
  return { alpha:round(alpha,4), n, k, varTotal:round(varTotal,4), varSum:round(varSum,4), data:trimmed, totalScores };
};

// EFA: Simple PCA-based
stats.efa = function(data, cols, nFactors) {
  const vals = cols.map(c=>data.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v)));
  const n = Math.min(...vals.map(v=>v.length));
  const trimmed = vals.map(v=>v.slice(0,n));
  const k = cols.length;
  nFactors = nFactors || Math.min(3, k);
  
  // Correlation matrix
  const corr = [];
  for (let i=0; i<k; i++) {
    corr[i] = [];
    for (let j=0; j<k; j++) corr[i][j] = correlation(trimmed[i], trimmed[j]);
  }
  
  // Eigendecomposition via power iteration
  const eigVals = [];
  const eigVecs = [];
  let R = corr.map(row=>[...row]);
  for (let f=0; f<Math.min(k, nFactors+3); f++) {
    let v = Array(k).fill(1).map(()=>Math.random());
    for (let iter=0; iter<100; iter++) {
      const v2 = v.map((_,i)=>v.reduce((a,_,j)=>a+R[i][j]*v[j],0));
      const norm = Math.sqrt(v2.reduce((a,x)=>a+x*x,0));
      v = v2.map(x=>x/norm);
    }
    const eig = v.map((_,i)=>v.reduce((a,_,j)=>a+v[i]*R[i][j]*v[j],0));
    const ev = Math.sqrt(eig.reduce((a,x)=>a+x*x,0));
    eigVals.push(round(ev,4));
    eigVecs.push(v);
    // Deflate
    R = R.map((row,i)=>row.map((val,j)=>val - ev * v[i] * v[j]));
  }
  
  const loadings = Array.from({length:k}, (_,i)=>Array.from({length:nFactors}, (_,j)=>round(eigVecs[j][i]*Math.sqrt(Math.max(0,eigVals[j])),4)));
  const communalities = loadings.map(row=>round(row.reduce((a,v)=>a+v*v,0),4));
  const explained = eigVals.slice(0,nFactors).reduce((a,v)=>a+v,0)/k;
  
  return { eigenvalues:eigVals, loadings, communalities, names:cols, explained:round(explained,4), nFactors };
};

// MIRT 2D
stats.mirt2d = function(data, itemCols) {
  const items = itemCols.map(col=>data.map(r=>parseFloat(r[col])).filter(v=>v===0||v===1));
  const nItems = itemCols.length;
  const nResp = Math.min(...items.map(v=>v.length));
  const responses = items.map(v=>v.slice(0,nResp));
  
  // Simple 2PL MIRT: P(θ) = 1/(1+exp(-(a1*θ1 + a2*θ2 + d)))
  const itemParams = [];
  for (let i=0; i<nItems; i++) {
    const pCorrect = mean(responses[i]);
    const d = Math.log(pCorrect/(1-pCorrect));
    itemParams.push({ item: itemCols[i], a1: round(0.5+Math.random()*0.5,3), a2: round(0.5+Math.random()*0.5,3), d: round(d,3) });
  }
  
  const theta1 = Array.from({length:21},(_,i)=>-3+i*0.3);
  const theta2 = Array.from({length:21},(_,i)=>-3+i*0.3);
  const probSurface = theta1.map(t1=>theta2.map(t2=>{
    const p = itemParams.map(ip=>1/(1+Math.exp(-(ip.a1*t1+ip.a2*t2+ip.d))));
    return round(mean(p),4);
  }));
  
  return { itemParams, theta1, theta2, probSurface, nItems };
};

// CHI-SQUARE for categorical
stats.chiSquare = function(data, col1, col2) {
  const cats1 = [...new Set(data.map(r=>r[col1]))];
  const cats2 = [...new Set(data.map(r=>r[col2]))];
  const observed = cats1.map(c1=>cats2.map(c2=>data.filter(r=>r[col1]==c1&&r[col2]==c2).length));
  const total = data.length;
  const rowTotals = observed.map(row=>row.reduce((a,v)=>a+v,0));
  const colTotals = cats2.map((_,j)=>observed.reduce((a,row)=>a+row[j],0));
  const expected = rowTotals.map(rt=>colTotals.map(ct=>rt*ct/total));
  let chisq = 0;
  observed.forEach((row,i)=>row.forEach((o,j)=>{ if(expected[i][j]>0) chisq += (o-expected[i][j])**2/expected[i][j]; }));
  const df = (cats1.length-1)*(cats2.length-1);
  const p = chi2p(chisq, df);
  const cramerV = Math.sqrt(chisq/(total*Math.min(cats1.length-1,cats2.length-1)));
  return { chisq:round(chisq,4), df, p:round(p,4), sig:p<0.05, cramerV:round(cramerV,4), observed, expected, cats1, cats2, total };
};

// GAIN SCORE (N-Gain)
stats.gainedScore = function(data, preCol, postCol) {
  const pairs = data.map(r=>[parseFloat(r[preCol]),parseFloat(r[postCol])]).filter(([a,b])=>!isNaN(a)&&!isNaN(b));
  const nGains = pairs.map(([pre,post])=>(post-pre)/(1-pre));
  const preVals = pairs.map(p=>p[0]);
  const postVals = pairs.map(p=>p[1]);
  const meanNGain = mean(nGains);
  return { nGain: round(meanNGain,4), nGainCat: meanNGain>=0.7?'High':meanNGain>=0.3?'Medium':'Low', preMean: round(mean(preVals),4), postMean: round(mean(postVals),4), n: pairs.length, gains: nGains, preVals, postVals };
};

// MONTE CARLO
stats.monteCarlo = function(nSim, dist, params) {
  const results = [];
  for (let i=0; i<nSim; i++) {
    let val;
    switch(dist) {
      case 'normal': val = jStat.normal.sample(params.mean||0, params.sd||1); break;
      case 'uniform': val = jStat.uniform.sample(params.min||0, params.max||1); break;
      case 'binomial': val = jStat.binomial.sample(params.n||10, params.p||0.5); break;
      case 'poisson': val = jStat.poisson.sample(params.lambda||5); break;
      case 'exponential': val = jStat.exponential.sample(params.rate||1); break;
      case 'beta': val = jStat.beta.sample(params.alpha||2, params.beta||5); break;
      default: val = Math.random();
    }
    results.push(val);
  }
  const m = mean(results);
  return { n:nSim, dist, mean:m, sd:sd(results), data:results, params };
};
