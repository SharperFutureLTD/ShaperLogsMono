import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';

const app = new OpenAPIHono<AuthContext>();

// Request/Response schemas
const VoiceToTextRequestSchema = z.object({
  audio: z.string().describe('Base64-encoded audio data (WebM format)'),
});

const VoiceToTextResponseSchema = z.object({
  text: z.string().describe('Transcribed text from audio'),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

// Route definition
const voiceToTextRoute = createRoute({
  method: 'post',
  path: '/api/ai/voice-to-text',
  tags: ['AI Operations'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: VoiceToTextRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Audio transcription successful',
      content: {
        'application/json': {
          schema: VoiceToTextResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Transcription failed',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Handler
app.openapi(voiceToTextRoute, async (c) => {
  try {
    const { audio } = c.req.valid('json');

    if (!audio || audio.trim() === '') {
      return c.json({ error: 'Audio data is required' }, 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return c.json({ error: 'Server configuration error: OpenAI API key missing' }, 500);
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    console.log(`[VoiceToText] Received audio buffer size: ${audioBuffer.length} bytes`);

    if (audioBuffer.length === 0) {
      return c.json({ error: 'Audio data is empty' }, 400);
    }

    try {
      // Use standard fetch instead of OpenAI SDK to avoid stream issues
      console.log('[VoiceToText] Calling OpenAI Whisper API via fetch...');
      
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[VoiceToText] OpenAI API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`OpenAI API request failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[VoiceToText] Transcription successful');
      return c.json({ text: result.text }, 200);

    } catch (error) {
      // Re-throw to be caught by the outer catch block
      throw error;
    }
  } catch (error) {
    console.error('Voice-to-text error:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const displayMessage = process.env.NODE_ENV === 'development'
      ? `Transcription failed: ${errorMessage}`
      : 'Failed to transcribe audio. Please try again.';

    return c.json({ error: displayMessage }, 500);
  }
});

export default app;
