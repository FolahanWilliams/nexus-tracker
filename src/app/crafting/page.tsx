'use client';

import { useGameStore, CraftingRecipe } from '@/store/useGameStore';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Hammer, 
  Package, 
  Check, 
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { useToastStore } from '@/components/ToastContainer';

const RARITY_COLORS = {
  'Common': 'text-[var(--color-text-muted)]',
  'Uncommon': 'text-[var(--color-green)]',
  'Rare': 'text-[var(--color-blue)]',
  'Epic': 'text-[var(--color-purple)]',
  'Legendary': 'text-[var(--color-orange)]'
};

const RARITY_BG = {
  'Common': 'bg-[var(--color-text-muted)]',
  'Uncommon': 'bg-[var(--color-green)]',
  'Rare': 'bg-[var(--color-blue)]',
  'Epic': 'bg-[var(--color-purple)]',
  'Legendary': 'bg-[var(--color-orange)]'
};

export default function CraftingPage() {
  const { craftingRecipes, inventory, craftItem } = useGameStore();
  const { addToast } = useToastStore();
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  
  const canCraft = (recipe: CraftingRecipe) => {
    return recipe.inputs.every(input => {
      const item = inventory.find(i => 
        i.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || 
        i.id === input.itemId
      );
      return item && item.quantity >= input.quantity;
    });
  };

  const handleCraft = (recipe: CraftingRecipe) => {
    const success = craftItem(recipe.id);
    if (success) {
      addToast(`Crafted ${recipe.output.name}!`, 'success');
    } else {
      addToast(`Missing materials for ${recipe.name}`, 'error');
    }
  };

  // Group recipes by category
  const consumables = craftingRecipes.filter(r => r.output.type === 'consumable');
  const weapons = craftingRecipes.filter(r => r.output.type === 'weapon');
  const armor = craftingRecipes.filter(r => r.output.type === 'armor');

  return (
    <motion.div 
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Hammer className="text-[var(--color-orange)]" />
              Crafting
            </h1>
          </div>
          <Link href="/inventory" className="rpg-button">
            <Package size={18} />
            Inventory
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Intro */}
        <motion.div 
          className="mb-8 border-l-4 border-[var(--color-orange)] pl-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-[var(--color-orange)] italic font-medium">
            Combine materials to create powerful items!
          </p>
        </motion.div>

        {/* Consumables */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-[var(--color-green)]" />
          Consumables
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {consumables.map((recipe, index) => {
            const craftable = canCraft(recipe);
            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rpg-card ${craftable ? 'hover:border-[var(--color-green)]' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 ${RARITY_BG[recipe.rarity]} rounded-lg flex items-center justify-center text-2xl`}>
                    {recipe.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{recipe.name}</h3>
                    <p className={`text-xs ${RARITY_COLORS[recipe.rarity]}`}>{recipe.rarity}</p>
                  </div>
                </div>
                
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">{recipe.description}</p>
                
                {/* Inputs */}
                <div className="mb-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Materials:</p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.inputs.map((input, i) => {
                      const hasItem = inventory.find(item => 
                        item.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || 
                        item.id === input.itemId
                      );
                      const hasEnough = hasItem && hasItem.quantity >= input.quantity;
                      return (
                        <span 
                          key={i} 
                          className={`text-xs px-2 py-1 rounded ${
                            hasEnough 
                              ? 'bg-[var(--color-green)]/20 text-[var(--color-green)]' 
                              : 'bg-[var(--color-red)]/20 text-[var(--color-red)]'
                          }`}
                        >
                          {input.itemId.replace('-', ' ')} x{input.quantity}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                {/* Output */}
                <div className="mb-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Creates:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{recipe.output.icon}</span>
                    <span className="font-bold">{recipe.output.name}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleCraft(recipe)}
                  disabled={!craftable}
                  className={`w-full rpg-button text-sm ${
                    craftable 
                      ? '!bg-[var(--color-green)] !text-white' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {craftable ? (
                    <>
                      <Hammer size={14} />
                      Craft
                    </>
                  ) : (
                    <>
                      <X size={14} />
                      Missing Materials
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Weapons */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          Weapons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {weapons.map((recipe, index) => {
            const craftable = canCraft(recipe);
            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rpg-card ${craftable ? 'hover:border-[var(--color-orange)]' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 ${RARITY_BG[recipe.rarity]} rounded-lg flex items-center justify-center text-2xl`}>
                    {recipe.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{recipe.name}</h3>
                    <p className={`text-xs ${RARITY_COLORS[recipe.rarity]}`}>{recipe.rarity}</p>
                  </div>
                </div>
                
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">{recipe.description}</p>
                
                {/* Stats */}
                {recipe.output.stats && (
                  <div className="mb-3 flex gap-2">
                    {recipe.output.stats.xpBonus && (
                      <span className="text-xs px-2 py-1 bg-[var(--color-green)]/20 text-[var(--color-green)] rounded">
                        +{recipe.output.stats.xpBonus} XP
                      </span>
                    )}
                    {recipe.output.stats.goldBonus && (
                      <span className="text-xs px-2 py-1 bg-[var(--color-yellow)]/20 text-[var(--color-yellow)] rounded">
                        +{recipe.output.stats.goldBonus} Gold
                      </span>
                    )}
                    {recipe.output.stats.damage && (
                      <span className="text-xs px-2 py-1 bg-[var(--color-red)]/20 text-[var(--color-red)] rounded">
                        +{recipe.output.stats.damage} DMG
                      </span>
                    )}
                  </div>
                )}
                
                {/* Inputs */}
                <div className="mb-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Materials:</p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.inputs.map((input, i) => {
                      const hasItem = inventory.find(item => 
                        item.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || 
                        item.id === input.itemId
                      );
                      const hasEnough = hasItem && hasItem.quantity >= input.quantity;
                      return (
                        <span 
                          key={i} 
                          className={`text-xs px-2 py-1 rounded ${
                            hasEnough 
                              ? 'bg-[var(--color-green)]/20 text-[var(--color-green)]' 
                              : 'bg-[var(--color-red)]/20 text-[var(--color-red)]'
                          }`}
                        >
                          {input.itemId.replace('-', ' ')} x{input.quantity}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                <button
                  onClick={() => handleCraft(recipe)}
                  disabled={!craftable}
                  className={`w-full rpg-button text-sm ${
                    craftable 
                      ? '!bg-[var(--color-orange)] !text-white' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {craftable ? (
                    <>
                      <Hammer size={14} />
                      Craft
                    </>
                  ) : (
                    <>
                      <X size={14} />
                      Missing Materials
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Armor */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          Armor
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {armor.map((recipe, index) => {
            const craftable = canCraft(recipe);
            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rpg-card ${craftable ? 'hover:border-[var(--color-blue)]' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 ${RARITY_BG[recipe.rarity]} rounded-lg flex items-center justify-center text-2xl`}>
                    {recipe.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{recipe.name}</h3>
                    <p className={`text-xs ${RARITY_COLORS[recipe.rarity]}`}>{recipe.rarity}</p>
                  </div>
                </div>
                
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">{recipe.description}</p>
                
                {/* Stats */}
                {recipe.output.stats && (
                  <div className="mb-3 flex gap-2">
                    {recipe.output.stats.xpBonus && (
                      <span className="text-xs px-2 py-1 bg-[var(--color-green)]/20 text-[var(--color-green)] rounded">
                        +{recipe.output.stats.xpBonus} XP
                      </span>
                    )}
                    {recipe.output.stats.goldBonus && (
                      <span className="text-xs px-2 py-1 bg-[var(--color-yellow)]/20 text-[var(--color-yellow)] rounded">
                        +{recipe.output.stats.goldBonus} Gold
                      </span>
                    )}
                    {recipe.output.stats.defense && (
                      <span className="text-xs px-2 py-1 bg-[var(--color-blue)]/20 text-[var(--color-blue)] rounded">
                        +{recipe.output.stats.defense} DEF
                      </span>
                    )}
                  </div>
                )}
                
                {/* Inputs */}
                <div className="mb-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Materials:</p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.inputs.map((input, i) => {
                      const hasItem = inventory.find(item => 
                        item.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || 
                        item.id === input.itemId
                      );
                      const hasEnough = hasItem && hasItem.quantity >= input.quantity;
                      return (
                        <span 
                          key={i} 
                          className={`text-xs px-2 py-1 rounded ${
                            hasEnough 
                              ? 'bg-[var(--color-green)]/20 text-[var(--color-green)]' 
                              : 'bg-[var(--color-red)]/20 text-[var(--color-red)]'
                          }`}
                        >
                          {input.itemId.replace('-', ' ')} x{input.quantity}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                <button
                  onClick={() => handleCraft(recipe)}
                  disabled={!craftable}
                  className={`w-full rpg-button text-sm ${
                    craftable 
                      ? '!bg-[var(--color-blue)] !text-white' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {craftable ? (
                    <>
                      <Hammer size={14} />
                      Craft
                    </>
                  ) : (
                    <>
                      <X size={14} />
                      Missing Materials
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
