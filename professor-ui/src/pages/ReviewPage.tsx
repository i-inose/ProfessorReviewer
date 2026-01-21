import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

type Question = {
  question: string;
  intent: string;
  hint: string;
};

type ReviewResult = {
  text: string;
  data: {
    title: string;
    questions: Question[];
    quickWins?: string[] | string;
  };
};

// quickWins を配列に正規化するヘルパー
function normalizeQuickWins(quickWins?: string[] | string): string[] {
  if (!quickWins) return [];
  return Array.isArray(quickWins) ? quickWins : [quickWins];
}

export default function ReviewPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // 結果が来たらオーバーレイを表示
  useEffect(() => {
    if (result) {
      setShowOverlay(true);
      const timer = setTimeout(() => setShowOverlay(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/mastra/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const text = await res.text();
      console.log("Response status:", res.status);
      console.log("Response text:", text);

      if (!res.ok) {
        throw new Error(`API error: ${res.status} - ${text}`);
      }

      if (!text) {
        throw new Error("Empty response from server");
      }

      const data = JSON.parse(text);
      setResult(data);
    } catch (err) {
      console.error("Review error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)",
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
                background: "linear-gradient(135deg, #b71c1c 0%, #880e0e 100%)",
                borderRadius: 4,
                marginBottom: 12,
                boxShadow: "0 0 12px rgba(183, 28, 28, 0.5)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fff",
                  letterSpacing: "0.05em",
                }}
              >
                鬼モード
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.3,
              }}
            >
              素人質問教授コードレビュー
            </h1>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 13,
                color: "#ff6b6b",
                lineHeight: 1.6,
              }}
            >
              コードを貼ると、教授が容赦なく大量の質問を投げつけます。
            </p>
          </div>

          <Link
            to="/"
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.05)",
              color: "#888",
              textDecoration: "none",
              borderRadius: 6,
              fontWeight: 500,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              flexShrink: 0,
              border: "1px solid #333",
            }}
          >
            やさしいモードへ逃げる
            <span style={{ fontSize: 12 }}>→</span>
          </Link>
        </div>

        {/* 結果表示エリア（会話ログ風） */}
        <div
          style={{
            background: "rgba(30, 10, 10, 0.8)",
            borderRadius: 12,
            padding: 20,
            minHeight: 300,
            maxHeight: 420,
            overflowY: "auto",
            marginBottom: 16,
            border: "1px solid #3d1515",
            boxShadow: "0 0 20px rgba(139, 0, 0, 0.2)",
          }}
        >
          {/* 初期状態 */}
          {!result && !isLoading && (
            <div
              style={{
                color: "#666",
                fontSize: 13,
                textAlign: "center",
                padding: "40px 0",
              }}
            >
              まだレビュー結果はありません。
              <br />
              下のフォームにコードを貼って送信してください。
            </div>
          )}

          {/* ローディング */}
          {isLoading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 12,
                  animation: "pulse 1s infinite",
                  filter: "drop-shadow(0 0 10px rgba(255, 0, 0, 0.5))",
                }}
              >
                👹
              </div>
              <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>
                鬼があなたのコードを睨んでいます...
              </p>
            </div>
          )}

          {/* 結果表示 */}
          {result && (
            <>
              <h2
                style={{
                  margin: "0 0 16px 0",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#ff4444",
                  textShadow: "0 0 10px rgba(255, 68, 68, 0.3)",
                }}
              >
                {result.data.title}
              </h2>

              <p
                style={{
                  color: "#ff6b6b",
                  fontSize: 13,
                  fontStyle: "italic",
                  margin: "0 0 20px 0",
                  paddingBottom: 16,
                  borderBottom: "1px solid #3d1515",
                }}
              >
                素人質問で恐縮ですが...（恐縮などしていない）
              </p>

              {/* 質問リスト */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {result.data.questions.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      background: "rgba(10, 5, 5, 0.8)",
                      borderLeft: "3px solid #b71c1c",
                      boxShadow: "inset 0 0 20px rgba(139, 0, 0, 0.1)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#ff4444",
                        marginBottom: 6,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Q{i + 1}
                    </div>
                    <h3
                      style={{
                        color: "#fff",
                        margin: "0 0 10px 0",
                        fontSize: 14,
                        fontWeight: 500,
                        lineHeight: 1.5,
                      }}
                    >
                      {q.question}
                    </h3>
                    <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>
                      <p style={{ margin: "0 0 4px 0" }}>
                        <span style={{ color: "#ff6b6b" }}>意図:</span> {q.intent}
                      </p>
                      <p style={{ margin: 0 }}>
                        <span style={{ color: "#ffa726" }}>ヒント:</span> {q.hint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Wins */}
              {normalizeQuickWins(result.data.quickWins).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#ffa726",
                      margin: "0 0 12px 0",
                    }}
                  >
                    今すぐ直せ（言い訳無用）
                  </h3>
                  <ul
                    style={{
                      background: "rgba(10, 5, 5, 0.8)",
                      borderRadius: 8,
                      padding: "12px 12px 12px 28px",
                      margin: 0,
                      borderLeft: "3px solid #ffa726",
                    }}
                  >
                    {normalizeQuickWins(result.data.quickWins).map((w, i) => (
                      <li
                        key={i}
                        style={{ color: "#ccc", marginBottom: 6, fontSize: 13 }}
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit}>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ここにコードを差し出せ..."
            rows={4}
            style={{
              width: "100%",
              padding: 16,
              border: "1px solid #3d1515",
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6,
              resize: "vertical",
              background: "#0a0505",
              color: "#e0e0e0",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
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
            <div style={{ fontSize: 12, color: "#666" }}>
              {error && (
                <span style={{ color: "#ff4444" }}>Error: {error}</span>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background:
                  isLoading || !code.trim()
                    ? "#2a1515"
                    : "linear-gradient(135deg, #c62828 0%, #8b0000 100%)",
                color: isLoading || !code.trim() ? "#555" : "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: isLoading || !code.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow:
                  isLoading || !code.trim()
                    ? "none"
                    : "0 0 15px rgba(198, 40, 40, 0.5)",
              }}
            >
              {isLoading ? "審判中..." : "鬼レビュー開始"}
              {!isLoading && <span>→</span>}
            </button>
          </div>
        </form>
      </div>

      {/* 画面中央オーバーレイ */}
      {showOverlay && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <p
            style={{
              color: "#ff6b6b",
              fontSize: 48,
              fontWeight: 700,
              fontStyle: "italic",
              textShadow: "0 0 40px rgba(255, 0, 0, 0.9), 0 0 80px rgba(255, 0, 0, 0.6)",
              animation: "centerShrink 2s ease-out forwards",
            }}
          >
            素人質問で恐縮ですが...（恐縮などしていない）
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes centerShrink {
          0% {
            transform: scale(3.5);
            opacity: 1;
          }
          60% {
            transform: scale(1.2);
            opacity: 1;
          }
          85% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.9);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
