import { useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Send, X, ExternalLink, Loader2, Sparkles, Trash2, ListChecks } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { HootMessage, QuickReply } from '@/store/useHootStore';

const ReactMarkdown = dynamic(() => import('react-markdown'), {
    loading: () => <span className="text-xs text-[var(--color-text-muted)]">...</span>,
    ssr: false,
});

interface PlanningContext {
    goal: string;
    steps: { label: string; done: boolean }[];
    currentStepIndex: number;
}

interface HootChatPanelProps {
    messages: HootMessage[];
    isLoading: boolean;
    isSummarizing: boolean;
    input: string;
    setInput: (val: string) => void;
    planningContext: PlanningContext | null;
    pathname: string;
    characterName: string;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onClear: () => void;
    onQuickReply: (reply: QuickReply) => void;
    onSuggestion: (text: string) => void;
    setPlanningContext: (ctx: PlanningContext | null) => void;
}

export default memo(function HootChatPanel({
    messages, isLoading, isSummarizing, input, setInput,
    planningContext, pathname, characterName,
    onSubmit, onClose, onClear, onQuickReply, onSuggestion,
    setPlanningContext,
}: HootChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when mounting
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 lg:bottom-6 lg:right-6 lg:left-auto lg:w-[420px] z-[var(--z-overlay)] max-h-[85vh] lg:max-h-[600px] flex flex-col rounded-t-2xl lg:rounded-2xl overflow-hidden safe-bottom"
                style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
                }}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-label="Hoot AI Assistant"
                aria-modal="true"
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(96, 165, 250, 0.15))' }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-purple)]/20 flex items-center justify-center text-xl">🦉</div>
                        <div>
                            <p className="text-sm font-bold text-[var(--color-text-primary)]">Hoot</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] inline-block" />
                                {pathname === '/' ? 'Dashboard' : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2)} • AI Coach
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={onClear}
                                disabled={isSummarizing}
                                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-40"
                                aria-label="Clear chat"
                                title="Clear conversation (saves summary)"
                            >
                                {isSummarizing
                                    ? <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />
                                    : <Trash2 size={14} className="text-[var(--color-text-muted)]" />
                                }
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                            aria-label="Close Hoot"
                        >
                            <X size={18} className="text-[var(--color-text-muted)]" />
                        </button>
                    </div>
                </div>

                {/* Active Plan Indicator */}
                {planningContext && (
                    <div className="px-4 py-2 flex items-center gap-2 text-xs"
                        style={{ background: 'rgba(139, 92, 246, 0.08)', borderBottom: '1px solid var(--color-border)' }}
                    >
                        <ListChecks size={14} className="text-[var(--color-purple)] shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[var(--color-text-primary)] font-medium truncate">{planningContext.goal}</p>
                            <p className="text-[var(--color-text-muted)]">
                                Step {planningContext.currentStepIndex + 1}/{planningContext.steps.length}: {planningContext.steps[planningContext.currentStepIndex]?.label}
                            </p>
                        </div>
                        <button
                            onClick={() => setPlanningContext(null)}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] shrink-0"
                            title="Dismiss plan"
                            aria-label="Dismiss plan"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin min-h-0" role="log" aria-label="Conversation messages">
                    {messages.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-3">🦉</div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                                Hey{characterName && characterName !== 'Your Name' ? `, ${characterName}` : ''}! I&apos;m Hoot.
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mb-4 max-w-[280px] mx-auto">
                                Your AI assistant and coach. I can manage quests, track habits, give advice, and coach you through reflections.
                            </p>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {[
                                    '✨ Add a task',
                                    '📊 How am I doing?',
                                    '⚔️ Boss strategy',
                                    '🎯 Set a goal',
                                    '📖 New vocab words',
                                    '📝 Coach me',
                                    '📅 Plan my week',
                                ].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => onSuggestion(suggestion.slice(2).trim())}
                                        className="text-[11px] px-2.5 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-purple)]/50 hover:text-[var(--color-purple)] transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'user' ? (
                                <div className="max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm"
                                    style={{ background: 'var(--color-purple)', color: 'white' }}
                                >
                                    {msg.text}
                                </div>
                            ) : (
                                <div className="max-w-[85%] space-y-2">
                                    <div className="flex gap-2 items-start">
                                        <span className="text-lg mt-0.5 shrink-0">🦉</span>
                                        <div className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed hoot-markdown"
                                            style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)' }}
                                        >
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                                                    strong: ({ children }) => <strong className="font-bold text-[var(--color-text-primary)]">{children}</strong>,
                                                    em: ({ children }) => <em className="italic">{children}</em>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
                                                    li: ({ children }) => <li className="text-sm">{children}</li>,
                                                    code: ({ children }) => (
                                                        <code className="text-xs bg-[var(--color-bg-primary)] px-1 py-0.5 rounded font-mono text-[var(--color-purple)]">
                                                            {children}
                                                        </code>
                                                    ),
                                                    a: ({ href, children }) => (
                                                        <a href={href} target="_blank" rel="noopener noreferrer"
                                                            className="text-[var(--color-blue)] underline decoration-[var(--color-blue)]/30 hover:decoration-[var(--color-blue)] transition-colors">
                                                            {children}
                                                        </a>
                                                    ),
                                                    h1: ({ children }) => <p className="font-bold text-base text-[var(--color-text-primary)] mb-1">{children}</p>,
                                                    h2: ({ children }) => <p className="font-bold text-sm text-[var(--color-text-primary)] mb-1">{children}</p>,
                                                    h3: ({ children }) => <p className="font-semibold text-sm text-[var(--color-text-primary)] mb-0.5">{children}</p>,
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-2 border-[var(--color-purple)]/40 pl-2.5 my-1.5 text-[var(--color-text-muted)] italic">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                    hr: () => <hr className="border-[var(--color-border)] my-2" />,
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* Action results */}
                                    {msg.actionResults && msg.actionResults.length > 0 && (
                                        <div className="ml-7 space-y-1">
                                            {msg.actionResults.map((result, j) => (
                                                <div
                                                    key={j}
                                                    className="text-[11px] px-2.5 py-1.5 rounded-md"
                                                    style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--color-green)' }}
                                                >
                                                    {result}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Sources */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="ml-7 space-y-0.5">
                                            <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Sources</p>
                                            {msg.sources.map((src, j) => (
                                                <a
                                                    key={j}
                                                    href={src.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-[11px] text-[var(--color-blue)] hover:text-[var(--color-purple)] transition-colors group"
                                                >
                                                    <ExternalLink size={9} className="shrink-0 opacity-60 group-hover:opacity-100" />
                                                    <span className="truncate underline decoration-[var(--color-blue)]/30">{src.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Quick-reply chips */}
                                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                                        <div className="ml-7 flex flex-wrap gap-1.5 mt-1">
                                            {msg.quickReplies.map((reply, j) => (
                                                <button
                                                    key={j}
                                                    onClick={() => onQuickReply(reply)}
                                                    disabled={isLoading}
                                                    className="text-[11px] px-2.5 py-1.5 rounded-full border border-[var(--color-purple)]/30 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/10 hover:border-[var(--color-purple)]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {reply.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2.5"
                        >
                            <span className="text-lg">🦉</span>
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] rounded-2xl px-3.5 py-2.5"
                                style={{ background: 'var(--color-bg-dark)' }}
                            >
                                <Loader2 size={12} className="animate-spin" />
                                <span>Hoot is thinking...</span>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={onSubmit} className="px-4 pb-4 pt-2 shrink-0"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                >
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask Hoot anything..."
                            className="input-field flex-1 rounded-xl"
                            disabled={isLoading}
                            aria-label="Message Hoot"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, var(--color-purple), var(--color-blue))' }}
                            title="Send"
                            aria-label="Send message"
                        >
                            {isLoading
                                ? <Loader2 size={16} className="animate-spin text-white" />
                                : <Send size={16} className="text-white" />
                            }
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 px-1">
                        <Sparkles size={9} className="text-[var(--color-purple)]/60" />
                        <p className="text-[9px] text-[var(--color-text-muted)]">
                            Gemini 3 Flash + Google Search • Actions + Coaching
                        </p>
                    </div>
                </form>
            </motion.div>
        </>
    );
});
