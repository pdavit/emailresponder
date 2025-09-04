import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SHARED_SECRET = process.env.ER_SHARED_SECRET!;
const ALLOWED_ORIGINS = new Set(["https://script.google.com", "https://script.googleapis.com"]);

const LanguageEnum = z.enum([
  "en", "es", "de", "fr", "zh",
  "zh-Hant", "ja", "ko", "it",
  "pt-BR", "ru", "hi", "hy"
]);
const ToneEnum = z.enum(["concise", "friendly", "formal", "professional", "casual"]);
const StanceEnum = z.enum(["positive", "neutral", "negative"]);
const LengthEnum = z.enum(["short", "medium", "long"]);

const PayloadSchema = z.object({
  subject: z.string().max(300).default(""),
  body: z.string().max(20000).default(""),
  language: LanguageEnum.default("en"),
  tone: ToneEnum.default("concise"),
  stance: StanceEnum.default("positive"),
  length: LengthEnum.default("short"),
  threadMessageId: z.string().optional(),
});

function setCors(res: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  } else if (!origin) {
    res.headers.set("Access-Control-Allow-Origin", "*");
  }
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type,x-er-shared-secret");
}

export async function OPTIONS(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  setCors(res, req.headers.get("origin"));
  return res;
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-er-shared-secret") !== SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof PayloadSchema>;
  try {
    parsed = PayloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "bad_request", details: String(err) }, { status: 400 });
  }

  const { subject, body, language, tone, stance, length } = parsed;
  const cleaned = sanitizeEmailBody(body);

  const reply = await generateReplyFromEmail({ subject, originalBody: cleaned, language, tone, stance, length });

  const res = NextResponse.json({ reply });
  setCors(res, req.headers.get("origin"));
  return res;
}

async function generateReplyFromEmail(args: {
  subject: string;
  originalBody: string;
  language: z.infer<typeof LanguageEnum>;
  tone: z.infer<typeof ToneEnum>;
  stance: z.infer<typeof StanceEnum>;
  length: z.infer<typeof LengthEnum>;
}): Promise<string> {
  const { subject, originalBody, language, tone, stance, length } = args;

  const languageName = {
    en: "English",
    es: "Spanish",
    de: "German",
    fr: "French",
    zh: "Chinese (Simplified)",
    "zh-Hant": "Chinese (Traditional)",
    ja: "Japanese",
    ko: "Korean",
    it: "Italian",
    "pt-BR": "Portuguese (Brazil)",
    ru: "Russian",
    hi: "Hindi",
    hy: "Armenian"
  }[language];

  const lengthRule =
    length === "short"
      ? "Aim for 2–3 short sentences."
      : length === "medium"
      ? "Aim for 3–5 sentences, balanced detail."
      : "Aim for 5–7 sentences with more elaboration.";

  const system = [
    "You are EmailResponder, an assistant that drafts professional Gmail replies.",
    `Write strictly in ${languageName}.`,
    tone === "concise" ? "Keep it brief and direct." : `Apply a ${tone} tone.`,
    stance === "negative" ? "Politely decline or push back if necessary." :
    stance === "neutral" ? "Keep a neutral tone without bias." :
    "Keep a positive, friendly attitude.",
    lengthRule,
    "Do not quote the original message.",
    "End with a brief sign-off like 'Best,'."
  ].join("\n");

  const user = [
    `SUBJECT: ${subject || "(no subject)"}`,
    "ORIGINAL EMAIL:",
    originalBody,
    "",
    "Generate the reply body only (no subject line)."
  ].join("\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: tone === "concise" ? 0.3 : 0.6,
        max_tokens: length === "long" ? 450 : length === "medium" ? 320 : 220,
      });

      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return hardTrim(text);
    } catch (err) {
      console.error("OpenAI generation failed:", err);
    }
  }

  return hardTrim([
    stance === "negative"
      ? "Thanks for reaching out. Unfortunately I’m not available at that time, but I’d be happy to meet next week."
      : stance === "neutral"
      ? "Thanks for your message. Tomorrow at 10 AM or 2 PM works for me—let me know what you prefer."
      : "Thanks for the note—happy to connect! Tomorrow at 10 AM or 2 PM works; share a time if that doesn’t fit.",
    "",
    "Best,",
    "John"
  ].join("\n"));
}

function sanitizeEmailBody(input: string): string {
  return (input || "")
    .replace(/^[>].*$/gm, "")                       // quoted lines starting with >
    .replace(/On .*wrote:([\s\S]*)$/i, "")          // "On Mon..., X wrote:" block
    .replace(/From:.*\nSent:.*\nTo:.*\nSubject:.*\n/gi, "") // header blocks
    .replace(/--\s*\n[\s\S]*$/ , "")                // signature delimiter (no /s flag)
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 10000);
}

function hardTrim(text: string): string {
  return text.replace(/^["'`]+|["'`]+$/g, "").trim();
}
