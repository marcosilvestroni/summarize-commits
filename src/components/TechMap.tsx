import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TechProject {
  name: string;
  detectedAt: string | null;
  languages: string[];
  frameworks: string[];
  tools: string[];
}

export interface TechMapData {
  generatedAt: string;
  projects: TechProject[];
  aggregated: {
    languages: Record<string, number>;
    frameworks: Record<string, number>;
    tools: Record<string, number>;
  };
}

interface TechMapProps {
  data: TechMapData | null;
}

// ─── Colour palette (deterministic from string hash) ─────────────────────────

const PALETTE = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#06b6d4",
  "#a855f7",
];

function colorFor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// ─── Category badge ──────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  language: { bg: "#dbeafe", color: "#1e40af", label: "Lang" },
  framework: { bg: "#dcfce7", color: "#166534", label: "FW" },
  tool: { bg: "#fef3c7", color: "#92400e", label: "Tool" },
};

function Badge({
  text,
  kind,
}: {
  text: string;
  kind: "language" | "framework" | "tool";
}) {
  const s = CATEGORY_STYLE[kind];
  return (
    <span
      title={s.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.2rem 0.6rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.color}33`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

// ─── Bubble chart (SVG) ───────────────────────────────────────────────────────

interface BubbleEntry {
  name: string;
  count: number;
  kind: "language" | "framework" | "tool";
}

function BubbleChart({ data }: { data: BubbleEntry[] }) {
  const W = 800;
  const H = 420;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Simple circle-packing: lay out in rows within category strips
  const grouped = {
    language: data.filter((d) => d.kind === "language"),
    framework: data.filter((d) => d.kind === "framework"),
    tool: data.filter((d) => d.kind === "tool"),
  };

  const sections: {
    kind: "language" | "framework" | "tool";
    label: string;
    xStart: number;
    width: number;
  }[] = [
    { kind: "language", label: "Languages", xStart: 20, width: 230 },
    { kind: "framework", label: "Frameworks", xStart: 275, width: 280 },
    { kind: "tool", label: "Tools", xStart: 575, width: 210 },
  ];

  const bubbles: {
    cx: number;
    cy: number;
    r: number;
    name: string;
    count: number;
    kind: string;
    fill: string;
  }[] = [];

  for (const sec of sections) {
    const items = grouped[sec.kind];
    if (items.length === 0) continue;

    let x = sec.xStart + 30;
    let y = 50;
    let rowH = 0;

    for (const item of items) {
      const r = Math.max(18, Math.round(18 + (item.count / maxCount) * 32));
      if (x + r * 2 > sec.xStart + sec.width - 10) {
        x = sec.xStart + 30;
        y += rowH + 10;
        rowH = 0;
      }
      bubbles.push({
        cx: x + r,
        cy: y + r,
        r,
        name: item.name,
        count: item.count,
        kind: item.kind,
        fill: colorFor(item.name),
      });
      x += r * 2 + 12;
      rowH = Math.max(rowH, r * 2);
    }
  }

  const svgHeight = Math.max(
    H,
    Math.max(...bubbles.map((b) => b.cy + b.r), 0) + 40,
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${svgHeight}`}
        style={{ width: "100%", maxWidth: W, height: "auto", display: "block" }}
      >
        {/* Section separators */}
        {sections.map((sec) => (
          <g key={sec.kind}>
            <rect
              x={sec.xStart}
              y={8}
              width={sec.width - 10}
              height={svgHeight - 16}
              rx={12}
              fill={CATEGORY_STYLE[sec.kind].bg}
              opacity={0.35}
            />
            <text
              x={sec.xStart + (sec.width - 10) / 2}
              y={28}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill={CATEGORY_STYLE[sec.kind].color}
              style={{ textTransform: "uppercase", letterSpacing: 1 }}
            >
              {sec.label}
            </text>
          </g>
        ))}

        {/* Bubbles */}
        {bubbles.map((b) => (
          <g key={`${b.kind}-${b.name}`}>
            <circle
              cx={b.cx}
              cy={b.cy}
              r={b.r}
              fill={b.fill}
              opacity={0.85}
              stroke="white"
              strokeWidth={2}
            >
              <title>{`${b.name} — ${b.count} project${b.count !== 1 ? "s" : ""}`}</title>
            </circle>
            <text
              x={b.cx}
              y={b.cy + 4}
              textAnchor="middle"
              fontSize={b.r > 28 ? 11 : 9}
              fontWeight={600}
              fill="white"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {b.name.length > 10 && b.r < 28
                ? b.name.slice(0, 8) + "…"
                : b.name}
            </text>
            {b.count > 1 && (
              <text
                x={b.cx}
                y={b.cy + 4 + (b.r > 28 ? 14 : 11)}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(255,255,255,0.8)"
                style={{ pointerEvents: "none" }}
              >
                ×{b.count}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Text view ────────────────────────────────────────────────────────────────

function TextView({ projects }: { projects: TechProject[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1rem",
      }}
    >
      {projects.map((p) => (
        <div
          key={p.name}
          style={{
            border: "1px solid #e1e4e8",
            borderRadius: "0.5rem",
            padding: "1rem 1.25rem",
            backgroundColor: "#f6f8fa",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "#24292f",
              marginBottom: "0.75rem",
              borderBottom: "2px solid #0969da",
              paddingBottom: "0.4rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {p.name.replace(/_/g, " ")}
          </div>

          {p.languages.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#666",
                  marginBottom: "0.3rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Languages
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {p.languages.map((l) => (
                  <Badge key={l} text={l} kind="language" />
                ))}
              </div>
            </div>
          )}

          {p.frameworks.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#666",
                  marginBottom: "0.3rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Frameworks
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {p.frameworks.map((f) => (
                  <Badge key={f} text={f} kind="framework" />
                ))}
              </div>
            </div>
          )}

          {p.tools.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#666",
                  marginBottom: "0.3rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Tools
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {p.tools.map((t) => (
                  <Badge key={t} text={t} kind="tool" />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TechMap({ data }: TechMapProps) {
  const [view, setView] = useState<"text" | "graph">("text");

  const bubbleData = useMemo<BubbleEntry[]>(() => {
    if (!data) return [];
    const entries: BubbleEntry[] = [];
    for (const [name, count] of Object.entries(data.aggregated.languages)) {
      entries.push({ name, count, kind: "language" });
    }
    for (const [name, count] of Object.entries(data.aggregated.frameworks)) {
      entries.push({ name, count, kind: "framework" });
    }
    for (const [name, count] of Object.entries(data.aggregated.tools)) {
      entries.push({ name, count, kind: "tool" });
    }
    return entries.sort((a, b) => b.count - a.count);
  }, [data]);

  if (!data) return null;

  const totalTech =
    Object.keys(data.aggregated.languages).length +
    Object.keys(data.aggregated.frameworks).length +
    Object.keys(data.aggregated.tools).length;

  const btnBase: React.CSSProperties = {
    padding: "0.4rem 1rem",
    borderRadius: "0.375rem",
    border: "1px solid #d0d7de",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
    transition: "all 0.15s ease",
  };
  const activeBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: "#0969da",
    color: "white",
    borderColor: "#0969da",
  };
  const inactiveBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: "white",
    color: "#57606a",
  };

  return (
    <section
      style={{
        marginTop: "3rem",
        paddingTop: "2rem",
        paddingLeft: "2rem",
        paddingRight: "2rem",
        borderTop: "2px solid #e1e4e8",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#24292f",
            }}
          >
            Knowledge Map
          </h2>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              color: "#666",
            }}
          >
            {data.projects.length} projects · {totalTech} distinct technologies
          </p>
        </div>

        {/* Toggle buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            style={view === "text" ? activeBtn : inactiveBtn}
            onClick={() => setView("text")}
          >
            📋 Text
          </button>
          <button
            style={view === "graph" ? activeBtn : inactiveBtn}
            onClick={() => setView("graph")}
          >
            🫧 Bubble Chart
          </button>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          fontSize: "0.8rem",
        }}
      >
        {(["language", "framework", "tool"] as const).map((k) => (
          <span
            key={k}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: CATEGORY_STYLE[k].bg,
                border: `2px solid ${CATEGORY_STYLE[k].color}`,
                display: "inline-block",
              }}
            />
            <span style={{ color: CATEGORY_STYLE[k].color, fontWeight: 600 }}>
              {k.charAt(0).toUpperCase() + k.slice(1) + "s"}
            </span>
          </span>
        ))}
      </div>

      {/* Views */}
      {view === "text" && <TextView projects={data.projects} />}
      {view === "graph" && <BubbleChart data={bubbleData} />}

      {data.generatedAt && (
        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.75rem",
            color: "#999",
            textAlign: "right",
          }}
        >
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
      )}
    </section>
  );
}
