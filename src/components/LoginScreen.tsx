'use client';

import { useAuth } from '@/components/AuthProvider';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap } from 'lucide-react';

export default function LoginScreen() {
    const { signIn, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="text-4xl"
                >
                    ✨
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-6">
            <motion.div
                className="w-full max-w-md text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* Logo / Title */}
                <motion.div
                    className="mb-8"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                >
                    <div className="text-6xl mb-4">⚔️</div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-purple)] via-[var(--color-blue)] to-[var(--color-purple)]">
                        QuestFlow
                    </h1>
                    <p className="text-[var(--color-text-muted)] mt-2">Gamify your productivity. Level up your life.</p>
                </motion.div>

                {/* Features */}
                <motion.div
                    className="grid grid-cols-3 gap-3 mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    {[
                        { icon: <Sparkles size={20} />, label: 'AI-Powered' },
                        { icon: <Shield size={20} />, label: 'Cloud Sync' },
                        { icon: <Zap size={20} />, label: 'Boss Battles' },
                    ].map((f, i) => (
                        <div key={i} className="rpg-card !p-3 text-center">
                            <div className="text-[var(--color-purple)] mb-1 flex justify-center">{f.icon}</div>
                            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{f.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Sign In Button */}
                <motion.button
                    onClick={signIn}
                    className="rpg-button w-full !bg-white !text-gray-800 font-bold text-base py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </motion.button>

                <p className="text-xs text-[var(--color-text-muted)] mt-6">
                    Your progress is saved securely in the cloud ☁️
                </p>
            </motion.div>
        </div>
    );
}
