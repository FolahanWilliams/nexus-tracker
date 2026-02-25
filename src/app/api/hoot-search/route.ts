import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query } = body;

        if (!query) {
            return NextResponse.json(
                { error: 'query is required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            tools: [
                {
                    googleSearch: {}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- googleSearch not in SDK types
                } as any
            ]
        });

        const prompt = `Perform a comprehensive web search for the following query: "${query}".
Summarize the findings clearly and concisely, focusing on the most relevant and up-to-date information.
Do not hallucinate; only use information found in the search results.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({ result: responseText });
    } catch (error) {
        console.error('Error in /api/hoot-search:', error);
        return NextResponse.json(
            { error: 'Failed to perform web search' },
            { status: 500 }
        );
    }
}
