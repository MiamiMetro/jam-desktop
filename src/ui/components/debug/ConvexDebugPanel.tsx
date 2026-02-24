import { useEffect, useMemo, useState } from "react";
import { useConvexDebugStore, type TrackedSubscription } from "@/lib/convex-debug";

export default function ConvexDebugPanel() {
  const { subscriptions, isOpen, toggle } = useConvexDebugStore();
  const [, tick] = useState(0);

  // Toggle with Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  // Tick every second to update durations
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Group by function name
  const grouped = useMemo(() => {
    const map = new Map<string, TrackedSubscription[]>();
    for (const sub of subscriptions.values()) {
      const list = map.get(sub.functionName) ?? [];
      list.push(sub);
      map.set(sub.functionName, list);
    }
    // Sort by function name
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [subscriptions]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        width: 420,
        maxHeight: "70vh",
        backgroundColor: "#1a1a2e",
        color: "#e0e0e0",
        borderRadius: 8,
        border: "1px solid #333",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        zIndex: 99999,
        fontFamily: "monospace",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #333",
          backgroundColor: "#16213e",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, color: "#00d2ff" }}>
          Convex Subscriptions ({subscriptions.size})
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CopyButton subscriptions={subscriptions} />
          <button
            onClick={toggle}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: 16,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: "auto", padding: 8, flex: 1 }}>
        {grouped.length === 0 && (
          <div style={{ color: "#666", textAlign: "center", padding: 16 }}>
            No active subscriptions
          </div>
        )}
        {grouped.map(([fnName, subs]) => (
          <FunctionGroup key={fnName} fnName={fnName} subs={subs} />
        ))}
      </div>
    </div>
  );
}

function buildClipboardText(subscriptions: Map<number, TrackedSubscription>): string {
  const grouped = new Map<string, TrackedSubscription[]>();
  for (const sub of subscriptions.values()) {
    const list = grouped.get(sub.functionName) ?? [];
    list.push(sub);
    grouped.set(sub.functionName, list);
  }
  const sorted = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const lines: string[] = [`Active Convex Subscriptions (${subscriptions.size} total)`, ""];
  for (const [fnName, subs] of sorted) {
    lines.push(`${fnName.replace(":", ".")} (×${subs.length})`);
    for (const sub of subs) {
      const duration = formatDuration(Date.now() - sub.startTime);
      const args = sub.args === "skip" ? '"skip"' : JSON.stringify(sub.args);
      lines.push(`  - active ${duration} | args: ${args}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function CopyButton({ subscriptions }: { subscriptions: Map<number, TrackedSubscription> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(buildClipboardText(subscriptions));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? "#4ecca3" : "#333",
        border: "none",
        color: copied ? "#000" : "#ccc",
        cursor: "pointer",
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 4,
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function FunctionGroup({
  fnName,
  subs,
}: {
  fnName: string;
  subs: TrackedSubscription[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          cursor: "pointer",
          padding: "4px 6px",
          borderRadius: 4,
          backgroundColor: "#0f3460",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <span>
          <span style={{ color: "#888", marginRight: 4 }}>
            {expanded ? "▼" : "▶"}
          </span>
          <span style={{ color: "#e94560" }}>{fnName.replace(":", ".")}</span>
        </span>
        <span
          style={{
            backgroundColor: "#533483",
            color: "#fff",
            borderRadius: 10,
            padding: "1px 8px",
            fontSize: 11,
          }}
        >
          {subs.length}
        </span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 16, marginTop: 4 }}>
          {subs.map((sub) => (
            <SubDetail key={sub.id} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubDetail({ sub }: { sub: TrackedSubscription }) {
  const duration = formatDuration(Date.now() - sub.startTime);
  const argsStr =
    sub.args === "skip"
      ? '"skip"'
      : JSON.stringify(sub.args, null, 2);

  return (
    <div
      style={{
        padding: "3px 6px",
        marginBottom: 3,
        borderRadius: 3,
        backgroundColor: "#1a1a2e",
        border: "1px solid #222",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <span style={{ color: "#4ecca3" }}>● active</span>
        <span style={{ color: "#888" }}>{duration}</span>
      </div>
      <pre
        style={{
          margin: 0,
          color: "#ccc",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          fontSize: 11,
          maxHeight: 80,
          overflow: "auto",
        }}
      >
        {argsStr}
      </pre>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}
