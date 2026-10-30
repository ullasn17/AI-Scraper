import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { Scheme } from '@/models/Scheme';
import { Source } from '@/models/Source';
import { ChatSession } from '@/models/ChatSession';
import { getCurrentUser } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { classifyIntent, answerGeneralQuestion, answerSchemeQuestion } from '@/lib/ai/groq';
import { buildSmartSearchFilter, rankSchemesByRelevance } from '@/lib/search/smartSearch';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`chat_${ip}`, 40, 60000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before sending another message.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, sessionId: providedSessionId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message exceeds 2000 character limit' }, { status: 400 });
    }

    await connectDB();
    const currentUser = await getCurrentUser(req);
    const sessionId = providedSessionId || crypto.randomUUID();

    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      session = await ChatSession.create({
        sessionId,
        userId: currentUser?.userId,
        title: message.substring(0, 40) + '...',
        messages: [],
      });
    }

    // Classify intent using Groq
    const intent = await classifyIntent(message);

    // Prepare previous history context (up to last 6 messages)
    const history = session.messages.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    let replyText = '';
    let citedSchemes: Array<{ schemeId?: string; title: string; slug?: string; url?: string }> = [];

    if (intent === 'GENERAL') {
      // Mode A: General purpose AI
      replyText = await answerGeneralQuestion(message, history);
    } else {
      // Mode B: Government Scheme RAG
      // Only include schemes from active, enabled sources
      const enabledSources = await Source.find({ isEnabled: true }, { _id: 1 }).lean();
      const enabledSourceIds = enabledSources.map((s) => s._id);

      const isJobQuery = /job|jobs|recruit|vacancy|vacancies|employment|hiring|post|posts|exam|apprentice|rrb|kea|railway/i.test(message);

      const smartFilter = buildSmartSearchFilter(message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchConditions: any[] = [];
      if (smartFilter.$or && smartFilter.$or.length > 0) {
        matchConditions.push(...smartFilter.$or);
      }

      if (isJobQuery) {
        matchConditions.push({ category: 'EMPLOYMENT' });
        matchConditions.push({ name: { $regex: 'recruitment|officer|teacher|technician|pilot|apprentice|examination|kea|rrb', $options: 'i' } });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queryConditions: any = {
        verificationStatus: 'VERIFIED',
        sourceId: { $in: enabledSourceIds },
      };
      if (matchConditions.length > 0) {
        queryConditions.$or = matchConditions;
      }

      let schemes = await Scheme.find(queryConditions)
        .limit(60)
        .lean();

      // Fallback: if no match, grab top verified schemes from enabled sources
      if (schemes.length === 0) {
        schemes = await Scheme.find({
          verificationStatus: 'VERIFIED',
          sourceId: { $in: enabledSourceIds },
          ...(isJobQuery ? { category: 'EMPLOYMENT' } : {}),
        })
          .sort({ applicationEndDate: -1, createdAt: -1 })
          .limit(isJobQuery ? 6 : 4)
          .lean();
      } else {
        // Rank schemes by relevance score using title, summary, tokens, and synonyms
        schemes = rankSchemesByRelevance(schemes, message).slice(0, 6);
      }

      const ragResult = await answerSchemeQuestion(message, schemes, history);
      replyText = ragResult.answer;
      citedSchemes = ragResult.citedSchemes;
    }

    // Save user message and assistant reply to DB session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
      mode: intent,
    });

    session.messages.push({
      role: 'assistant',
      content: replyText,
      timestamp: new Date(),
      mode: intent,
      citedSchemes: citedSchemes.map((s) => ({
        schemeId: s.schemeId,
        title: s.title,
        slug: s.slug,
        url: s.url,
      })),
    });

    if (currentUser?.userId && !session.userId) {
      session.userId = currentUser.userId as unknown as import('mongoose').Types.ObjectId;
    }

    await session.save();

    return NextResponse.json({
      sessionId,
      intent,
      reply: replyText,
      citedSchemes,
      timestamp: new Date(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error in AI Chatbot';
    console.error('Chat error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
