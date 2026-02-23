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

function extractTextFromResponse(parsed: Record<string, unknown>): string {
  const choices = parsed?.choices as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(choices) && choices.length > 0) {
    for (const choice of choices) {
      const message = choice?.message as Record<string, unknown> | undefined;
      const fromMessage = extractText(message?.content);
      if (fromMessage) {
        return fromMessage;
      }

      const fromText = typeof choice?.text === "string" ? choice.text.trim() : "";
      if (fromText) {
        return fromText;
      }

      const reasoning = typeof choice?.reasoning === "string" ? choice.reasoning.trim() : "";
      if (reasoning) {
        return reasoning;
      }
    }
  }

  const outputText = typeof parsed?.output_text === "string" ? parsed.output_text.trim() : "";
  if (outputText) {
    return outputText;
  }

  const output = parsed?.output as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item?.content as unknown;
      const fromContent = extractText(content);
      if (fromContent) {
        return fromContent;
      }
    }
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
        temperature: 0.7,
        max_tokens: 700,
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

    const text = extractTextFromResponse(parsed);

    if (!text) {
      const providerHint =
        typeof parsed?.provider === "string"
          ? parsed.provider
          : (parsed?.error as { message?: string } | undefined)?.message;
      return NextResponse.json(
        {
          error: providerHint
            ? `Модель не вернула текст (provider: ${providerHint}). Попробуйте снова.`
            : "Модель не вернула текст. Попробуйте снова.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
