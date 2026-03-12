import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { AGENT_TRANSCRIBE_MODEL_FALLBACK } from '@/agents/aiAssist';
import { transcribeAudioRequest } from '@/server/aiTranscription';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await transcribeAudioRequest(
      request,
      'AgentCanvas Agent Forms',
      process.env.OPENROUTER_AGENT_TRANSCRIBE_MODEL || AGENT_TRANSCRIBE_MODEL_FALLBACK
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Agent transcription failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to transcribe audio';
    const status = message.startsWith('Unsupported audio format') || message === 'Audio file is required' ? 400 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
