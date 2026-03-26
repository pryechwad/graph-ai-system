import { useEffect, useRef, useState, useCallback } from "react";
// Import directly from the 2D subpath to avoid bundling the VR/AR variants
// that crash with "AFRAME is not defined" in non-browser build environments
import ForceGraph2D from "react-force-graph-2d";

const API_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/graph`;

// One color per entity type
const NODE_COLORS = {
  customer:   "#f59e0b",
  order:      "#34d399",
  order_item: "#6ee7b7",
  delivery:   "#60a5fa",
  invoice:    "#a78bfa",
  payment:    "#f472b6",
  product:    "#fb923c",
};
const DEFAULT_COLOR = "#94a3b8";

function nodeColor(type) {
  return NODE_COLORS[type] ?? DEFAULT_COLOR;
}

export default function GraphView({ highlightedIds = [] }) {
  const containerRef = useRef(null);
  const graphRef     = useRef(null);

  const [graphData,   setGraphData]   = useState({ nodes: [], links: [] });
  const [dimensions,  setDimensions]  = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode,setSelectedNode]= useState(null);
  const [tooltip,     setTooltip]     = useState({ x: 0, y: 0 });
  const [status,      setStatus]      = useState("loading");
  const [errorMsg,    setErrorMsg]    = useState("");

  // ── Measure container ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Fetch graph data ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(({ nodes = [], edges = [] }) => {
        // react-force-graph expects { nodes, links }
        // edges use { source, target, label } — map label → name for display
        const links = edges.map((e) => ({
          source:       e.source,
          target:       e.target,
          label:        e.label ?? e.relationship ?? "",
        }));
        setGraphData({ nodes, links });
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }, []);

  // ── Node hover handlers ──────────────────────────────────────────────────
  const handleNodeHover = useCallback((node, _prevNode) => {
    setHoveredNode(node ?? null);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode((prev) => prev?.id === node.id ? null : node); // toggle
    graphRef.current?.centerAt(node.x, node.y, 500);
    graphRef.current?.zoom(4, 500);
  }, []);

  // Track mouse position for tooltip
  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 });
  }, []);

  const highlightSet = new Set(highlightedIds.map(String));

  // ── Custom node painter ──────────────────────────────────────────────────
  const paintNode = useCallback((node, ctx, globalScale) => {
    const r       = 5;
    const isHigh  = highlightSet.has(String(node.id));
    const color   = isHigh ? "#facc15" : nodeColor(node.type);
    const isHov   = hoveredNode?.id  === node.id;
    const isSel   = selectedNode?.id === node.id;

    // Highlight ring
    if (isHigh && !isSel) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Selection ring
    if (isSel) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = color + "44";
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Hover glow
    if (isHov && !isSel) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = color + "33";
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = isSel ? "#fff" : isHov ? color + "dd" : color;
    ctx.fill();

    // Label — only when zoomed in enough
    if (globalScale >= 2) {
      const label    = String(node.id).slice(0, 12);
      const fontSize = (3.5 / globalScale) * 2;
      ctx.font             = `${fontSize}px sans-serif`;
      ctx.fillStyle        = "#e2e8f0";
      ctx.textAlign        = "center";
      ctx.textBaseline     = "top";
      ctx.fillText(label, node.x, node.y + r + 1);
    }
  }, [hoveredNode, selectedNode, highlightedIds]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.links.length;

  return (
    <div className="flex flex-col h-full bg-[#080b10]">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800/60
                      bg-[#0d1117] shrink-0">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <StatusDot status={status} />
          <h1 className="text-sm font-semibold text-gray-200 tracking-wide">
            Graph Visualization
          </h1>
        </div>
        {/* Legend pills */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type}
                 className="flex items-center gap-1.5 px-2 py-0.5 rounded-full
                            bg-gray-800/60 border border-gray-700/40">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-400 capitalize leading-none">
                {type.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {status === "loading" && (
          <Overlay>
            <Spinner />
            <p className="text-gray-400 text-sm mt-3">Loading graph data…</p>
          </Overlay>
        )}

        {status === "error" && (
          <Overlay>
            <p className="text-red-400 text-sm font-medium">Failed to load graph</p>
            <p className="text-gray-500 text-xs mt-1">{errorMsg}</p>
            <p className="text-gray-600 text-xs mt-1">Could not reach the backend server.</p>
          </Overlay>
        )}

        {status === "ready" && dimensions.width > 0 && (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#030712"
            // Nodes
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            // Links
            linkColor={() => "#334155"}
            linkWidth={0.8}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={() => "#475569"}
            // Zoom / pan — enabled by default in react-force-graph
            enableZoomInteraction
            enablePanInteraction
            // Simulation
            cooldownTicks={120}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}

        {/* Hover tooltip — hidden when a node is selected */}
        {hoveredNode && !selectedNode && (
          <div
            className="pointer-events-none absolute z-10 bg-gray-800 border border-gray-700
                       rounded-lg px-3 py-2 shadow-xl text-xs max-w-[220px]"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="font-semibold text-white truncate">{hoveredNode.id}</p>
            <p className="text-gray-400 capitalize mt-0.5">
              {hoveredNode.type?.replace("_", " ") ?? "unknown"}
            </p>
          </div>
        )}

        {/* Node detail panel */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            connectedEdges={graphData.links.filter(
              (l) =>
                (l.source?.id ?? l.source) === selectedNode.id ||
                (l.target?.id ?? l.target) === selectedNode.id
            )}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-5 px-5 py-2.5 border-t border-gray-800/60
                      bg-[#0d1117] shrink-0">
        <Stat label="Nodes" value={nodeCount || "—"} />
        <Stat label="Edges" value={edgeCount || "—"} />
        <div className="w-px h-3 bg-gray-700" />
        <Stat
          label="Status"
          value={status.charAt(0).toUpperCase() + status.slice(1)}
          color={
            status === "ready"   ? "text-emerald-400" :
            status === "error"   ? "text-red-400"     :
            status === "loading" ? "text-yellow-400"  : "text-gray-500"
          }
        />
        {hoveredNode && (
          <span className="ml-auto text-[11px] text-gray-500 truncate max-w-[220px]">
            <span className="text-gray-600">Hover: </span>
            <span className="text-gray-300 font-medium">{hoveredNode.id}</span>
            <span className="text-gray-600 ml-1 capitalize">
              ({hoveredNode.type?.replace("_", " ")})
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Small reusable pieces ────────────────────────────────────────────────────

function Stat({ label, value, color = "text-gray-300" }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    loading: "bg-yellow-400 animate-pulse",
    ready:   "bg-emerald-400 shadow-[0_0_6px_#34d399]",
    error:   "bg-red-400",
  };
  return <span className={`w-2.5 h-2.5 rounded-full ${colors[status] ?? "bg-gray-500"}`} />;
}

function Overlay({ children }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 z-10">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-emerald-400 animate-spin" />
  );
}

// ── Node Detail Panel ────────────────────────────────────────────────────────

function NodeDetailPanel({ node, connectedEdges, onClose }) {
  const color  = NODE_COLORS[node.type] ?? DEFAULT_COLOR;
  const data   = node.data ?? node.metadata ?? {};

  // Separate internal graph fields from display fields
  const skipKeys = new Set(["id", "type", "x", "y", "vx", "vy", "fx", "fy", "index", "__indexColor"]);
  const dataEntries = Object.entries(data).filter(([k]) => !skipKeys.has(k));

  return (
    <div className="absolute top-3 right-3 z-20 w-72
                    bg-[#0d1117]/95 backdrop-blur-sm
                    border border-gray-700/60 rounded-2xl shadow-2xl
                    flex flex-col overflow-hidden
                    animate-in"
         style={{ maxHeight: "calc(100% - 24px)" }}
    >
      {/* Panel header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/50"
           style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
        {/* Type badge */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
             style={{ backgroundColor: color + "22", border: `1.5px solid ${color}` }}>
          <span className="text-[10px] font-bold" style={{ color }}>
            {node.type?.slice(0, 3).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{node.id}</p>
          <p className="text-[10px] capitalize mt-0.5"
             style={{ color }}>
            {node.type?.replace(/_/g, " ") ?? "unknown"}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
                     text-gray-500 hover:text-white hover:bg-gray-700/60
                     transition-colors"
          aria-label="Close panel"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4"
           style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}>

        {/* Data fields */}
        {dataEntries.length > 0 && (
          <section>
            <SectionLabel>Properties</SectionLabel>
            <div className="space-y-1.5 mt-2">
              {dataEntries.map(([key, val]) => (
                <DataRow key={key} label={key} value={val} />
              ))}
            </div>
          </section>
        )}

        {/* Connected edges */}
        {connectedEdges.length > 0 && (
          <section>
            <SectionLabel>Connections ({connectedEdges.length})</SectionLabel>
            <div className="space-y-1.5 mt-2">
              {connectedEdges.map((edge, i) => {
                const srcId = edge.source?.id ?? edge.source;
                const tgtId = edge.target?.id ?? edge.target;
                const isOut = srcId === node.id;
                return (
                  <div key={i}
                       className="flex items-start gap-2 px-2.5 py-2 rounded-lg
                                  bg-gray-800/50 border border-gray-700/30">
                    {/* Direction arrow */}
                    <span className={`text-[10px] font-bold mt-0.5 shrink-0
                      ${isOut ? "text-blue-400" : "text-emerald-400"}`}>
                      {isOut ? "OUT" : "IN"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-medium truncate">
                        {edge.label || edge.relationship || "—"}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {isOut ? tgtId : srcId}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {dataEntries.length === 0 && connectedEdges.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">No data available</p>
        )}
      </div>

      {/* Hint */}
      <div className="px-4 py-2 border-t border-gray-700/40">
        <p className="text-[10px] text-gray-600 text-center">
          Click node again to deselect
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
      {children}
    </p>
  );
}

function DataRow({ label, value }) {
  const display = value === null || value === undefined || value === ""
    ? <span className="text-gray-600 italic">empty</span>
    : typeof value === "object"
    ? <span className="text-gray-400 font-mono text-[10px]">{JSON.stringify(value)}</span>
    : <span className="text-gray-300 break-all">{String(value)}</span>;

  return (
    <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg
                    bg-gray-800/40 border border-gray-700/20">
      <span className="text-[10px] text-gray-500 shrink-0 w-24 truncate pt-px capitalize">
        {label.replace(/([A-Z])/g, " $1").trim()}
      </span>
      <span className="text-[11px] flex-1 min-w-0 leading-relaxed">
        {display}
      </span>
    </div>
  );
}
