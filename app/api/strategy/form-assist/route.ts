import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { OpenRouterClient } from '@/server/openrouter';
import { extractOpenRouterTextContent, parseJsonObject } from '@/server/transformationMapAi';
import { buildStrategyFormAssistMessages, normalizeStrategyFormAssistResult } from '@/server/strategyFormAi';
import {
  DEFAULT_DEPARTMENT_ASSIST_PROMPT,
  DEFAULT_DEVIATION_ASSIST_PROMPT,
  DEFAULT_FLOW_STEP_ASSIST_PROMPT,
  DEFAULT_INITIATIVE_ASSIST_PROMPT,
  DEFAULT_OBJECTIVE_ASSIST_PROMPT,
  DEFAULT_PRESSURE_ASSIST_PROMPT,
  STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
  type StrategyFormAssistRequest,
} from '@/strategy/formAssist';

export const runtime = 'nodejs';

const DEFAULT_PROMPTS: Record<StrategyFormAssistRequest['formType'], string> = {
  pressure: DEFAULT_PRESSURE_ASSIST_PROMPT,
  objective: DEFAULT_OBJECTIVE_ASSIST_PROMPT,
  department: DEFAULT_DEPARTMENT_ASSIST_PROMPT,
  'flow-step': DEFAULT_FLOW_STEP_ASSIST_PROMPT,
  deviation: DEFAULT_DEVIATION_ASSIST_PROMPT,
  initiative: DEFAULT_INITIATIVE_ASSIST_PROMPT,
};

export async function POST(request: Request) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as StrategyFormAssistRequest;
    if (!body.notes?.trim()) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }

    const client = OpenRouterClient.fromEnv('AgentCanvas Strategy Forms');
    const model =
      body.model?.trim() ||
      process.env.OPENROUTER_STRATEGY_FORM_ASSIST_MODEL ||
      STRATEGY_FORM_ASSIST_MODEL_FALLBACK;
    const prompt = body.promptOverride?.trim() || DEFAULT_PROMPTS[body.formType];

    const response = await client.chat({
      model,
      messages: buildStrategyFormAssistMessages(body, prompt),
      temperature: 0.2,
      maxTokens: 1400,
      responseFormat: { type: 'json_object' },
    });

    const rawText = extractOpenRouterTextContent(response);
    const parsed = parseJsonObject<Record<string, unknown>>(rawText);
    return NextResponse.json({
      ok: true,
      ...normalizeStrategyFormAssistResult(parsed, body, model),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assist strategy form' },
      { status: 500 }
    );
  }
}
