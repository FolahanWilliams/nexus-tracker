import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            logger.warn('No OPENAI_API_KEY found, returning mock transcription', 'transcribe');
            return NextResponse.json({
                text: 'This is a mock transcription because no OpenAI API key is configured. The quick brown fox jumps over the lazy dog. Technology continues to reshape how we communicate and interact with each other in meaningful ways.',
                isMock: true,
            });
        }

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey });

        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            response_format: 'text',
        });

        return NextResponse.json({ text: transcription });
    } catch (error) {
        logger.error('Transcription error', 'transcribe', error);
        return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }
}
