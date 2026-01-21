export type ReviewResult = {
  text: string;
  data: {
    title: string;
    nativeQuestions: { q: string; intent: string; tryThis: string }[];
    quickWins?: string[];
  };
};

export async function callReview(code: string): Promise<ReviewResult> {
  const res = await fetch("/mastra/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Review API error: ${res.status} ${msg}`);
  }

  return res.json();
}
