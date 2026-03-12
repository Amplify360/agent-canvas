import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { OpenRouterClient } from '@/server/openrouter';
import { SERVICE_TRANSCRIBE_MODEL_FALLBACK } from '@/strategy/aiAssist';
import { extractOpenRouterTextContent } from '@/server/transformationMapAi';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const arrayBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const model =
      (formData.get('model')?.toString().trim()) ||
      process.env.OPENROUTER_TRANSFORMATION_MAP_TRANSCRIBE_MODEL ||
      SERVICE_TRANSCRIBE_MODEL_FALLBACK;
    const audioFormat = audio.type.includes('webm') ? 'webm' : audio.type.includes('mp4') ? 'mp4' : 'wav';

    const client = OpenRouterClient.fromEnv('AgentCanvas Transformation Map');
    const response = await client.chat({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe this audio into plain text. Return only the transcript with no commentary.',
            },
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: audioFormat,
              },
            },
          ],
        },
      ],
      temperature: 0,
      maxTokens: 1200,
    });

    return NextResponse.json({
      ok: true,
      transcript: extractOpenRouterTextContent(response),
      model,
    });
  } catch (error) {
    console.error('Transformation Map transcription failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
