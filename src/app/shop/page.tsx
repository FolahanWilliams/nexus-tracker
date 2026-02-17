'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState } from 'react';
import Link from 'next/link';
import { useToastStore } from '@/components/ToastContainer';
import { 
  Gem, 
  Plus, 
  Trash2,
  Heart,
  Zap,
  Coffee,
  Gamepad2,
  Tv,
  Music,
  Gift,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const rewardIcons = [
  { icon: Coffee, color: 'from-amber-400 to-orange-500', name: 'Coffee Break' },
  { icon: Gamepad2, color: 'from-indigo-400 to-purple-500', name: 'Gaming Time' },
  { icon: Tv, color: 'from-pink-400 to-rose-500', name: 'Watch Show' },
  { icon: Music, color: 'from-cyan-400 to-blue-500', name: 'Music Break' },
  { icon: Gift, color: 'from-emerald-400 to-teal-500', name: 'Surprise' },
  { icon: Sparkles, color: 'from-yellow-400 to-amber-500', name: 'Treat Yourself' },
];

export default function ShopPage() {
  const { gold, gems, shopItems, addShopItem, deleteShopItem, buyReward, addGems, addBuff, buyGoldBuff } = useGameStore();
  const { addToast } = useToastStore();
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState(100);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addShopItem(newItemName, newItemCost);
    addToast(`Reward "${newItemName}" created!`, 'success');
    setNewItemName('');
    setNewItemCost(100);
  };

  const handleBuy = (itemId: string, itemName: string, itemCost: number) => {
    if (gold >= itemCost) {
      buyReward(itemId);
      addToast(`Reward "${itemName}" purchased!`, 'success');
    } else {
      addToast(`Not enough gold! Need ${itemCost - gold} more.`, 'error');
    }
  };

  return (
    <motion.div 
      className="min-h-screen pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold">Reward Shop</h1>
          </div>
          <motion.div 
            className="flex items-center gap-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <Gem className="text-[var(--color-blue)]" size={24} />
            <span className="font-bold">{gold}</span>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Intro Text */}
        <motion.div 
          className="mb-8 border-l-4 border-[var(--color-purple)] pl-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[var(--color-purple)] italic font-medium">
            Spend your gold on buffs, or use gems to unlock special boosts.
          </p>
        </motion.div>

        {/* Add Custom Reward */}
        <motion.div 
          className="rpg-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-bold mb-4">Create Reward</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g., Watch a movie"
              className="input-field"
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-[var(--color-bg-dark)] border border-[var(--color-border)] px-4 py-3 rounded flex-1">
                <Gem className="text-[var(--color-blue)]" size={20} />
                <input
                  type="number"
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(Number(e.target.value))}
                  min={1}
                  className="bg-transparent w-full font-bold text-lg focus:outline-none text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <motion.button
              type="submit"
              disabled={!newItemName.trim()}
              className="rpg-button w-full !bg-[var(--color-purple)] !text-white hover:!bg-[var(--color-purple-light)] disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={20} />
              Create Reward
            </motion.button>
          </form>
        </motion.div>

        {/* Premium Items */}
        <h2 className="text-xl font-bold mb-4">Special Items</h2>
        <div className="flex items-center gap-2 mb-4 text-sm text-[var(--color-text-secondary)]">
          <Gem className="text-[var(--color-blue)]" size={16} />
          <span>You have <span className="font-bold text-[var(--color-blue)]">{gems}</span> gems</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {([
            {
              icon: Heart, label: 'Gem Pack', desc: 'Instantly gain 50 bonus gems', cost: 50, gradient: 'from-red-500 to-pink-500',
              onBuy: () => { addGems(50); addToast('+50 Gems added to your wallet!', 'success'); }
            },
            {
              icon: Zap, label: 'XP Boost', desc: 'Double XP for 1 hour', cost: 100, gradient: 'from-yellow-400 to-orange-500',
              onBuy: () => { addBuff('xp', 2, 60); addToast('XP Boost active! 2x XP for 60 minutes', 'success'); }
            },
          ] as const).map((item, index) => {
            const Icon = item.icon;
            const canAfford = gems >= item.cost;
            return (
              <motion.div
                key={item.label}
                className="rpg-card text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-lg mx-auto mb-3 flex items-center justify-center`}>
                  <Icon className="text-white" size={32} />
                </div>
                <h3 className="font-bold mb-1">{item.label}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">{item.desc}</p>
                <motion.button
                  onClick={() => {
                    if (!canAfford) {
                      addToast(`Not enough gems! Need ${item.cost - gems} more.`, 'error');
                      return;
                    }
                    addGems(-item.cost);
                    item.onBuy();
                  }}
                  className={`rpg-button w-full !text-white text-sm !py-2 ${canAfford ? '!bg-[var(--color-orange)]' : 'opacity-50 cursor-not-allowed !bg-[var(--color-bg-hover)]'}`}
                  whileHover={canAfford ? { scale: 1.05 } : {}}
                  whileTap={canAfford ? { scale: 0.95 } : {}}
                  aria-label={`Buy ${item.label} for ${item.cost} gems`}
                >
                  <Gem size={16} />
                  {item.cost} Gems
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Gold Exchange */}
        <h2 className="text-xl font-bold mb-4">Gold Exchange</h2>
        <div className="flex items-center gap-2 mb-4 text-sm text-[var(--color-text-secondary)]">
          <span className="text-[var(--color-yellow)]">🪙</span>
          <span>You have <span className="font-bold text-[var(--color-yellow)]">{gold}</span> gold</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: 'XP Elixir', desc: '+50% XP for 30 min', cost: 150, type: 'xp' as const, duration: 30 },
            { label: 'Gold Aura', desc: '+50% Gold for 30 min', cost: 200, type: 'gold' as const, duration: 30 },
          ].map((item) => {
            const canAfford = gold >= item.cost;
            return (
              <motion.div
                key={item.label}
                className="rpg-card text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
              >
                <p className="text-3xl mb-2">{item.type === 'xp' ? '✨' : '💫'}</p>
                <h3 className="font-bold mb-1">{item.label}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">{item.desc}</p>
                <motion.button
                  onClick={() => {
                    const success = buyGoldBuff(item.type, item.duration, item.cost);
                    if (success) addToast(`${item.label} active for ${item.duration} min!`, 'success');
                    else addToast(`Need ${item.cost - gold} more gold!`, 'error');
                  }}
                  className={`rpg-button w-full !text-white text-sm !py-2 ${canAfford ? '!bg-[var(--color-yellow)] !text-black' : 'opacity-50 cursor-not-allowed'}`}
                  whileHover={canAfford ? { scale: 1.05 } : {}}
                  whileTap={canAfford ? { scale: 0.95 } : {}}
                  aria-label={`Buy ${item.label} for ${item.cost} gold`}
                >
                  🪙 {item.cost} Gold
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Rewards */}
        <h2 className="text-xl font-bold mb-4">Your Rewards</h2>
        {shopItems.length === 0 ? (
          <motion.div 
            className="rpg-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-[var(--color-text-secondary)] font-semibold">No rewards yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Create your first reward above!</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {shopItems.map((item, index) => {
                const iconConfig = rewardIcons[index % rewardIcons.length];
                const Icon = iconConfig.icon;
                const canAfford = gold >= item.cost;
                
                return (
                  <motion.div 
                    key={item.id} 
                    className="rpg-card !p-4 flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    layout
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${iconConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold">{item.name}</h3>
                      <div className="flex items-center gap-1 text-[var(--color-blue)] font-bold text-sm">
                        <Gem size={16} />
                        {item.cost}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => handleBuy(item.id, item.name, item.cost)}
                        disabled={!canAfford}
                        className={`rpg-button !py-2 !px-4 text-sm ${
                          canAfford ? '!bg-[var(--color-purple)] !text-white' : 'opacity-50 cursor-not-allowed'
                        }`}
                        whileHover={canAfford ? { scale: 1.05 } : {}}
                        whileTap={canAfford ? { scale: 0.95 } : {}}
                      >
                        {canAfford ? 'Buy' : 'Locked'}
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          deleteShopItem(item.id);
                          addToast(`Reward "${item.name}" deleted`, 'info');
                        }}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 size={20} />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
