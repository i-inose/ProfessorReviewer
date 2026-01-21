import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/mastra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "text-delta" && data.delta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.delta }
                    : m
                )
              );
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        padding: "32px 40px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto" }}>
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 32,
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                background: "#e8f5e9",
                borderRadius: 4,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#4caf50",
                  letterSpacing: "0.05em",
                }}
              >
                やさしいモード
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.3,
              }}
            >
              素人質問教授コードレビュー
            </h1>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 13,
                color: "#666",
                lineHeight: 1.6,
              }}
            >
              コードを貼ると、教授がやさしく1つずつ質問します。
            </p>
          </div>

          <Link
            to="/review"
            style={{
              padding: "8px 16px",
              background: "#fff",
              color: "#333",
              textDecoration: "none",
              borderRadius: 6,
              fontWeight: 500,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              flexShrink: 0,
              border: "1px solid #ddd",
            }}
          >
            鬼モードへ
            <span style={{ fontSize: 12 }}>→</span>
          </Link>
        </div>

        {/* 会話ログ */}
        <div
          ref={logRef}
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            minHeight: 300,
            maxHeight: 420,
            overflowY: "auto",
            marginBottom: 16,
            border: "1px solid #e8e8e8",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                color: "#999",
                fontSize: 13,
                textAlign: "center",
                padding: "40px 0",
              }}
            >
              まだ会話はありません。
              <br />
              下のフォームにコードを貼って送信してください。
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                marginBottom: 12,
                padding: 14,
                borderRadius: 10,
                background: m.role === "user" ? "#f5f5f5" : "#e8f5e9",
                borderLeft:
                  m.role === "user"
                    ? "3px solid #bdbdbd"
                    : "3px solid #4caf50",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: m.role === "user" ? "#757575" : "#388e3c",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {m.role === "user" ? (
                  "あなた"
                ) : (
                  <>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        background: "#4caf50",
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    />
                    教授
                  </>
                )}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#333",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div style={{ color: "#999", fontSize: 13, textAlign: "center" }}>
              教授が考え中...
            </div>
          )}
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="コードまたは回答を入力..."
            rows={4}
            style={{
              width: "100%",
              padding: 16,
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6,
              resize: "vertical",
              background: "#fff",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "#999" }}>
              {error && (
                <span style={{ color: "#e53935" }}>Error: {error.message}</span>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: isLoading || !input.trim() ? "#e0e0e0" : "#4caf50",
                color: isLoading || !input.trim() ? "#999" : "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isLoading ? "送信中..." : "送信する"}
              {!isLoading && <span>→</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}