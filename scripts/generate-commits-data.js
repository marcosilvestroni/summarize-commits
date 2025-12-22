#!/usr/bin/env node
/**
 * Generate aggregated commits data JSON from CSV files.
 * This runs during build to create a static JSON file for GitHub Pages deployment.
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

async function generateCommitsData() {
  try {
    const commitsDir = path.join(rootDir, "commits");
    const publicDir = path.join(rootDir, "public");
    const outputFile = path.join(publicDir, "commits-data.json");

    console.log("📊 Generating commits data...");
    console.log(`Reading from: ${commitsDir}`);
    console.log(`Writing to: ${outputFile}`);

    const files = await readdir(commitsDir);
    const csvFiles = files.filter(
      (file) => file.endsWith(".csv") && !file.includes(":")
    );

    if (csvFiles.length === 0) {
      console.warn("⚠️  No CSV files found!");
      // Create empty data file to prevent errors
      await writeFile(outputFile, JSON.stringify([], null, 2));
      return;
    }

    const contributionMap = new Map();

    // Read all CSV files
    for (const file of csvFiles) {
      const filePath = path.join(commitsDir, file);
      const projectName = extractProjectName(file);

      try {
        const content = await readFile(filePath, "utf-8");
        const records = parse(content, {
          columns: true,
          skip_empty_lines: true,
        });

        console.log(`Processing: ${file} (${records.length} records)`);

        // Aggregate contributions by date
        for (const record of records) {
          const date = record.Date?.trim();
          if (date) {
            const current = contributionMap.get(date) || {
              count: 0,
              projects: new Set(),
            };
            current.count += 1;
            current.projects.add(projectName);
            contributionMap.set(date, current);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }

    // Convert Map to array and sort by date (descending)
    const commitData = Array.from(contributionMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        projects: Array.from(data.projects),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Write to JSON file
    await writeFile(outputFile, JSON.stringify(commitData, null, 2));

    console.log(`✅ Generated ${commitData.length} days of contribution data`);
    console.log(`📁 File saved to: ${outputFile}`);
  } catch (error) {
    console.error("❌ Error generating commits data:", error);
    process.exit(1);
  }
}

function extractProjectName(filename) {
  const match = filename.match(/contributions_report_([^.]+)\.csv/);
  return match ? match[1].toUpperCase() : filename.replace(".csv", "");
}

generateCommitsData();
