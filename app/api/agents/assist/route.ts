import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { OpenRouterClient } from '@/server/openrouter';
import {
  extractOpenRouterTextContent,
  parseJsonObject,
} from '@/server/transformationMapAi';
import {
  buildAgentGlobalExtractMessages,
  normalizeAgentAssistResult,
} from '@/server/agentAi';
import {
  AGENT_ASSIST_MODEL_FALLBACK,
  DEFAULT_AGENT_GLOBAL_ASSIST_PROMPT,
  type AgentAssistRequest,
} from '@/agents/aiAssist';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as AgentAssistRequest;
    if (!body.notes?.trim()) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }

    const client = OpenRouterClient.fromEnv('AgentCanvas Agent Forms');
    const model =
      body.model?.trim() ||
      process.env.OPENROUTER_AGENT_ASSIST_MODEL ||
      AGENT_ASSIST_MODEL_FALLBACK;

    const response = await client.chat({
      model,
      messages: buildAgentGlobalExtractMessages({
        promptOverride: body.promptOverride?.trim() || DEFAULT_AGENT_GLOBAL_ASSIST_PROMPT,
        notes: body.notes,
        context: body.context,
      }),
      temperature: 0.2,
      maxTokens: 1600,
      responseFormat: { type: 'json_object' },
    });

    const rawText = extractOpenRouterTextContent(response);
    const parsed = parseJsonObject<Record<string, unknown>>(rawText);
    return NextResponse.json({
      ok: true,
      ...normalizeAgentAssistResult(parsed, model, body.context),
    });
  } catch (error) {
    console.error('Agent assist failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assist agent form' },
      { status: 500 }
    );
  }
}
