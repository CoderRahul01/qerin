import { ImageResponse } from "next/og";

const WIDTH = 1200;
const HEIGHT = 630;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const question = truncate(searchParams.get("question") ?? "", 140);
  const answer = truncate(searchParams.get("answer") ?? "", 320);
  const sourceCount = Number(searchParams.get("sourceCount") ?? "0");
  const total = searchParams.get("total") ?? "";

  if (!question || !answer) {
    return new Response("question and answer are required", { status: 400 });
  }

  const sourceLabel = `${sourceCount} verified source${sourceCount === 1 ? "" : "s"}${total ? ` · $${total} paid` : ""}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFF7F0",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: "#F45B00" }} />
          <div style={{ fontWeight: 700, fontSize: 26, color: "#151515" }}>Qerin</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 500, color: "#6B6B6B" }}>{question}</div>
          <div style={{ fontSize: 34, lineHeight: 1.35, fontWeight: 600, color: "#151515" }}>{answer}</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #E9E9E9",
            paddingTop: 24,
          }}
        >
          <div style={{ fontSize: 18, color: "#6B6B6B" }}>{sourceLabel}</div>
          <div style={{ fontSize: 18, color: "#6B6B6B" }}>Verified answers, paid in stablecoins.</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
