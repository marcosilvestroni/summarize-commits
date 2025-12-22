# Contribution Graph Viewer

Un'applicazione web che visualizza il grafico dei contributi (commit) simile a quello mostrato nei profili GitHub. L'app legge i file CSV dalla cartella `commits/` e genera un grafico interattivo con heatmap dei contributi per ogni anno.

## Caratteristiche

- 📊 Grafico interattivo dei contributi per anno
- 🎨 Heatmap con 5 livelli di intensità (dal grigio al verde scuro)
- 📁 Supporto multi-file CSV dalla cartella `commits/`
- 🖥️ Interfaccia responsive
- 🚀 Costruito con React, TypeScript, e Vite

## Installazione

```bash
yarn install
```

## Avvio dello sviluppo

```bash
yarn dev
```

Questo comando avvia:
- **Server backend** su `http://localhost:5000` (legge i file CSV)
- **Vite dev server** su `http://localhost:5173` (interfaccia web)

### Alternative:
- `yarn dev:server` - Avvia solo il server backend
- `yarn dev:vite` - Avvia solo il Vite dev server

## Build per produzione

```bash
yarn build
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

### GET `/api/commits`

Ritorna l'aggregazione dei contributi per data da tutti i file CSV.

Risposta:
```json
[
  ["2025-07-07", 11],
  ["2025-07-06", 9],
  ...
]
```

## Struttura del progetto

```
.
├── commits/                    # File CSV dei contributi
├── src/
│   ├── components/
│   │   └── ContributionGraph.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server.ts                  # Server Express backend
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
- **Express** - Server backend
- **csv-parse** - Parser CSV
