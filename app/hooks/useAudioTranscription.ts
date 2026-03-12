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
  const isMountedRef = useRef(true);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureFramesRef = useRef<Float32Array[]>([]);
  const captureSampleRateRef = useRef(16000);
  const transcribeAbortRef = useRef<AbortController | null>(null);
  const transcribeRequestRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const releaseRecordingResources = useCallback(() => {
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

  const cleanup = useCallback(() => {
    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = null;
    releaseRecordingResources();
    if (isMountedRef.current) {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, [releaseRecordingResources]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);

      const capturedFrames = captureFramesRef.current;
      const sampleRate = captureSampleRateRef.current;
      releaseRecordingResources();

      if (capturedFrames.length === 0) {
        return;
      }

      const audioBlob = encodeWavAudio(capturedFrames, sampleRate);
      const requestId = transcribeRequestRef.current + 1;
      transcribeRequestRef.current = requestId;
      transcribeAbortRef.current?.abort();
      const abortController = new AbortController();
      transcribeAbortRef.current = abortController;
      setIsTranscribing(true);
      try {
        const formPayload = new FormData();
        formPayload.append('audio', new File([audioBlob], 'assist-notes.wav', { type: audioBlob.type }));
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formPayload,
          signal: abortController.signal,
        });
        const payload = await response.json() as { transcript?: string; error?: string };
        if (!response.ok || !payload.transcript) {
          throw new Error(payload.error || 'Failed to transcribe audio');
        }
        if (!abortController.signal.aborted && isMountedRef.current && transcribeRequestRef.current === requestId) {
          onTranscriptRef.current(payload.transcript.trim());
        }
      } catch (error) {
        if (
          abortController.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        if (isMountedRef.current) {
          onErrorRef.current(error instanceof Error ? error.message : 'Failed to transcribe audio.');
        }
      } finally {
        if (transcribeAbortRef.current === abortController) {
          transcribeAbortRef.current = null;
        }
        if (isMountedRef.current) {
          setIsTranscribing(false);
        }
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
      if (isMountedRef.current) {
        onErrorRef.current(error instanceof Error ? error.message : 'Failed to start recording.');
      }
    }
  };

  return {
    isRecording,
    isTranscribing,
    toggleRecording,
    cleanup,
  };
}
