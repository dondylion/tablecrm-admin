import { NextRequest, NextResponse } from "next/server";

const TABLECRM_URL = "https://app.tablecrm.com/api/v1/nomenclature/";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = process.env.TABLECRM_TOKEN ?? "af1874616430e04cfd4bce30035789907e899fc7c3a1a4bb27254828ff304a77";

    const payload = Array.isArray(body) ? body : [body];

    const upstream = await fetch(`${TABLECRM_URL}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const rawText = await upstream.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { detail: rawText || "Empty response" };
    }

    return NextResponse.json(parsed, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
