import { useState, useEffect } from "react";
import "./App.css";
import ContributionGraph from "./components/ContributionGraph";
import TechMap, { type TechMapData } from "./components/TechMap";

interface CommitData {
  date: string;
  count: number;
  projects: string[];
}

function App() {
  const [contributionData, setContributionData] = useState<CommitData[]>([]);
  const [techMapData, setTechMapData] = useState<TechMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // ── Load commit data ──────────────────────────────────────────────
        let commitResponse = await fetch("/api/commits");
        if (!commitResponse.ok) {
          commitResponse = await fetch("/summarize-commits/commits-data.json");
        }
        if (!commitResponse.ok) {
          commitResponse = await fetch("/commits-data.json");
        }
        if (!commitResponse.ok) {
          throw new Error("Failed to load commit data");
        }
        const commitData = await commitResponse.json();
        setContributionData(commitData);

        // ── Load tech map (best-effort, non-blocking) ─────────────────────
        try {
          let techResponse = await fetch("/api/tech-map");
          if (!techResponse.ok) {
            techResponse = await fetch("/summarize-commits/tech-map.json");
          }
          if (!techResponse.ok) {
            techResponse = await fetch("/tech-map.json");
          }
          if (techResponse.ok) {
            const techData = await techResponse.json();
            setTechMapData(techData);
          }
        } catch {
          // Tech map is optional — don't fail the whole page
          console.info(
            "Tech map not available yet. Run: python3 extract_commits.py --tech",
          );
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Contribution Graph</h1>
        <p>Commit activity across all repositories</p>
      </header>
      <main className="main">
        {loading && <div className="loading">Loading data…</div>}
        {error && <div className="error">Error: {error}</div>}
        {!loading && !error && (
          <>
            <ContributionGraph data={contributionData} />
            {techMapData && techMapData.projects.length > 0 && (
              <TechMap data={techMapData} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
