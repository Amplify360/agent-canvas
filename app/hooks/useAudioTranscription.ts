'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeWavAudio } from '@/strategy/audioRecording';

interface UseAudioTranscriptionOptions {
  endpoint?: string;
  onTranscript: (transcript: string) => void;
  onError: (message: string) => void;
}

export function useAudioTranscription({
  endpoint = '/api/ai/transcribe',
  onTranscript,
  onError,
}: UseAudioTranscriptionOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureFramesRef = useRef<Float32Array[]>([]);
  const captureSampleRateRef = useRef(16000);

  const cleanup = useCallback(() => {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close().catch(() => undefined);
    processorNodeRef.current = null;
    sourceNodeRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    captureFramesRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);

      const capturedFrames = captureFramesRef.current;
      const sampleRate = captureSampleRateRef.current;
      cleanup();

      if (capturedFrames.length === 0) {
        return;
      }

      const audioBlob = encodeWavAudio(capturedFrames, sampleRate);
      setIsTranscribing(true);
      try {
        const formPayload = new FormData();
        formPayload.append('audio', new File([audioBlob], 'assist-notes.wav', { type: audioBlob.type }));
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formPayload,
        });
        const payload = await response.json() as { transcript?: string; error?: string };
        if (!response.ok || !payload.transcript) {
          throw new Error(payload.error || 'Failed to transcribe audio');
        }
        onTranscript(payload.transcript.trim());
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to transcribe audio.');
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
      onError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      captureFramesRef.current = [];

      const audioContext = new AudioContext();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      const sinkNode = audioContext.createGain();
      sinkNode.gain.value = 0;

      captureSampleRateRef.current = audioContext.sampleRate;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      processorNodeRef.current = processorNode;

      processorNode.onaudioprocess = (event) => {
        const channel = event.inputBuffer.getChannelData(0);
        captureFramesRef.current.push(new Float32Array(channel));
      };

      sourceNode.connect(processorNode);
      processorNode.connect(sinkNode);
      sinkNode.connect(audioContext.destination);
      setIsRecording(true);
    } catch (error) {
      cleanup();
      onError(error instanceof Error ? error.message : 'Failed to start recording.');
    }
  };

  return {
    isRecording,
    isTranscribing,
    toggleRecording,
    cleanup,
  };
}
