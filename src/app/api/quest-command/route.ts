import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const { command, tasks } = await request.json();

        if (!command) {
            return NextResponse.json({ error: 'Command is required' }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({
                action: 'none',
                message: 'AI unavailable. Try editing quests manually.',
                isMock: true
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const taskList = tasks?.map((t: { id: string; title: string; completed: boolean; difficulty: string; category: string }) =>
            `- ID: "${t.id}" | Title: "${t.title}" | Status: ${t.completed ? 'Done' : 'Active'} | ${t.difficulty} | ${t.category}`
        ).join('\n') || 'No tasks.';

        const systemPrompt = `You are a quest management AI for QuestFlow RPG.
The user will give a natural language command to modify their quest list.
Your job is to interpret it and return a structured action.

Current Quest List:
${taskList}

Output ONLY valid JSON with these fields:
- action: String. One of: 'delete', 'edit', 'complete', 'none'.
- taskId: String. The ID of the task to act on. Required for delete/edit/complete.
- changes: Object. For 'edit' action only. Can contain: { title?, difficulty?, category?, duration?, recurring? }
- message: String. A short confirmation message describing what will happen (e.g., "Deleting 'Run 5k' quest").

Rules:
- Match the user's description to the closest task by title similarity.
- If the command is ambiguous, set action to 'none' and explain in message.
- For 'complete', mark the task as done.
- For 'edit', include only the fields that should change.
- Never invent task IDs. Only use IDs from the list above.

Examples:
- "Delete the running quest" -> Find the quest with 'run' in the title, return { action: 'delete', taskId: '...', message: 'Deleting "Run 5k"' }
- "Mark the email quest as done" -> { action: 'complete', taskId: '...', message: 'Completing "Check emails"' }
- "Change the novel quest to Epic difficulty" -> { action: 'edit', taskId: '...', changes: { difficulty: 'Epic' }, message: 'Updated "Write novel" to Epic difficulty' }

Interpret this command:`;

        const result = await model.generateContent(`${systemPrompt}\n\n"${command}"`);
        const text = result.response.text();
        const data = JSON.parse(text);

        // Validate action
        const validActions = ['delete', 'edit', 'complete', 'none'];
        if (!validActions.includes(data.action)) data.action = 'none';

        return NextResponse.json(data);
    } catch (error) {
        console.error('Quest Command Error:', error);
        return NextResponse.json({
            action: 'none',
            message: 'Failed to process command. Try again.',
            error: 'AI unavailable'
        }, { status: 500 });
    }
}
