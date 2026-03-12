import { OpenRouterClient } from '@/server/openrouter';
import { extractOpenRouterTextContent } from '@/server/transformationMapAi';

export async function transcribeAudioRequest(request: Request, appTitle: string, fallbackModel: string) {
  const formData = await request.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof File)) {
    throw new Error('Audio file is required');
  }

  const arrayBuffer = await audio.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  const model = (formData.get('model')?.toString().trim()) || fallbackModel;
  const audioFormat = audio.type.includes('mpeg') || audio.type.includes('mp3')
    ? 'mp3'
    : audio.type.includes('wav')
      ? 'wav'
      : null;

  if (!audioFormat) {
    throw new Error('Unsupported audio format. Please provide wav or mp3 audio.');
  }

  const client = OpenRouterClient.fromEnv(appTitle);
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

  return {
    transcript: extractOpenRouterTextContent(response),
    model,
  };
}
