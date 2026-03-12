import { describe, expect, it } from 'vitest';
import { encodeWavAudio } from '@/strategy/audioRecording';

describe('Transformation Map audio recording helpers', () => {
  it('encodes mono float samples into a wav blob', async () => {
    const blob = encodeWavAudio(
      [new Float32Array([0, 0.5, -0.5, 1, -1])],
      16000
    );

    expect(blob.type).toBe('audio/wav');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WAVE');
    expect(String.fromCharCode(...bytes.slice(36, 40))).toBe('data');
  });
});
