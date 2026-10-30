# Contributing to Statistica / Berkontribusi ke Statistica

> **EN** | [Bahasa Indonesia ↓](#bahasa-indonesia)

---

## English

We love contributions! Here's how to get started:

### Setup

```bash
git clone https://github.com/verycoolapps/Statistica.git
cd Statistica
npm install
npm start
```

### Project Structure

```
Statistica/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Context bridge
│   └── renderer/
│       ├── index.html       # App shell
│       ├── css/style.css    # All styles
│       └── js/
│           ├── i18n.js      # Bilingual strings (ID/EN)
│           ├── stats.js     # Statistical engine
│           ├── charts.js    # Chart rendering
│           └── app.js       # UI orchestrator
├── docs/                    # Documentation
└── .github/workflows/       # CI/CD
```

### Adding a New Analysis

1. Add translation strings to `src/renderer/js/i18n.js` (both `id` and `en` blocks)
2. Add the analysis key to the `menuStructure` array in `src/renderer/js/app.js`
3. Implement the computation function in `src/renderer/js/stats.js`
4. Add chart rendering in `src/renderer/js/charts.js`
5. Wire it in `app.js` `runAnalysis()` switch

### Pull Request Guidelines

- Keep PR focused on one feature/fix
- Test with both `id` and `en` language modes
- Include sample CSV data in the PR description if adding a new analysis
- No breaking changes to existing analysis functions

### Reporting Bugs

Open an issue with:
- OS and version
- Steps to reproduce
- Expected vs actual behavior
- Sample CSV (anonymized) if relevant

---

## Bahasa Indonesia

Kami menyambut kontribusi! Berikut cara memulai:

### Setup

```bash
git clone https://github.com/verycoolapps/Statistica.git
cd Statistica
npm install
npm start
```

### Struktur Proyek

```
Statistica/
├── src/
│   ├── main.js              # Proses utama Electron
│   ├── preload.js           # Context bridge
│   └── renderer/
│       ├── index.html       # Shell aplikasi
│       ├── css/style.css    # Semua gaya
│       └── js/
│           ├── i18n.js      # String bilingual (ID/EN)
│           ├── stats.js     # Engine statistik
│           ├── charts.js    # Render chart
│           └── app.js       # Orkestrator UI
├── docs/                    # Dokumentasi
└── .github/workflows/       # CI/CD
```

### Menambahkan Analisis Baru

1. Tambahkan string terjemahan di `src/renderer/js/i18n.js` (blok `id` dan `en`)
2. Tambahkan kunci analisis ke array `menuStructure` di `src/renderer/js/app.js`
3. Implementasikan fungsi komputasi di `src/renderer/js/stats.js`
4. Tambahkan render chart di `src/renderer/js/charts.js`
5. Hubungkan di `app.js` dalam switch `runAnalysis()`

### Panduan Pull Request

- PR fokus pada satu fitur/perbaikan
- Uji dengan mode bahasa `id` dan `en`
- Sertakan data CSV sampel dalam deskripsi PR jika menambah analisis baru
- Tidak ada perubahan yang merusak fungsi analisis yang sudah ada

### Melaporkan Bug

Buka issue dengan:
- OS dan versi
- Langkah reproduksi
- Perilaku yang diharapkan vs aktual
- CSV sampel (anonim) jika relevan
