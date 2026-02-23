import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";

function extractText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = (await request.json()) as { prompt?: string };
    const cleanPrompt = prompt?.trim();

    if (!cleanPrompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing on server" },
        { status: 500 },
      );
    }

    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: cleanPrompt }],
        temperature: 0.9,
        max_tokens: 220,
      }),
      cache: "no-store",
    });

    const raw = await upstream.text();
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

    if (!upstream.ok) {
      const message =
        (parsed?.error as { message?: string } | undefined)?.message ??
        (typeof parsed?.detail === "string" ? parsed.detail : undefined) ??
        "Generation failed";
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    const choices = parsed?.choices as Array<{ message?: { content?: unknown } }> | undefined;
    const content = choices?.[0]?.message?.content;
    const text = extractText(content);

    return NextResponse.json({ text: text || "Empty response from model" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
