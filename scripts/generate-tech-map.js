#!/usr/bin/env node
/**
 * Generate aggregated technology map JSON from tech_report_*.json files.
 * This runs during build to create a static JSON file for deployment.
 *
 * Input:  commits/tech_report_<project>.json  (one per repo)
 * Output: public/tech-map.json
 */

import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

async function generateTechMap() {
  try {
    const commitsDir = path.join(rootDir, "commits");
    const publicDir = path.join(rootDir, "public");
    const outputFile = path.join(publicDir, "tech-map.json");

    console.log("🗺️  Generating technology map...");
    console.log(`Reading from: ${commitsDir}`);
    console.log(`Writing to:   ${outputFile}`);

    const files = await readdir(commitsDir);
    const techFiles = files.filter(
      (f) => f.startsWith("tech_report_") && f.endsWith(".json")
    );

    if (techFiles.length === 0) {
      console.warn("⚠️  No tech_report_*.json files found!");
      console.warn(
        "   Run: python3 extract_commits.py --tech  (or --all-features)"
      );
      // Write empty structure so the frontend doesn't crash
      const empty = {
        generatedAt: new Date().toISOString(),
        projects: [],
        aggregated: { languages: {}, frameworks: {}, tools: {} },
      };
      await writeFile(outputFile, JSON.stringify(empty, null, 2));
      return;
    }

    const projects = [];
    const aggregated = { languages: {}, frameworks: {}, tools: {} };

    for (const file of techFiles) {
      const filePath = path.join(commitsDir, file);
      try {
        const content = await readFile(filePath, "utf-8");
        const report = JSON.parse(content);

        projects.push({
          name: report.project ?? file.replace("tech_report_", "").replace(".json", ""),
          detectedAt: report.detectedAt ?? null,
          languages: report.languages ?? [],
          frameworks: report.frameworks ?? [],
          tools: report.tools ?? [],
        });

        // Aggregate counts
        for (const lang of report.languages ?? []) {
          aggregated.languages[lang] = (aggregated.languages[lang] ?? 0) + 1;
        }
        for (const fw of report.frameworks ?? []) {
          aggregated.frameworks[fw] = (aggregated.frameworks[fw] ?? 0) + 1;
        }
        for (const tool of report.tools ?? []) {
          aggregated.tools[tool] = (aggregated.tools[tool] ?? 0) + 1;
        }

        console.log(
          `  ✓ ${report.project}  [${(report.languages ?? []).join(", ")}]`
        );
      } catch (err) {
        console.error(`  ❌ Error reading ${file}:`, err.message);
      }
    }

    // Sort projects alphabetically
    projects.sort((a, b) => a.name.localeCompare(b.name));

    const output = {
      generatedAt: new Date().toISOString(),
      projects,
      aggregated,
    };

    await writeFile(outputFile, JSON.stringify(output, null, 2));
    console.log(
      `\n✅ Tech map generated: ${projects.length} projects, ${
        Object.keys(aggregated.languages).length
      } languages, ${Object.keys(aggregated.frameworks).length} frameworks`
    );
    console.log(`📁 File saved to: ${outputFile}`);
  } catch (err) {
    console.error("❌ Error generating tech map:", err);
    process.exit(1);
  }
}

generateTechMap();
