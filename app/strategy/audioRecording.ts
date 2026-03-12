export function encodeWavAudio(chunks: Float32Array[], sampleRate: number): Blob {
  const frameCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const pcmData = new Int16Array(frameCount);

  let offset = 0;
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index]));
      pcmData[offset] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      offset += 1;
    }
  }

  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  let byteOffset = 44;
  for (const sample of pcmData) {
    view.setInt16(byteOffset, sample, true);
    byteOffset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

