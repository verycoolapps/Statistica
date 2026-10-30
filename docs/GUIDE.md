# 📊 Statistica — Panduan Lengkap / Complete Guide

> **Bahasa Indonesia** | [English below ↓](#english-guide)

---

## 🇮🇩 Panduan Bahasa Indonesia

### Fitur Lengkap

#### 1. Statistik Dasar
| Analisis | Output |
|---|---|
| Data Grup | Mean, SD, Median, Varians, Skewness, Kurtosis |
| Seri Tunggal | Distribusi frekuensi, Kuartil, Rentang |
| Data Kategorikal | Chi-Kuadrat, Cramer's V, Tabel Kontingensi |
| Referensi Norma | Shapiro-Wilk, KS, Q-Q Plot |
| Estimasi Parameter | CI untuk Mean, Proporsi, Varians |
| Uji Hipotesis | Uji-z, Uji-t, Uji Proporsi |
| Sampling | Random, Stratified, Perhitungan Ukuran Sampel |

#### 2. Psikometri
| Analisis | Output |
|---|---|
| CTT | Alpha Cronbach, Split-Half, SEM, Analisis Item |
| Validitas Isi | CVR, CVI, Aiken's V |
| Reliabilitas Antar-Rater | Cohen's Kappa, Fleiss' Kappa, ICC |
| Validitas Prediktif | Korelasi, AUC, Regresi |
| Usabilitas | SUS Score, UEQ, Task Completion Rate |
| IRT | Rasch 1PL, 2PL, 3PL, MIRT 2D |
| Teori-G | G-Study, D-Study |
| CDM | DINA, DINO, G-DINA |
| CAT | Adaptive Testing, Seleksi Item Bayesian |
| Equating | Linear, Equipercentile, IRT Equating |
| Penentuan Standar | Angoff, Bookmark, Borderline Group |

#### 3. Analisis Faktor
- EFA: PCA/PAF, Varimax/Oblimin, Scree Plot
- CFA: Model satu faktor, multi-grup, Bayesian
- MTMM-CFA, Model MIMIC

#### 4. Pemodelan
- Korelasi (Pearson, Spearman, Point-Biserial)
- CB-SEM, PLS-SEM
- Analisis Jalur
- Regresi Linear, Logistik, Multilevel

#### 5. Perbandingan Mean
- Skor Gain, Uji-t (satu sampel, berpasangan, independen)
- ANOVA Satu Arah, ANCOVA, ANOVA Dua Arah & MANOVA

#### 6. Machine Learning
- Penemuan Pola, Jaringan Gejala, Random Forest

#### 7. Deep Learning
- ANN, SVM, Matrix Factorization, Neural ICD

#### 8. Generasi Data
- Simulasi Monte Carlo

### Cara Penggunaan

1. **Buka aplikasi** → `npm start`
2. **Upload CSV** → Seret/lepas file CSV ke zona upload
3. **Pilih analisis** dari menu sidebar kiri
4. **Pilih variabel** yang ingin dianalisis
5. **Lihat hasil** di tab Hasil (tabel) dan Chart (visualisasi)
6. **Export** → Tombol 📦 untuk export semua hasil sebagai ZIP

### Format Data CSV

```csv
id,skor,gender,usia,nilai_pre,nilai_post
1,85,L,20,70,88
2,92,P,21,75,94
3,78,L,22,68,81
```

- Header baris pertama (wajib)
- Pemisah: koma atau titik koma
- Nilai kosong dibolehkan (dihilangkan dari analisis)

---

## English Guide

### Feature Overview

#### 1. Basic Statistics
| Analysis | Output |
|---|---|
| Group Data | Mean, SD, Median, Variance, Skewness, Kurtosis |
| Single Series | Frequency distribution, Quartiles, Range |
| Categorical Data | Chi-Square, Cramer's V, Contingency Table |
| Norm Reference | Shapiro-Wilk, KS, Q-Q Plot |
| Parameter Estimation | CI for Mean, Proportion, Variance |
| Hypothesis Testing | z-test, t-test, Proportion test |
| Sampling | Random, Stratified, Sample size calculation |

#### 2. Psychometrics
| Analysis | Output |
|---|---|
| CTT | Cronbach's Alpha, Split-Half, SEM, Item Analysis |
| Content Validity | CVR, CVI, Aiken's V |
| Inter-Rater Reliability | Cohen's Kappa, Fleiss' Kappa, ICC |
| Predictive Validity | Correlation, AUC, Regression |
| Usability | SUS Score, UEQ, Task Completion Rate |
| IRT | Rasch 1PL, 2PL, 3PL, MIRT 2D |
| G-Theory | G-Study, D-Study |
| CDM | DINA, DINO, G-DINA |
| CAT | Adaptive Testing, Bayesian Item Selection |
| Equating | Linear, Equipercentile, IRT Equating |
| Standard Setting | Angoff, Bookmark, Borderline Group |

#### 3. Factor Analysis
- EFA: PCA/PAF, Varimax/Oblimin, Scree Plot
- CFA: Single factor, multi-group, Bayesian
- MTMM-CFA, MIMIC Model

#### 4. Modeling
- Correlation (Pearson, Spearman, Point-Biserial)
- CB-SEM, PLS-SEM
- Path Analysis
- Linear, Logistic, Multilevel Regression

#### 5. Mean Comparison
- Gain Score, t-tests (one-sample, paired, independent)
- One-way ANOVA, ANCOVA, Two-way ANOVA & MANOVA

#### 6. Machine Learning
- Pattern Discovery, Symptom Network, Random Forest

#### 7. Deep Learning
- ANN, SVM, Matrix Factorization, Neural ICD

#### 8. Data Generation
- Monte Carlo Simulation

### How to Use

1. **Open app** → `npm start`
2. **Upload CSV** → Drag & drop CSV file onto upload zone
3. **Choose analysis** from left sidebar menu
4. **Select variables** to analyze
5. **View results** in Results tab (tables) and Chart tab (visualizations)
6. **Export** → 📦 button to export all results as ZIP

### CSV Data Format

```csv
id,score,gender,age,pre_score,post_score
1,85,M,20,70,88
2,92,F,21,75,94
3,78,M,22,68,81
```

- First row must be header
- Separator: comma or semicolon
- Empty values allowed (excluded from analysis)
