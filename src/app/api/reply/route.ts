import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { db } from '@/lib/db';
import { history } from '@/db/schema';
import { checkSubscriptionStatus } from '@/lib/subscription';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionStatus = await checkSubscriptionStatus(userId);
    if (!subscriptionStatus) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
    }

    const { subject, originalEmail, language, tone } = await request.json();

    if (!subject || !originalEmail || !language || !tone) {
      return NextResponse.json({ error: 'Missing required fields: subject, originalEmail, language, tone' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const systemPrompt = 'You are an expert business email assistant. Your task is to help users write polite, professional email replies in multiple languages. You understand cultural norms and appropriate business language for each region.';

    const userPrompt = `Original email:\n${originalEmail}\n\nPlease generate a polite and professional reply in ${language}, using a ${tone} tone. If the email is a question or request, the reply should appropriately address it. Keep the response concise and natural for business communication.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 });
    }

    try {
   await db.insert(history).values({
  subject,
  originalEmail,
  reply,
  language,
  tone,
  message: originalEmail, // ✅ Rename this so it passes validation
  userId,
});
    } catch (dbError) {
      console.error('⚠️ Error saving to database:', dbError);
      // Continue with response even if database save fails
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('❌ Error generating email reply:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 401 });
      }
      if (error.message.includes('quota')) {
        return NextResponse.json({ error: 'OpenAI API quota exceeded' }, { status: 429 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
