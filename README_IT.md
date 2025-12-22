# Contribution Graph Viewer

[🇮🇹 Italiano](README_IT.md) | [🇬🇧 English](README.md)

Un'applicazione web che visualizza il grafico dei contributi (commit) simile a quello mostrato nei profili GitHub. L'app legge i file CSV dalla cartella `commits/`, aggrega i dati durante il build, e genera un grafico interattivo con heatmap dei contributi per ogni anno.

**🌐 Completamente statico** - Funziona perfettamente su GitHub Pages senza necessità di server backend!

## Caratteristiche

- 📊 Grafico interattivo dei contributi per anno
- 🎨 Heatmap con 5 livelli di intensità (dal grigio al verde scuro)
- 📁 Supporto multi-file CSV dalla cartella `commits/`
- 🖥️ Interfaccia responsive
- 🚀 Costruito con React, TypeScript, e Vite
- ⚡ Deployment automatico su GitHub Pages via GitHub Actions
- 🐍 Script Python per estrarre commit da repository Git

## Quick Start

### 1. Estrai i dati da repository Git

```bash
# Estrai commit da uno o più repository
python3 extract_commits.py --search ~/projects --output ./commits
```

### 2. Build e test locale

```bash
yarn install
yarn build
yarn preview  # Preview la build statica
```

### 3. Deploy automatico

Semplicemente fai il push su GitHub e le GitHub Actions buildano e deployano automaticamente:

```bash
git add .
git commit -m "Update commit data"
git push
```

L'app sarà disponibile su: `https://marcosilvestroni.github.io/summarize-commits/`

## Installazione

```bash
yarn install
```

## Avvio dello sviluppo

```bash
yarn dev
```

Questo comando avvia:

- **Server backend** su `http://localhost:5000` (opzionale, per test con API)
- **Vite dev server** su `http://localhost:5173` (interfaccia web con hot reload)

L'app caricherà i dati prima dal file `commits-data.json` (statico), poi dall'API se disponibile.

### Alternative:

- `yarn dev:vite` - Avvia solo il dev server Vite (senza API backend)
- `yarn dev:server` - Avvia solo il server Express backend
- `yarn generate` - Rigenera solo il file `public/commits-data.json` dai CSV

## Build per produzione

```bash
yarn build
```

Questo comando:

1. Genera i dati aggregati dei commit dal file CSV → `public/commits-data.json`
2. Compila TypeScript
3. Esegue il build Vite per creare una build statica
4. Il file JSON viene incluso nella build finale

**Nota:** Il file `public/commits-data.json` viene generato automaticamente durante il build e contiene l'aggregazione di tutti i commit dai file CSV nella cartella `commits/`.

## Come funziona il deployment su GitHub Pages

L'applicazione è completamente statica e non richiede un server backend:

1. **Durante il build** (`yarn build`):
   - Lo script `scripts/generate-commits-data.js` legge tutti i CSV da `commits/`
   - Aggrega i dati e genera `public/commits-data.json`
2. **Deployment automatico** via GitHub Actions:

   - Checkout del codice
   - Install dipendenze
   - Esecuzione di `yarn build` (che genera i dati)
   - Upload della cartella `dist/` a GitHub Pages

3. **A runtime** nel browser:
   - L'app fetchanel file `commits-data.json` dalla cartella pubblica
   - Mostra il grafico con i dati aggregati

## Estrazione automatica dei commit da repository Git

Il progetto include uno script Python (`extract_commits.py`) che estrae automaticamente i commit da repository Git e genera i file CSV.

### Prerequisiti

- Python 3.6+
- Git installato e disponibile nel PATH

### Utilizzo

#### 1. Estrarre da repository nella cartella corrente:

```bash
python3 extract_commits.py
```

#### 2. Estrarre da uno specifico repository:

```bash
python3 extract_commits.py --repo /path/to/repository
```

#### 3. Cercare e estrarre da tutti i repository in una directory:

```bash
python3 extract_commits.py --search /path/to/search
```

#### 4. Personalizzare la cartella di output:

```bash
python3 extract_commits.py --output ./my_commits --search /path/to/repos
```

### Opzioni disponibili

- `--output, -o <dir>` - Directory di output per i file CSV (default: `./commits`)
- `--repo, -r <path>` - Estrarre da uno specifico repository
- `--search, -s <path>` - Directory in cui cercare repository Git
- `--all, -a` - Cercare ricorsivamente in sottodirectory

### Esempio: Estrarre commit da più repository locali

```bash
# Dalla cartella radice del progetto:
python3 extract_commits.py --search ~/projects --output ./commits
```

Lo script genererà file CSV con formato:

```
Date,Timestamp,Author,Email,Hash,Subject,Additions,Deletions
2025-07-07,2025-07-07T12:49:55+02:00,Marco Silvestroni,email@example.com,abc123...,commit message,10,5
```

## Formato dei file CSV

I file CSV nella cartella `commits/` devono contenere almeno una colonna `Date` nel formato `YYYY-MM-DD`.

Esempio:

```
Date,Timestamp,Author,Subject
2025-07-07,2025-07-07T12:49:55+02:00,Marco Silvestroni,feat: enhance EngineModalMapping
2025-07-07,2025-07-07T11:41:37+02:00,Marco Silvestroni,Merge branch 'bo/feature/FormTable-edit-mode-feature'
```

## API

### Endpoints disponibili (durante lo sviluppo)

#### GET `/api/commits`

Ritorna l'aggregazione dei contributi per data da tutti i file CSV.

Risposta:

```json
[
  {
    "date": "2025-07-07",
    "count": 11,
    "projects": ["LEASYS", "NPT"]
  },
  {
    "date": "2025-07-06",
    "count": 9,
    "projects": ["DTX"]
  }
]
```

**Nota:** Questo endpoint è disponibile solo durante lo sviluppo. Su GitHub Pages, i dati vengono serviti dal file statico `commits-data.json`.

## Struttura del progetto

```
.
├── commits/                    # File CSV dei contributi
├── public/
│   └── commits-data.json      # Dati aggregati (generato al build)
├── scripts/
│   └── generate-commits-data.js # Script per aggregare CSV → JSON
├── src/
│   ├── components/
│   │   └── ContributionGraph.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── extract_commits.py         # Script Python per estrarre commit da Git
├── server.ts                  # Server Express backend (solo development)
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## Colori della heatmap

- **Grigio** (#ebedf0): Nessun contributo
- **Verde chiaro** (#c6e48b): 1-2 contributi
- **Verde medio** (#7bc96f): 3-5 contributi
- **Verde scuro** (#239a3b): 6-10 contributi
- **Verde molto scuro** (#196127): 11+ contributi

## Tecnologie utilizzate

- **React 19** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **csv-parse** - Parser CSV
- **Node.js** - Script di generazione dati
- **GitHub Pages** - Hosting statico
- **GitHub Actions** - CI/CD

## Troubleshooting

### "Cannot load commits data" su GitHub Pages

Verifica che:

1. I file CSV siano nella cartella `commits/`
2. Hai eseguito `yarn build` localmente per generare `public/commits-data.json`
3. Il file `commits-data.json` sia stato committato su GitHub (o viene generato durante le Actions)

### I dati non si aggiornano dopo nuovo push

I dati vengono generati durante il build. Assicurati che:

1. I CSV aggiornati siano nella cartella `commits/`
2. Hai committato i CSV su GitHub
3. Le GitHub Actions completano con successo

Per ricostruire localmente:

```bash
# Aggiorna CSV
python3 extract_commits.py --repo /path/to/repo

# Rigenera dati
yarn generate

# Verifica il risultato
cat public/commits-data.json
```
