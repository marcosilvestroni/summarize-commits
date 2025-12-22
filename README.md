# Contribution Graph Viewer

[🇮🇹 Italiano](README_IT.md) | [🇬🇧 English](README.md)

A web application that displays a contribution graph (commits) similar to the one shown in GitHub profiles. The app reads CSV files from the `commits/` folder, aggregates the data during build time, and generates an interactive graph with contribution heatmap for each year.

**🌐 Fully Static** - Works perfectly on GitHub Pages without needing a backend server!

## Features

- 📊 Interactive contribution graph per year
- 🎨 Heatmap with 5 intensity levels (from gray to dark green)
- 📁 Multi-file CSV support from the `commits/` folder
- 🖥️ Responsive interface
- 🚀 Built with React, TypeScript, and Vite
- ⚡ Automatic deployment to GitHub Pages via GitHub Actions
- 🐍 Python script to extract commits from Git repositories

## Quick Start

### 1. Extract data from Git repositories

```bash
# Extract commits from one or more repositories
python3 extract_commits.py --search ~/projects --output ./commits
```

### 2. Build and test locally

```bash
yarn install
yarn build
yarn preview  # Preview the static build
```

### 3. Automatic deployment

Simply push to GitHub and GitHub Actions will automatically build and deploy:

```bash
git add .
git commit -m "Update commit data"
git push
```

The app will be available at: `https://marcosilvestroni.github.io/summarize-commits/`

## Installation

```bash
yarn install
```

## Development

```bash
yarn dev
```

This command starts:

- **Backend server** on `http://localhost:5000` (optional, for API testing)
- **Vite dev server** on `http://localhost:5173` (web interface with hot reload)

The app will load data first from the `commits-data.json` file (static), then from the API if available.

### Alternatives:

- `yarn dev:vite` - Start only the Vite dev server (without API backend)
- `yarn dev:server` - Start only the Express backend server
- `yarn generate` - Regenerate only the `public/commits-data.json` file from CSV

## Production Build

```bash
yarn build
```

This command:

1. Generates aggregated commit data from CSV files → `public/commits-data.json`
2. Compiles TypeScript
3. Runs Vite build to create a static build
4. Includes the JSON file in the final build

**Note:** The `public/commits-data.json` file is automatically generated during build and contains the aggregation of all commits from CSV files in the `commits/` folder.

## How GitHub Pages Deployment Works

The application is completely static and doesn't require a backend server:

1. **During build** (`yarn build`):

   - The `scripts/generate-commits-data.js` script reads all CSV files from `commits/`
   - Aggregates the data and generates `public/commits-data.json`

2. **Automatic deployment** via GitHub Actions:

   - Checks out the code
   - Installs dependencies
   - Runs `yarn build` (which generates the data)
   - Uploads the `dist/` folder to GitHub Pages

3. **At runtime** in the browser:
   - The app fetches the `commits-data.json` file from the public folder
   - Displays the graph with aggregated data

## Automatic Commit Extraction from Git Repositories

The project includes a Python script (`extract_commits.py`) that automatically extracts commits from Git repositories and generates CSV files.

### Prerequisites

- Python 3.6+
- Git installed and available in PATH

### Usage

#### 1. Extract from repositories in the current directory:

```bash
python3 extract_commits.py
```

#### 2. Extract from a specific repository:

```bash
python3 extract_commits.py --repo /path/to/repository
```

#### 3. Search and extract from all repositories in a directory:

```bash
python3 extract_commits.py --search /path/to/search
```

#### 4. Customize the output directory:

```bash
python3 extract_commits.py --output ./my_commits --search /path/to/repos
```

### Available Options

- `--output, -o <dir>` - Output directory for CSV files (default: `./commits`)
- `--repo, -r <path>` - Extract from a specific repository
- `--search, -s <path>` - Directory to search for Git repositories
- `--all, -a` - Recursively search in subdirectories

### Example: Extract commits from multiple local repositories

```bash
# From the project root directory:
python3 extract_commits.py --search ~/projects --output ./commits
```

The script will generate CSV files with the following format:

```
Date,Timestamp,Author,Email,Hash,Subject,Additions,Deletions
2025-07-07,2025-07-07T12:49:55+02:00,Marco Silvestroni,email@example.com,abc123...,commit message,10,5
```

## CSV File Format

CSV files in the `commits/` folder must contain at least a `Date` column in `YYYY-MM-DD` format.

Example:

```
Date,Timestamp,Author,Subject
2025-07-07,2025-07-07T12:49:55+02:00,Marco Silvestroni,feat: enhance EngineModalMapping
2025-07-07,2025-07-07T11:41:37+02:00,Marco Silvestroni,Merge branch 'bo/feature/FormTable-edit-mode-feature'
```

## API

### Available Endpoints (during development)

#### GET `/api/commits`

Returns the aggregation of contributions per date from all CSV files.

Response:

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

**Note:** This endpoint is only available during development. On GitHub Pages, data is served from the static `commits-data.json` file.

## Project Structure

```
.
├── commits/                    # Contribution CSV files
├── public/
│   └── commits-data.json      # Aggregated data (generated at build time)
├── scripts/
│   └── generate-commits-data.js # Script to aggregate CSV → JSON
├── src/
│   ├── components/
│   │   └── ContributionGraph.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── extract_commits.py         # Python script to extract commits from Git
├── server.ts                  # Express backend server (development only)
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## Heatmap Colors

- **Gray** (#ebedf0): No contributions
- **Light green** (#c6e48b): 1-2 contributions
- **Medium green** (#7bc96f): 3-5 contributions
- **Dark green** (#239a3b): 6-10 contributions
- **Very dark green** (#196127): 11+ contributions

## Technologies Used

- **React 19** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **csv-parse** - CSV parser
- **Node.js** - Data generation script
- **GitHub Pages** - Static hosting
- **GitHub Actions** - CI/CD

## Troubleshooting

### "Cannot load commits data" on GitHub Pages

Verify that:

1. CSV files are in the `commits/` folder
2. You've run `yarn build` locally to generate `public/commits-data.json`
3. The `commits-data.json` file has been committed to GitHub (or is generated during Actions)

### Data doesn't update after pushing

Data is generated during the build. Make sure that:

1. Updated CSV files are in the `commits/` folder
2. You've committed the CSV files to GitHub
3. GitHub Actions complete successfully

To rebuild locally:

```bash
# Update CSV files
python3 extract_commits.py --repo /path/to/repo

# Regenerate data
yarn generate

# Verify the result
cat public/commits-data.json
```
