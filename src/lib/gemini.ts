import { generateText, jsonSchema, tool, type ModelMessage, type ToolSet } from 'ai';
import { validateEnv } from './env';

// Validate env on first import (server-side only — this file is only
// imported by API routes which run on the server).
if (typeof window === 'undefined') {
    validateEnv();
}

/**
 * AI layer backed by the Vercel AI Gateway.
 *
 * This module keeps the same interface the API routes were written against
 * when they called Google's `@google/generative-ai` SDK directly
 * (`genAI.getGenerativeModel(...).generateContent(...)`, `startChat`,
 * `response.text()`, function-call parts), but every request now routes
 * through the AI Gateway via the AI SDK. Auth is AI_GATEWAY_API_KEY or the
 * Vercel OIDC token — no GOOGLE_API_KEY needed.
 */

/** Default text model. Legacy Gemini model names all map to this slug. */
const DEFAULT_MODEL = process.env.AI_MODEL || 'google/gemini-3-flash';

/** Model used when a route asks for Google Search grounding — Sonar has built-in web search. */
const WEB_SEARCH_MODEL = process.env.AI_SEARCH_MODEL || 'perplexity/sonar';

/** Map legacy Gemini SDK model names to gateway slugs. */
function resolveModel(name: string): string {
    if (name.includes('/')) return name; // already a gateway slug
    return DEFAULT_MODEL;
}

/** JSON-schema type constants (drop-in for `SchemaType` from @google/generative-ai). */
export const SchemaType = {
    STRING: 'string',
    NUMBER: 'number',
    INTEGER: 'integer',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
    OBJECT: 'object',
} as const;

interface FunctionDeclaration {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
}

interface LegacyTool {
    functionDeclarations?: FunctionDeclaration[];
    googleSearch?: Record<string, never>;
}

interface GenerationConfig {
    responseMimeType?: string;
    temperature?: number;
    maxOutputTokens?: number;
}

interface ModelConfig {
    model: string;
    tools?: LegacyTool[];
    systemInstruction?: string;
    generationConfig?: GenerationConfig;
}

interface ContentPart {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
}

/** Response shape mirroring the Gemini SDK's `GenerateContentResponse`. */
interface CompatResponse {
    text: () => string;
    candidates: Array<{ content: { parts: ContentPart[] } }>;
}

interface HistoryEntry {
    role: string;
    parts: { text: string }[];
}

function buildToolSet(declarations: FunctionDeclaration[]): ToolSet {
    const tools: ToolSet = {};
    for (const decl of declarations) {
        tools[decl.name] = tool({
            description: decl.description,
            // Gemini function-declaration parameters are already JSON Schema.
            inputSchema: jsonSchema(
                (decl.parameters as never) ?? { type: 'object', properties: {} },
            ),
            // No `execute` — tool calls are returned to the route, which
            // forwards them to the client for execution (Hoot's actions).
        });
    }
    return tools;
}

function toCompatResponse(result: {
    text: string;
    toolCalls: Array<{ toolName: string; input: unknown }>;
}): CompatResponse {
    const parts: ContentPart[] = [];
    for (const call of result.toolCalls) {
        parts.push({
            functionCall: {
                name: call.toolName,
                args: (call.input ?? {}) as Record<string, unknown>,
            },
        });
    }
    if (result.text) {
        parts.push({ text: result.text });
    }
    return {
        text: () => result.text,
        candidates: [{ content: { parts } }],
    };
}

class CompatModel {
    private modelId: string;
    private tools?: ToolSet;
    private system?: string;

    constructor(config: ModelConfig) {
        const legacyTools = config.tools ?? [];
        const declarations = legacyTools.flatMap(t => t.functionDeclarations ?? []);
        const wantsWebSearch = legacyTools.some(t => t.googleSearch);

        this.modelId = wantsWebSearch ? WEB_SEARCH_MODEL : resolveModel(config.model);
        this.tools = declarations.length > 0 ? buildToolSet(declarations) : undefined;

        const systemParts: string[] = [];
        if (config.systemInstruction) systemParts.push(config.systemInstruction);
        if (config.generationConfig?.responseMimeType === 'application/json') {
            systemParts.push('Respond ONLY with valid JSON. No markdown fences, no prose.');
        }
        this.system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
    }

    private async run(messages: ModelMessage[]) {
        const result = await generateText({
            model: this.modelId,
            system: this.system,
            messages,
            tools: this.tools,
        });
        return toCompatResponse(result);
    }

    async generateContent(prompt: string): Promise<{ response: CompatResponse }> {
        const response = await this.run([{ role: 'user', content: prompt }]);
        return { response };
    }

    startChat({ history }: { history?: HistoryEntry[] } = {}) {
        const messages: ModelMessage[] = (history ?? []).map(entry => ({
            role: entry.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: entry.parts.map(p => p.text).join('\n'),
        }));
        const run = (msgs: ModelMessage[]) => this.run(msgs);

        return {
            async sendMessage(message: string): Promise<{ response: CompatResponse }> {
                messages.push({ role: 'user', content: message });
                const response = await run(messages);
                // Record the assistant turn as plain text so follow-up
                // sendMessage calls have conversational continuity.
                const actionNames = response.candidates[0].content.parts
                    .filter(p => p.functionCall)
                    .map(p => p.functionCall!.name);
                const textPart = response.text();
                const assistantSummary = [
                    textPart,
                    actionNames.length > 0 ? `[called: ${actionNames.join(', ')}]` : '',
                ].filter(Boolean).join('\n');
                messages.push({ role: 'assistant', content: assistantSummary || '[no response]' });
                return { response };
            },
        };
    }
}

/**
 * Shared AI client instance, interface-compatible with the Gemini SDK's
 * `GoogleGenerativeAI` for the surface this app uses.
 */
export const genAI = {
    getGenerativeModel(config: ModelConfig): CompatModel {
        return new CompatModel(config);
    },
};

/**
 * Extract a JSON value from a model response that may contain markdown
 * fences, prose, or raw JSON.
 *
 * Tries three strategies in order:
 * 1. Direct JSON.parse of the full text
 * 2. Extract from ```json ... ``` fenced blocks
 * 3. Extract the first { ... } brace-delimited substring
 *
 * Throws if none succeed.
 */
export function extractJSON(text: string): unknown {
    // Strategy 1: the response is already valid JSON
    try {
        return JSON.parse(text);
    } catch {
        // Not valid JSON as-is — try extracting from markdown fences
    }

    // Strategy 2: look for ```json ... ``` fenced code blocks
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        try {
            return JSON.parse(fenced[1].trim());
        } catch {
            // Fenced block wasn't valid JSON — fall through to brace matching
        }
    }

    // Strategy 3: extract the first top-level { ... } substring
    const braces = text.match(/\{[\s\S]*\}/);
    if (braces) {
        try {
            return JSON.parse(braces[0]);
        } catch {
            // Brace-delimited text wasn't valid JSON either
        }
    }

    throw new Error('Could not extract JSON from response');
}

/**
 * Type-safe wrapper: extract JSON and verify it's a non-null object.
 * Returns `Record<string, unknown>` so callers can safely access
 * properties with type narrowing instead of `as any`.
 */
export function extractJSONObject(text: string): Record<string, unknown> {
    const parsed = extractJSON(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Expected JSON object from AI response');
    }
    return parsed as Record<string, unknown>;
}
