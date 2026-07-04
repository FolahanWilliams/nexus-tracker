import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/with-auth';
import { hasAIGateway } from '@/lib/env';

/** Gemini accepts audio input directly, so transcription routes through the AI Gateway too. */
const TRANSCRIBE_MODEL = process.env.AI_MODEL || 'google/gemini-3-flash';

export const POST = withAuth(async (request) => {
    try {
        if (!hasAIGateway()) {
            logger.warn('No AI Gateway auth found, returning mock transcription', 'transcribe');
            return NextResponse.json({
                text: 'This is a mock transcription because no AI Gateway auth is configured. The quick brown fox jumps over the lazy dog. Technology continues to reshape how we communicate and interact with each other in meaningful ways.',
                isMock: true,
            });
        }

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const audioData = new Uint8Array(await audioFile.arrayBuffer());

        const result = await generateText({
            model: TRANSCRIBE_MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Transcribe this audio recording verbatim. Return ONLY the spoken words as plain text — no commentary, no labels, no timestamps. If the audio contains no speech, return an empty string.',
                        },
                        {
                            type: 'file',
                            data: audioData,
                            mediaType: audioFile.type || 'audio/webm',
                        },
                    ],
                },
            ],
        });

        return NextResponse.json({ text: result.text.trim() });
    } catch (error) {
        logger.error('Transcription error', 'transcribe', error);
        return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }
}, { rateLimitMax: 10 });
