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

// Extract project name from filename (e.g., contributions_report_dtx.csv -> dtx)
function getProjectName(filename: string): string {
  const match = filename.match(/contributions_report_([^.]+)\.csv/);
  return match ? match[1].toUpperCase() : filename;
}

// API endpoint to get commits
app.get("/api/commits", async (req, res) => {
  try {
    const commitsDir = path.join(__dirname, "commits");
    const files = await readdir(commitsDir);

    // Filter only CSV files (not the ones with colons in the name which are alternate data streams)
    const csvFiles = files.filter(
      (file) => file.endsWith(".csv") && !file.includes(":")
    );

    const contributionMap = new Map<
      string,
      { count: number; projects: Set<string> }
    >();

    // Read all CSV files
    for (const file of csvFiles) {
      const projectName = getProjectName(file);
      const filePath = path.join(commitsDir, file);
      try {
        const content = await readFile(filePath, "utf-8");

        // Parse CSV
        const records = parse(content, {
          columns: true,
          skip_empty_lines: true,
        }) as CommitRecord[];

        // Aggregate contributions by date
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

    // Convert Map to array of objects for JSON serialization
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

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
