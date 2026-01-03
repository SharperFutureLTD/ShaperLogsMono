'use client'

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

/**
 * Helper function to convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (data:audio/webm;base64,)
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper function to transcribe audio using OpenAI Whisper API
 */
async function transcribeAudio(base64Audio: string): Promise<string> {
  // Get auth token from Supabase
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  // Call the Whisper endpoint
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/api/ai/voice-to-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ audio: base64Audio }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Transcription failed' }));
    throw new Error(error.error || 'Transcription failed');
  }

  const data = await response.json();
  return data.text;
}

/**
 * Hook for recording audio and transcribing with OpenAI Whisper
 *
 * Replaces browser Web Speech Recognition API with MediaRecorder + Whisper
 * for better accuracy and cross-browser compatibility.
 */
export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    console.log('[Voice] startRecording called');

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      console.log('[Voice] Microphone access granted');

      // Check for WebM support
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/webm;codecs=opus';

      // Create MediaRecorder with WebM format
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[Voice] Audio chunk collected, size:', event.data.size);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('[Voice] MediaRecorder started');
        setIsRecording(true);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Voice] MediaRecorder error:', event);
        toast.error('Recording error occurred');
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      console.log('[Voice] Recording started successfully');
    } catch (error) {
      console.error('[Voice] Error starting recording:', error);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Microphone access denied. Please allow microphone access.');
        } else if (error.name === 'NotFoundError') {
          toast.error('No microphone found. Please connect a microphone.');
        } else {
          toast.error('Could not start recording: ' + error.message);
        }
      } else {
        toast.error('Could not start recording');
      }

      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    console.log('[Voice] stopRecording called');

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder) {
        console.log('[Voice] No active recording to stop');
        resolve('');
        return;
      }

      mediaRecorder.onstop = async () => {
        console.log('[Voice] MediaRecorder stopped');
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('[Voice] Audio blob created, size:', audioBlob.size);

          if (audioBlob.size === 0) {
            console.warn('[Voice] Audio blob is empty');
            toast.error('No audio recorded. Please try again.');
            setIsTranscribing(false);
            resolve('');
            return;
          }

          // Convert to base64
          console.log('[Voice] Converting to base64...');
          const base64Audio = await blobToBase64(audioBlob);
          console.log('[Voice] Base64 conversion complete, length:', base64Audio.length);

          // Call Whisper API
          console.log('[Voice] Calling Whisper API...');
          const transcript = await transcribeAudio(base64Audio);
          console.log('[Voice] Transcription complete:', transcript);

          // Cleanup
          audioChunksRef.current = [];
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          setIsTranscribing(false);
          resolve(transcript);
        } catch (error) {
          console.error('[Voice] Transcription failed:', error);

          if (error instanceof Error) {
            if (error.message === 'Not authenticated') {
              toast.error('Please sign in to use voice transcription');
            } else {
              toast.error('Failed to transcribe audio: ' + error.message);
            }
          } else {
            toast.error('Failed to transcribe audio');
          }

          setIsTranscribing(false);
          audioChunksRef.current = [];

          // Cleanup stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          resolve('');
        }
      };

      mediaRecorder.stop();
      console.log('[Voice] Stopping MediaRecorder...');
    });
  }, []);

  const cancelRecording = useCallback(() => {
    console.log('[Voice] cancelRecording called');

    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    // Cleanup
    audioChunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

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
