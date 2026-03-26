import { useState, useRef, useEffect } from "react";

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: "bot",
    text: "Hello! Ask me anything about the graph — orders, invoices, deliveries, or payments.",
    time: formatTime(new Date()),
    status: "delivered",
  },
];

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function makeId() {
  return Date.now() + Math.random();
}

function friendlyError(data) {
  const msg = data?.error ?? "";
  if (msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests"))
    return "AI quota exceeded. Please wait a moment and try again.";
  if (msg.includes("API_KEY_INVALID") || msg.includes("400"))
    return "Invalid API key. Please update your Gemini API key in the backend .env file.";
  if (msg.includes("502") || msg.includes("Gemini"))
    return "AI service is temporarily unavailable. Please try again shortly.";
  return "Something went wrong. Please try again.";
}

function formatAnswer(answer) {
  if (answer == null)             return "No data found for your query.";
  if (typeof answer === "string") return answer;
  if (Array.isArray(answer)) {
    if (answer.length === 0) return "No results found.";
    return answer.map((item, i) => {
      const fields = Object.entries(item)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return `${i + 1}.\n${fields}`;
    }).join("\n\n");
  }
  const fields = Object.entries(answer)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return fields || "No data found for your query.";
}

export default function ChatPanel({ onHighlight }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input,    setInput]    = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef               = useRef(null);
  const textareaRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", text, time: formatTime(new Date()), status: "sent" },
    ]);
    setInput("");
    setIsTyping(true);

    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/query`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: text }),
      });
      const data = await res.json();
      const botText = res.ok ? formatAnswer(data.answer) : friendlyError(data);

      if (res.ok && Array.isArray(data.nodeIds)) {
        onHighlight(data.nodeIds.map(String));
      }

      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "bot", text: botText, time: formatTime(new Date()), status: "delivered" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id:     makeId(),
          role:   "bot",
          text:   "Unable to connect to the server. Please make sure the backend is running.",
          time:   formatTime(new Date()),
          status: "error",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const canSend = input.trim().length > 0 && !isTyping;

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      <Header />

      <div
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 space-y-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}
      >
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isFirst={messages[i - 1]?.role !== msg.role}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <InputBar
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        canSend={canSend}
        textareaRef={textareaRef}
        isTyping={isTyping}
      />
    </div>
  );
}

function Header() {
  return (
    <div className="shrink-0 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4
                    bg-[#0f1117] border-b border-gray-800/60">
      <div className="relative shrink-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                        flex items-center justify-center text-xs font-bold text-white shadow-lg">
          AI
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full
                         bg-emerald-400 border-2 border-[#0f1117]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-white leading-tight">Graph Assistant</p>
        <p className="text-[10px] sm:text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          Online
        </p>
      </div>

      <div className="shrink-0 px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700">
        <span className="text-[10px] text-gray-400 font-medium">Graph AI</span>
      </div>
    </div>
  );
}

function MessageBubble({ message, isFirst }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-end gap-2 sm:gap-2.5
      ${isUser ? "flex-row-reverse" : "flex-row"}
      ${isFirst ? "mt-4 sm:mt-5" : "mt-1 sm:mt-1.5"}`}
    >
      <div className="w-6 sm:w-7 shrink-0 self-end">
        {!isUser && isFirst && (
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                          flex items-center justify-center text-[9px] font-bold text-white shadow">
            AI
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-1 sm:gap-1.5 max-w-[85%] sm:max-w-[80%]
        ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm leading-relaxed
          break-words whitespace-pre-wrap shadow-sm
          ${isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-br-none"
            : message.status === "error"
            ? "bg-red-950/60 text-red-300 rounded-2xl rounded-bl-none border border-red-800/50"
            : "bg-gray-800/90 text-gray-100 rounded-2xl rounded-bl-none border border-gray-700/40"
          }`}
        >
          {message.text}
        </div>

        <div className={`flex items-center gap-1 sm:gap-1.5 px-1
          ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px] text-gray-600">{message.time}</span>
          {isUser && <Tick status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function Tick({ status }) {
  if (status === "sent") {
    return (
      <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
        <polyline points="20 12 9 23 4 18" />
      </svg>
    );
  }
  return null;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 sm:gap-2.5 mt-4 sm:mt-5">
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                      flex items-center justify-center text-[9px] font-bold text-white shrink-0">
        AI
      </div>
      <div className="bg-gray-800/90 border border-gray-700/40 rounded-2xl rounded-bl-none
                      px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:160ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:320ms]" />
      </div>
    </div>
  );
}

function InputBar({ input, setInput, onSend, onKeyDown, canSend, textareaRef, isTyping }) {
  return (
    <div className="shrink-0 bg-[#0f1117] border-t border-gray-800/60 px-3 sm:px-4 pt-2.5 sm:pt-3 pb-3 sm:pb-4">
      <div className={`flex items-end gap-2 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3
        bg-gray-800/70 border transition-all duration-200
        ${input
          ? "border-blue-500/60 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
          : "border-gray-700/50"}`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about orders, invoices…"
          disabled={isTyping}
          className="flex-1 bg-transparent text-xs sm:text-sm text-gray-200 placeholder-gray-500
                     resize-none outline-none leading-[1.5] overflow-y-auto disabled:opacity-50"
          style={{ maxHeight: "120px" }}
        />

        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send"
          className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
            transition-all duration-150
            ${canSend
              ? "bg-blue-600 hover:bg-blue-500 active:scale-90 shadow-md shadow-blue-900/40"
              : "bg-gray-700/60 cursor-not-allowed"}`}
        >
          <SendIcon active={canSend} />
        </button>
      </div>

      <p className="text-[10px] text-gray-600 mt-1.5 sm:mt-2 text-center tracking-wide hidden sm:block">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}

function SendIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
         className={`w-4 h-4 ${active ? "text-white" : "text-gray-500"}`}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
