import { useState } from "react";
import GraphView from "./components/GraphView";
import ChatPanel  from "./components/ChatPanel";

export default function App() {
  const [highlightedIds, setHighlightedIds] = useState([]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950"
         style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-500 shrink-0" />

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph — 70% */}
        <div className="w-[70%] h-full min-w-0">
          <GraphView highlightedIds={highlightedIds} />
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-800 shrink-0" />

        {/* Chat — 30% */}
        <div className="w-[30%] h-full min-w-0">
          <ChatPanel onHighlight={setHighlightedIds} />
        </div>
      </div>
    </div>
  );
}
