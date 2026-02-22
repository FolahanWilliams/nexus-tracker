import { GoogleGenerativeAI, DynamicRetrievalMode } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

/**
 * Extract JSON from a Gemini response that may contain markdown fences or prose.
 */
function extractJSON(text: string): unknown {
    // Try direct parse first
    try { return JSON.parse(text); } catch { /* continue */ }
    // Try extracting from ```json ... ``` fences
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ }
    }
    // Try extracting the first { ... } block
    const braces = text.match(/\{[\s\S]*\}/);
    if (braces) {
        try { return JSON.parse(braces[0]); } catch { /* continue */ }
    }
    throw new Error('Could not extract JSON from response');
}

export async function POST(request: Request) {
    try {
        const { reflection, energyRating, recentTasks, playerContext, reflectionHistory } = await request.json();

        if (!process.env.GOOGLE_API_KEY) {
            console.warn("No GOOGLE_API_KEY found.");
            return NextResponse.json({
                message: "You're doing great! Keep up the good work. (Mock AI Response)",
                trendInsight: null,
                isMock: true
            });
        }

        // Use Google Search Grounding so Hoot can cite real articles, studies,
        // and current information when coaching the user.
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [{
                googleSearchRetrieval: {
                    dynamicRetrievalConfig: {
                        mode: DynamicRetrievalMode.MODE_DYNAMIC,
                        dynamicThreshold: 0.3, // Low threshold = search more often
                    },
                },
            }],
        });

        // Build trend context from reflection history
        const trendContext = reflectionHistory && reflectionHistory.length >= 3
            ? `\nReflection History (last ${reflectionHistory.length} entries):\n${reflectionHistory.map((r: { date: string; stars: number; note: string }) =>
                `- ${r.date}: Energy ${r.stars}/5 — "${r.note}"`
            ).join('\n')}\n\nAnalyze these reflections for patterns: Which days tend to have low/high energy? Are there recurring themes or struggles?`
            : '';

        const systemPrompt = `You are "Hoot", the encouraging and slightly sassy owl mascot of QuestFlow RPG.
Your job is to read the user's daily reflection and provide a short, personalized coaching message.

You have access to Google Search. Use it to:
- Find relevant, up-to-date articles, tips, or studies that relate to the user's reflection
- Provide one actionable resource link when relevant (e.g., a technique, article, or tool)
- Ground your advice in real, current information — not generic platitudes

Context:
- Player: ${playerContext?.name || 'Adventurer'} (Level ${playerContext?.level || 1} ${playerContext?.characterClass || 'Novice'})
- Energy Rating Today: ${energyRating}/5
- Streak: ${playerContext?.streak || 0} days

Recent Tasks Completed:
${recentTasks?.map((t: { title: string }) => `- ${t.title}`).join('\n') || 'None today.'}

User's Reflection:
"${reflection}"
${trendContext}

Output ONLY a valid JSON object with:
- message: String. A short (2-3 sentences) encouraging coaching message. If you found a useful resource via search, mention it naturally (e.g., "I found this great guide on...").
- trendInsight: String or null. If you have enough reflection history (3+ entries) to spot a pattern, provide a single-sentence insight about their energy/productivity trends. Otherwise null.
- sources: Array of objects or null. If you used Google Search, include up to 2 relevant sources: [{ "title": "...", "url": "..." }]. Otherwise null.

Example trendInsight: "Your energy consistently dips on Thursdays — consider scheduling lighter tasks."`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const data = extractJSON(text);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Gemini Coach Error:', error);
        return NextResponse.json({
            message: "I couldn't process that right now, but I believe in you!",
            trendInsight: null,
            sources: null,
            isMock: true,
            error: 'AI unavailable'
        });
    }
}
