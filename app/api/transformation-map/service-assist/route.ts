import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { OpenRouterClient } from '@/server/openrouter';
import {
  buildServiceFieldImproveMessages,
  buildServiceGlobalExtractMessages,
  extractOpenRouterTextContent,
  normalizeServiceAssistResult,
  normalizeServiceFieldImproveResult,
  parseJsonObject,
} from '@/server/transformationMapAi';
import {
  DEFAULT_SERVICE_FIELD_IMPROVE_PROMPT,
  DEFAULT_SERVICE_GLOBAL_ASSIST_PROMPT,
  SERVICE_ASSIST_MODEL_FALLBACK,
  type ServiceAssistRequest,
} from '@/strategy/aiAssist';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as ServiceAssistRequest;
    const client = OpenRouterClient.fromEnv('AgentCanvas Transformation Map');
    const model = body.model?.trim() || process.env.OPENROUTER_TRANSFORMATION_MAP_ASSIST_MODEL || SERVICE_ASSIST_MODEL_FALLBACK;

    if (body.mode === 'global_extract') {
      if (!body.notes?.trim()) {
        return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
      }

      const response = await client.chat({
        model,
        messages: buildServiceGlobalExtractMessages({
          promptOverride: body.promptOverride?.trim() || DEFAULT_SERVICE_GLOBAL_ASSIST_PROMPT,
          notes: body.notes,
          context: body.context,
        }),
        temperature: 0.2,
        maxTokens: 1400,
        responseFormat: { type: 'json_object' },
      });

      const rawText = extractOpenRouterTextContent(response);
      const parsed = parseJsonObject<Record<string, unknown>>(rawText);
      return NextResponse.json({
        ok: true,
        ...normalizeServiceAssistResult(parsed, model),
      });
    }

    if (!body.targetField) {
      return NextResponse.json({ error: 'Target field is required' }, { status: 400 });
    }

    const response = await client.chat({
      model,
      messages: buildServiceFieldImproveMessages({
        instruction: body.promptOverride?.trim() || DEFAULT_SERVICE_FIELD_IMPROVE_PROMPT,
        targetField: body.targetField,
        context: body.context,
      }),
      temperature: 0.25,
      maxTokens: 500,
      responseFormat: { type: 'json_object' },
    });

    const rawText = extractOpenRouterTextContent(response);
    const parsed = parseJsonObject<Record<string, unknown>>(rawText);
    return NextResponse.json({
      ok: true,
      ...normalizeServiceFieldImproveResult(parsed, model, body.targetField),
    });
  } catch (error) {
    console.error('Transformation Map service assist failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assist service form' },
      { status: 500 }
    );
  }
}
