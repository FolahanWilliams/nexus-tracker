'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain, Feather, Sparkles, Target, Zap, ChevronRight, Shield, Award, Sword } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/overview');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center text-4xl animate-pulse">✨</div>;
  if (user) return null; // Prevent flash of landing page if logged in

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-[var(--color-bg-primary)] overflow-x-hidden text-center">
      
      {/* Navbar */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] flex items-center justify-center glow-purple">
            <Sword size={18} className="text-white transform -rotate-45" />
          </div>
          <span className="font-black tracking-widest text-lg uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--color-text-muted)]">
            QuestFlow
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm font-bold text-[var(--color-text-secondary)]">
          <Link href="#features" className="hover:text-white transition-colors hidden md:block">Features</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/login" className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-purple)] hover:bg-[var(--color-purple)]/10 transition-all text-white">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        className="relative w-full px-6 pt-24 pb-32 flex flex-col items-center"
        initial="hidden" animate="show" variants={stagger}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--color-purple)]/5 blur-[120px] -z-10 pointer-events-none" />
        
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/20 text-[var(--color-purple-light)] text-xs font-bold uppercase tracking-widest mb-8">
          <Sparkles size={14} /> The Ultimate Productivity RPG
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black max-w-4xl leading-tight mb-6">
          Level up your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-blue)] via-[var(--color-purple)] to-[#f43f5e] animate-gradient" style={{ backgroundSize: '200% auto' }}>Real Life</span> 
          <br className="hidden md:block"/> with AI Automation.
        </motion.h1>

        <motion.p variants={fadeUp} className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mb-12 font-medium">
          Transform your daily tasks into epic quests. Forge unbreakable habits, conquer strategic goals, and dominate your week with the help of Hoot, your personal AI owl coach.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link href="/pricing" className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-white bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)] hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(167,139,250,0.4)]">
            Start 3-Day Free Trial <ChevronRight size={18} />
          </Link>
          <p className="sm:hidden text-xs text-[var(--color-text-muted)] mt-2">No commitment. Cancel anytime.</p>
        </motion.div>
      </motion.section>

      {/* Flagship Features: Mindforge, Wordforge, Hoot AI */}
      <section id="features" className="w-full max-w-5xl px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Forge Your Destiny</h2>
          <p className="text-[var(--color-text-secondary)]">The trinity of elite mental performance.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Mindforge */}
          <motion.div 
            className="rpg-card !p-8 flex flex-col items-start text-left border border-[var(--color-blue)]/20 hover:border-[var(--color-blue)]/50 transition-colors group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-blue)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Brain size={28} className="text-[var(--color-blue)]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Mindforge</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Synthesize your thoughts into structured action. Mindforge maps out your mental state, generating actionable quests to rebuild your focus and momentum when you feel overwhelmed.
            </p>
          </motion.div>

          {/* Wordforge */}
          <motion.div 
            className="rpg-card !p-8 flex flex-col items-start text-left border border-[var(--color-orange)]/20 hover:border-[var(--color-orange)]/50 transition-colors group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-orange)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Feather size={28} className="text-[var(--color-orange)]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Wordforge</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Your AI-powered journaling and content engine. Wordforge reflects on your daily victories, refines your narrative, and uncovers psychological insights to keep you sharp and motivated.
            </p>
          </motion.div>

          {/* Hoot AI */}
          <motion.div 
            className="rpg-card !p-8 flex flex-col items-start text-left border border-[var(--color-purple)]/20 hover:border-[var(--color-purple)]/50 transition-colors group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-purple)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap size={28} className="text-[var(--color-purple)]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Hoot AI Coach</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Meet Hoot, your hyper-strategic AI owl perfectly tuned to your productivity habits. Need to break down a daunting task or re-strategize your week? Hoot has your back 24/7.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core RPG Mechanics */}
      <section className="w-full max-w-5xl px-6 py-24 border-t border-[var(--color-border)] relative">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            className="text-left"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-black mb-6">Gamify your Grind.</h2>
            <ul className="space-y-6">
              {[
                { icon: Shield, title: 'Epic Boss Battles', desc: 'Shatter your procrastination by chaining tasks together to defeat weekly bosses.' },
                { icon: Target, title: 'XP & Leveling Systems', desc: 'Gain experience for everything you do. Watch your stats grow over time in the War Room.' },
                { icon: Award, title: 'Powerful Streak Mechanics', desc: 'Maintain your momentum with Freezes, comeback bonuses, and daily login rewards.' }
              ].map((f, i) => (
                <li key={i} className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center">
                    <f.icon className="text-[var(--color-green)]" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{f.title}</h4>
                    <p className="text-[var(--color-text-secondary)] text-sm">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className="relative h-[400px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden p-6 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-purple)_0%,_transparent_70%)] opacity-10" />
             {/* Abstract Mockup UI representation */}
             <div className="w-full h-full border border-white/5 rounded-xl bg-[var(--color-bg-dark)]/80 backdrop-blur-sm p-4 shadow-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)]" />
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-white/20 rounded-full mb-2" />
                    <div className="h-2 w-full bg-white/10 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-16 flex-1 bg-white/5 rounded-lg" />
                  <div className="h-16 flex-1 bg-white/5 rounded-lg" />
                </div>
                <div className="flex-1 bg-white/5 rounded-lg mt-2 relative overflow-hidden">
                  <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[var(--color-green)]/20 to-transparent" />
                </div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full px-6 py-32 text-center bg-gradient-to-t from-[var(--color-bg-dark)] to-transparent border-t border-[var(--color-border)]">
        <h2 className="text-4xl font-black mb-6">Ready to enter the arena?</h2>
        <p className="text-[var(--color-text-muted)] mb-10 max-w-lg mx-auto">
          Start your legendary journey today. Claim your 3-day free trial and experience the ultimate productivity stack.
        </p>
        <Link href="/pricing" className="inline-flex px-8 py-4 rounded-xl font-black text-black bg-white hover:scale-105 transition-transform items-center gap-2">
          View Pricing & Start Trial <ChevronRight size={18} />
        </Link>
      </section>
      
    </div>
  );
}
