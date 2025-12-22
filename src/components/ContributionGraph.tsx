import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";

interface CommitData {
  date: string;
  count: number;
  projects: string[];
}

interface DayData {
  date: string;
  count: number;
  level: string;
  projects: string[];
}

interface PopupData {
  date: string;
  count: number;
  projects: string[];
  x: number;
  y: number;
}

interface YearlyStats {
  year: number;
  projectTotals: Map<string, number>;
  total: number;
}

interface ContributionGraphProps {
  data: CommitData[];
}

export default function ContributionGraph({ data }: ContributionGraphProps) {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const { graphData, stats, yearlyStats } = useMemo(() => {
    const dateMap = new Map<string, CommitData>();
    data.forEach((item) => {
      dateMap.set(item.date, item);
    });

    // Get all years from data
    const allDates = Array.from(dateMap.keys()).sort();
    const yearsSet = new Set<number>();
    allDates.forEach((date) => {
      const year = parseInt(date.split("-")[0]);
      yearsSet.add(year);
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    // Create graph data for each year
    const graphData = years.map((year) => ({
      year,
      weeks: generateWeeksForYear(year, dateMap),
    }));

    // Calculate yearly stats by project
    const yearlyStatsMap = new Map<number, YearlyStats>();
    years.forEach((year) => {
      const projectTotals = new Map<string, number>();
      let total = 0;

      allDates.forEach((date) => {
        const dateYear = parseInt(date.split("-")[0]);
        if (dateYear === year) {
          const commitData = dateMap.get(date);
          if (commitData) {
            total += commitData.count;
            commitData.projects.forEach((project) => {
              projectTotals.set(
                project,
                (projectTotals.get(project) || 0) + commitData.count
              );
            });
          }
        }
      });

      yearlyStatsMap.set(year, { year, projectTotals, total });
    });

    const yearlyStats = Array.from(yearlyStatsMap.values()).sort(
      (a, b) => b.year - a.year
    );

    // Calculate stats
    const totalContributions = Array.from(dateMap.values()).reduce(
      (a, b) => a + b.count,
      0
    );

    return {
      graphData,
      stats: { totalContributions },
      yearlyStats,
    };
  }, [data]);

  const styles = {
    contributionGraph: {
      padding: "2rem",
      maxWidth: "1200px",
      margin: "0 auto",
    } as CSSProperties,
    contributionStats: {
      display: "flex",
      gap: "2rem",
      marginBottom: "2rem",
      flexWrap: "wrap",
    } as CSSProperties,
    stat: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    } as CSSProperties,
    statLabel: {
      fontSize: "0.875rem",
      color: "#666",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
    } as CSSProperties,
    statValue: {
      fontSize: "2rem",
      fontWeight: "bold",
      color: "#24292f",
    } as CSSProperties,
    graphContainer: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "3rem",
    } as CSSProperties,
    yearSection: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "1rem",
    } as CSSProperties,
    yearTitle: {
      margin: 0,
      fontSize: "1.5rem",
      color: "#24292f",
      fontWeight: 600,
    } as CSSProperties,
    graphGrid: {
      display: "flex",
      gap: "1rem",
      alignItems: "flex-start",
      overflowX: "auto",
      overflowY: "hidden",
      paddingBottom: "0.5rem",
    } as CSSProperties,
    weekdaysLabels: {
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "space-around",
      height: "100%",
      paddingRight: "0.5rem",
      fontSize: "0.75rem",
      color: "#666",
      textAlign: "right" as const,
      minWidth: "2rem",
    } as CSSProperties,
    contributionGrid: {
      display: "flex",
      gap: "0.25rem",
      flexWrap: "nowrap" as const,
      alignContent: "flex-start",
    } as CSSProperties,
    week: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.25rem",
    } as CSSProperties,
    day: (level: string) =>
      ({
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "0.25rem",
        border: "1px solid #e1e4e8",
        cursor: "pointer",
        transition: "all 0.2s ease",
        backgroundColor: getLevelColor(level),
      } as CSSProperties),
    legend: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "0.5rem",
      marginTop: "2rem",
      fontSize: "0.875rem",
      color: "#666",
    } as CSSProperties,
    legendBox: (level: string) =>
      ({
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "0.25rem",
        border: "1px solid #e1e4e8",
        backgroundColor: getLevelColor(level),
      } as CSSProperties),
    yearlyReportSection: {
      marginTop: "3rem",
      paddingTop: "2rem",
      borderTop: "2px solid #e1e4e8",
    } as CSSProperties,
    yearlyReportTitle: {
      fontSize: "1.5rem",
      fontWeight: 600,
      color: "#24292f",
      marginBottom: "1.5rem",
    } as CSSProperties,
    yearlyReportContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "2rem",
    } as CSSProperties,
    yearCard: {
      border: "1px solid #e1e4e8",
      borderRadius: "0.5rem",
      padding: "1.5rem",
      backgroundColor: "#f6f8fa",
    } as CSSProperties,
    yearCardTitle: {
      fontSize: "1.25rem",
      fontWeight: 600,
      color: "#24292f",
      marginBottom: "0.5rem",
      borderBottom: "2px solid #0969da",
      paddingBottom: "0.5rem",
    } as CSSProperties,
    yearCardTotal: {
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "#0969da",
      marginBottom: "1rem",
    } as CSSProperties,
    projectList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.75rem",
    } as CSSProperties,
    projectItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.75rem",
      backgroundColor: "white",
      borderRadius: "0.25rem",
      border: "1px solid #e1e4e8",
    } as CSSProperties,
    projectName: {
      fontSize: "0.875rem",
      color: "#24292f",
      fontWeight: 500,
    } as CSSProperties,
    projectCount: {
      fontSize: "0.875rem",
      fontWeight: 600,
      color: "#0969da",
      minWidth: "3rem",
      textAlign: "right" as const,
    } as CSSProperties,
  };

  return (
    <div style={styles.contributionGraph}>
      <div style={styles.contributionStats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Total Contributions</span>
          <span style={styles.statValue}>{stats.totalContributions}</span>
        </div>
      </div>

      <div style={styles.graphContainer}>
        {graphData.map(
          ({ year, weeks }: { year: number; weeks: DayData[][] }) => (
            <div key={year} style={styles.yearSection}>
              <h3 style={styles.yearTitle}>{year}</h3>
              <div style={styles.graphGrid}>
                <div style={styles.weekdaysLabels}>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>
                <div style={styles.contributionGrid}>
                  {weeks.map((week: DayData[], weekIdx: number) => (
                    <div key={weekIdx} style={styles.week}>
                      {week.map((day: DayData, dayIdx: number) => (
                        <div
                          key={`${weekIdx}-${dayIdx}`}
                          style={styles.day(day.level)}
                          title={`${day.date}: ${day.count} contribution${
                            day.count !== 1 ? "s" : ""
                          }`}
                          onClick={(e: MouseEvent<HTMLDivElement>) => {
                            if (day.count > 0) {
                              const rect = (
                                e.currentTarget as HTMLElement
                              ).getBoundingClientRect();
                              setPopup({
                                date: day.date,
                                count: day.count,
                                projects: day.projects,
                                x: rect.left,
                                y: rect.top,
                              });
                            }
                          }}
                          onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
                            (e.currentTarget as HTMLElement).style.transform =
                              "scale(1.1)";
                            (e.currentTarget as HTMLElement).style.boxShadow =
                              "0 0 0 2px rgba(36, 41, 47, 0.15)";
                          }}
                          onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
                            (e.currentTarget as HTMLElement).style.transform =
                              "scale(1)";
                            (e.currentTarget as HTMLElement).style.boxShadow =
                              "none";
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <div style={styles.yearlyReportSection}>
        <h2 style={styles.yearlyReportTitle}>Annual Commit Report</h2>
        <div style={styles.yearlyReportContainer}>
          {yearlyStats.map((yearStat) => (
            <div key={yearStat.year} style={styles.yearCard}>
              <div style={styles.yearCardTitle}>{yearStat.year}</div>
              <div style={styles.yearCardTotal}>{yearStat.total} commits</div>
              <div style={styles.projectList}>
                {Array.from(yearStat.projectTotals.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([project, count]) => (
                    <div key={project} style={styles.projectItem}>
                      <span style={styles.projectName}>{project}</span>
                      <span style={styles.projectCount}>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.legend}>
        <span>Less</span>
        <div style={styles.legendBox("level-0")}></div>
        <div style={styles.legendBox("level-1")}></div>
        <div style={styles.legendBox("level-2")}></div>
        <div style={styles.legendBox("level-3")}></div>
        <div style={styles.legendBox("level-4")}></div>
        <span>More</span>
      </div>

      {popup && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setPopup(null)}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(popup.y + 30, window.innerHeight - 200),
              left: Math.min(popup.x, window.innerWidth - 300),
              backgroundColor: "white",
              border: "1px solid #e1e4e8",
              borderRadius: "0.5rem",
              padding: "1rem",
              boxShadow: "0 8px 24px rgba(36, 41, 47, 0.12)",
              zIndex: 1000,
              maxWidth: "300px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div style={{ marginBottom: "0.75rem" }}>
              <strong style={{ color: "#24292f" }}>{popup.date}</strong>
            </div>
            <div
              style={{
                marginBottom: "0.75rem",
                fontSize: "0.875rem",
                color: "#666",
              }}
            >
              {popup.count} commit{popup.count !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              <div style={{ color: "#666", marginBottom: "0.5rem" }}>
                Projects:
              </div>
              {popup.projects.map((project) => (
                <div
                  key={project}
                  style={{
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "#f6f8fa",
                    borderRadius: "0.25rem",
                    marginBottom: "0.25rem",
                    color: "#24292f",
                    fontWeight: 500,
                  }}
                >
                  {project}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getLevelColor(level: string): string {
  switch (level) {
    case "level-0":
      return "#ebedf0";
    case "level-1":
      return "#c6e48b";
    case "level-2":
      return "#7bc96f";
    case "level-3":
      return "#239a3b";
    case "level-4":
      return "#196127";
    default:
      return "#ebedf0";
  }
}

function generateWeeksForYear(year: number, dateMap: Map<string, CommitData>) {
  const weeks: Array<DayData[]> = [];
  const firstDay = new Date(year, 0, 1);
  // Start from the Monday of the week containing Jan 1
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

  const currentWeek: DayData[] = [];

  const date = new Date(startDate);
  while (
    date.getFullYear() <= year ||
    (date.getFullYear() === year + 1 &&
      date.getMonth() === 0 &&
      date.getDate() <= 7)
  ) {
    const dateStr = formatDate(date);
    const commitData = dateMap.get(dateStr);
    const count = commitData?.count || 0;
    const projects = commitData?.projects || [];
    const level = getContributionLevel(count);

    currentWeek.push({ date: dateStr, count, level, projects });

    if (currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek.length = 0;
    }

    date.setDate(date.getDate() + 1);

    if (date.getFullYear() > year && date.getMonth() !== 0) {
      break;
    }
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getContributionLevel(count: number): string {
  if (count === 0) return "level-0";
  if (count <= 2) return "level-1";
  if (count <= 5) return "level-2";
  if (count <= 10) return "level-3";
  return "level-4";
}
