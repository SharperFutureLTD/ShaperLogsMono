'use client'

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// Extend Window interface for webkitSpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');

  const startRecording = useCallback(async () => {
    console.log('[Voice] startRecording called');

    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    console.log('[Voice] SpeechRecognition available:', !!SpeechRecognition);

    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser. Try Chrome or Edge.');
      throw new Error('Speech recognition not supported');
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      transcriptRef.current = '';

      recognition.onstart = () => {
        console.log('[Voice] recognition.onstart fired');
        setIsRecording(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          transcriptRef.current += finalTranscript;
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'aborted') {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
        setIsTranscribing(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast.error('Could not start speech recognition');
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;

      if (!recognition) {
        resolve('');
        return;
      }

      setIsTranscribing(true);

      recognition.onend = () => {
        setIsRecording(false);
        setIsTranscribing(false);
        const transcript = transcriptRef.current.trim();
        transcriptRef.current = '';
        resolve(transcript);
      };

      recognition.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.abort();
    }
    transcriptRef.current = '';
    setIsRecording(false);
    setIsTranscribing(false);
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
