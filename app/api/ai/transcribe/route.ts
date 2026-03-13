import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { transcribeAudioRequest } from '@/server/aiTranscription';
import { AGENT_TRANSCRIBE_MODEL_FALLBACK } from '@/agents/aiAssist';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await transcribeAudioRequest(
      request,
      'AgentCanvas Forms',
      process.env.OPENROUTER_TRANSCRIBE_MODEL || AGENT_TRANSCRIBE_MODEL_FALLBACK
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to transcribe audio';
    const status = message.startsWith('Unsupported audio format') || message === 'Audio file is required' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
