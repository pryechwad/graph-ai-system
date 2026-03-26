import { useState } from "react";
import GraphView from "./components/GraphView";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const [highlightedIds, setHighlightedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("graph"); // mobile only

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
    >
      {/* Top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-500 shrink-0" />

      {/* Mobile tab bar */}
      <div className="flex lg:hidden shrink-0 border-b border-gray-800 bg-[#0d1117]">
        <button
          onClick={() => setActiveTab("graph")}
          className={`flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors
            ${activeTab === "graph"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-gray-500 hover:text-gray-300"}`}
        >
          Graph
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors
            ${activeTab === "chat"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-500 hover:text-gray-300"}`}
        >
          Chat
        </button>
      </div>

      {/* Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* Graph panel */}
        <div className={`
          lg:w-[70%] lg:block lg:h-full min-w-0
          ${activeTab === "graph" ? "flex flex-col flex-1" : "hidden"}
        `}>
          <GraphView highlightedIds={highlightedIds} />
        </div>

        {/* Divider — desktop only */}
        <div className="hidden lg:block w-px bg-gray-800 shrink-0" />

        {/* Chat panel */}
        <div className={`
          lg:w-[30%] lg:block lg:h-full min-w-0
          ${activeTab === "chat" ? "flex flex-col flex-1" : "hidden"}
        `}>
          <ChatPanel onHighlight={setHighlightedIds} />
        </div>
      </div>
    </div>
  );
}
