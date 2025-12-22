import { useState, useEffect } from "react";
import "./App.css";
import ContributionGraph from "./components/ContributionGraph";

interface CommitData {
  date: string;
  count: number;
  projects: string[];
}

function App() {
  const [contributionData, setContributionData] = useState<CommitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCommitData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/commits");
        if (!response.ok) {
          throw new Error("Failed to load commit data");
        }
        const data = await response.json();
        setContributionData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadCommitData();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Contribution Graph</h1>
        <p>Commit activity across all repositories</p>
      </header>
      <main className="main">
        {loading && <div className="loading">Loading commit data...</div>}
        {error && <div className="error">Error: {error}</div>}
        {!loading && !error && <ContributionGraph data={contributionData} />}
      </main>
    </div>
  );
}

export default App;
