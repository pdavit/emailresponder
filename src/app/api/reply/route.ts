import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { db } from '@/lib/db';
import { history } from '@/db/schema';

export const runtime = "nodejs";

type Stance = "positive" | "negative" | "neutral";

function stanceInstruction(stance: Stance) {
  if (stance === "positive") {
    return `STANCE: POSITIVE.
- If the sender requests a meeting/call/approval, accept when reasonable.
- Confirm next steps briefly.
- If no time was proposed, suggest 2 specific time slots.`;
  }
  if (stance === "negative") {
    return `STANCE: NEGATIVE.
- Politely decline the request.
- Provide a brief, generic reason.
- Offer exactly one alternative (different time/channel/next week/asynchronous update). Keep it short and courteous.`;
  }
  return `STANCE: NEUTRAL.
- Acknowledge the message.
- If needed, ask one focused clarifying question.
- Do not accept or decline.`;
}

const SYSTEM_BASE = `You write short, professional email replies.
- Keep 4–8 sentences max.
- Respect the selected stance, tone, and language.
- Preserve dates/facts from the original email.
- Use the user's signature if available.`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Re-gate behind subscription after Stripe reintegration
    // For now, allow access to all authenticated users

    const { subject, originalEmail, language, tone, stance = "positive" } = await request.json();

    if (!subject || !originalEmail || !language || !tone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate stance
    const validStance = (stance as Stance) ?? "positive";
    if (!["positive", "negative", "neutral"].includes(validStance)) {
      return NextResponse.json({ error: 'Invalid stance value' }, { status: 400 });
    }

    console.log('Generating reply with stance:', { userId, stance: validStance, tone, language });

    // Build system prompt with stance conditioning
    const system = [
      SYSTEM_BASE,
      stanceInstruction(validStance),
      `Tone: ${tone}. Language: ${language}.`
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Subject: ${subject}\n\nEmail:\n${originalEmail}` }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || '';

    if (!reply) {
      return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 });
    }

    // Save to history
    await db.insert(history).values({
      userId,
      subject,
      originalEmail,
      reply,
      language,
      tone,
      message: `Generated with stance: ${validStance}`,
    });

    return NextResponse.json({ 
      reply, 
      meta: { stance: validStance, tone, language } 
    });

  } catch (error) {
    console.error('GENERATION_ERROR', error);
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
}
