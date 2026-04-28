import express from "express";
import { readdir, readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

interface CommitRecord {
  Date?: string;
  [key: string]: string | undefined;
}

interface ContributionData {
  date: string;
  count: number;
  projects: string[];
}

interface TechReport {
  project: string;
  detectedAt: string | null;
  languages: string[];
  frameworks: string[];
  tools: string[];
}

interface TechMapData {
  generatedAt: string;
  projects: TechReport[];
  aggregated: {
    languages: Record<string, number>;
    frameworks: Record<string, number>;
    tools: Record<string, number>;
  };
}

// Extract project name from filename
function getProjectName(filename: string): string {
  const match = filename.match(/contributions_report_([^.]+)\.csv/);
  return match ? match[1].toUpperCase() : filename;
}

// API endpoint to get commits
app.get("/api/commits", async (req, res) => {
  try {
    const commitsDir = path.join(__dirname, "commits");
    const files = await readdir(commitsDir);

    const csvFiles = files.filter(
      (file) => file.endsWith(".csv") && !file.includes(":")
    );

    const contributionMap = new Map<
      string,
      { count: number; projects: Set<string> }
    >();

    for (const file of csvFiles) {
      const projectName = getProjectName(file);
      const filePath = path.join(commitsDir, file);
      try {
        const content = await readFile(filePath, "utf-8");

        const records = parse(content, {
          columns: true,
          skip_empty_lines: true,
        }) as CommitRecord[];

        for (const record of records) {
          const date = record.Date?.trim();
          if (date) {
            const current = contributionMap.get(date) || {
              count: 0,
              projects: new Set<string>(),
            };
            current.count++;
            current.projects.add(projectName);
            contributionMap.set(date, current);
          }
        }
      } catch (fileError) {
        console.error(`Error reading file ${file}:`, fileError);
      }
    }

    const result: ContributionData[] = Array.from(
      contributionMap.entries()
    ).map(([date, { count, projects }]) => ({
      date,
      count,
      projects: Array.from(projects).sort(),
    }));

    res.json(result);
  } catch (error) {
    console.error("Error reading commits:", error);
    res.status(500).json({ error: "Failed to read commit data" });
  }
});

// API endpoint to get technology map (runtime aggregation for dev server)
app.get("/api/tech-map", async (req, res) => {
  try {
    const commitsDir = path.join(__dirname, "commits");
    const files = await readdir(commitsDir);
    const techFiles = files.filter(
      (f) => f.startsWith("tech_report_") && f.endsWith(".json")
    );

    const projects: TechReport[] = [];
    const aggregated: TechMapData["aggregated"] = {
      languages: {},
      frameworks: {},
      tools: {},
    };

    for (const file of techFiles) {
      try {
        const content = await readFile(
          path.join(commitsDir, file),
          "utf-8"
        );
        const report = JSON.parse(content) as TechReport;

        projects.push({
          name: report.project,
          detectedAt: report.detectedAt ?? null,
          languages: report.languages ?? [],
          frameworks: report.frameworks ?? [],
          tools: report.tools ?? [],
        });

        for (const lang of report.languages ?? []) {
          aggregated.languages[lang] = (aggregated.languages[lang] ?? 0) + 1;
        }
        for (const fw of report.frameworks ?? []) {
          aggregated.frameworks[fw] = (aggregated.frameworks[fw] ?? 0) + 1;
        }
        for (const tool of report.tools ?? []) {
          aggregated.tools[tool] = (aggregated.tools[tool] ?? 0) + 1;
        }
      } catch (e) {
        console.error(`Error reading ${file}:`, e);
      }
    }

    projects.sort((a, b) => a.name.localeCompare(b.name));

    const result: TechMapData = {
      generatedAt: new Date().toISOString(),
      projects,
      aggregated,
    };

    res.json(result);
  } catch (error) {
    console.error("Error reading tech reports:", error);
    res.status(500).json({ error: "Failed to read technology data" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
