'use client';

import { useGameStore, InventoryItem, ItemRarity, ItemType, CraftingRecipe } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import Link from 'next/link';
import { useState } from 'react';
import {
  Backpack, Shield, Sparkles, Trash2, Plus, ChevronLeft, Zap, Coins, Flame,
  Hammer, X,
  Gem, Heart, Coffee, Gamepad2, Tv, Music, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'inventory' | 'crafting' | 'shop';

// ── Inventory constants ──
const INV_RARITY_COLORS: Record<ItemRarity, string> = {
  'Common': 'text-gray-400', 'Uncommon': 'text-green-400', 'Rare': 'text-blue-400',
  'Epic': 'text-purple-400', 'Legendary': 'text-yellow-400',
};
const INV_RARITY_BG: Record<ItemRarity, string> = {
  'Common': 'bg-gray-500/20', 'Uncommon': 'bg-green-500/20', 'Rare': 'bg-blue-500/20',
  'Epic': 'bg-purple-500/20', 'Legendary': 'bg-yellow-500/20',
};
const ITEM_ICONS: Record<string, string> = {
  'sword': '⚔️', 'shield': '🛡️', 'ring': '💍', 'potion': '🧪',
  'scroll': '📜', 'crystal': '💎', 'chest': '📦', 'key': '🗝️',
};

// ── Crafting constants ──
const CRAFT_RARITY_COLORS: Record<string, string> = {
  'Common': 'text-[var(--color-text-muted)]', 'Uncommon': 'text-[var(--color-green)]',
  'Rare': 'text-[var(--color-blue)]', 'Epic': 'text-[var(--color-purple)]', 'Legendary': 'text-[var(--color-orange)]',
};
const CRAFT_RARITY_BG: Record<string, string> = {
  'Common': 'bg-[var(--color-text-muted)]', 'Uncommon': 'bg-[var(--color-green)]',
  'Rare': 'bg-[var(--color-blue)]', 'Epic': 'bg-[var(--color-purple)]', 'Legendary': 'bg-[var(--color-orange)]',
};

// ── Shop constants ──
const rewardIcons = [
  { icon: Coffee, color: 'from-amber-400 to-orange-500' },
  { icon: Gamepad2, color: 'from-indigo-400 to-purple-500' },
  { icon: Tv, color: 'from-pink-400 to-rose-500' },
  { icon: Music, color: 'from-cyan-400 to-blue-500' },
  { icon: Gift, color: 'from-emerald-400 to-teal-500' },
  { icon: Sparkles, color: 'from-yellow-400 to-amber-500' },
];

// ─────────────────────────────────────────────
function InventoryTab() {
  const { inventory, equippedItems, equipItem, unequipItem, removeItem, useItem: consumeItem, addItem } = useGameStore();
  const { addToast } = useToastStore();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('accessory');
  const [newItemRarity, setNewItemRarity] = useState<ItemRarity>('Common');

  const handleEquip = (item: InventoryItem) => {
    if (item.equipped) { unequipItem(item.type); addToast(`Unequipped ${item.name}`, 'info'); }
    else { equipItem(item.id); addToast(`Equipped ${item.name}!`, 'success'); }
    setSelectedItem(null);
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) return;
    const itemStats: Partial<InventoryItem['stats']> = {};
    if (newItemRarity === 'Common') { itemStats.xpBonus = 10; }
    else if (newItemRarity === 'Uncommon') { itemStats.xpBonus = 25; itemStats.goldBonus = 10; }
    else if (newItemRarity === 'Rare') { itemStats.xpBonus = 50; itemStats.goldBonus = 25; }
    else if (newItemRarity === 'Epic') { itemStats.xpBonus = 100; itemStats.goldBonus = 50; itemStats.streakBonus = 1; }
    else if (newItemRarity === 'Legendary') { itemStats.xpBonus = 250; itemStats.goldBonus = 100; itemStats.streakBonus = 2; }
    addItem({ name: newItemName, description: `A ${newItemRarity.toLowerCase()} ${newItemType}.`, type: newItemType, rarity: newItemRarity,
      icon: newItemType === 'weapon' ? 'sword' : newItemType === 'armor' ? 'shield' : 'ring', quantity: 1, stats: itemStats });
    addToast(`Added ${newItemName} to inventory!`, 'success');
    setNewItemName(''); setShowAddItem(false);
  };

  const totalStats = (() => {
    const s = { xpBonus: 0, goldBonus: 0, streakBonus: 0 };
    Object.values(equippedItems).forEach(item => {
      if (item?.stats) { s.xpBonus += item.stats.xpBonus || 0; s.goldBonus += item.stats.goldBonus || 0; s.streakBonus += item.stats.streakBonus || 0; }
    });
    return s;
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowAddItem(true)} className="rpg-button !bg-[var(--color-purple)] !text-white">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Equipment Slots */}
      <motion.div className="rpg-card mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield size={20} /> Equipped Items</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
            const equipped = equippedItems[slot];
            return (
              <div key={slot} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${equipped ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'}`}
                onClick={() => equipped && setSelectedItem(equipped)}>
                {equipped ? (
                  <>
                    <div className="text-4xl mb-2">{ITEM_ICONS[equipped.icon] || '📦'}</div>
                    <p className={`font-bold text-sm ${INV_RARITY_COLORS[equipped.rarity]}`}>{equipped.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] capitalize">{slot}</p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-2 opacity-30">{slot === 'weapon' ? '⚔️' : slot === 'armor' ? '🛡️' : '💍'}</div>
                    <p className="text-sm text-[var(--color-text-muted)]">No {slot}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Equipment Bonuses:</p>
          <div className="flex gap-4 text-sm">
            {totalStats.xpBonus > 0 && <span className="text-[var(--color-green)] flex items-center gap-1"><Zap size={14} /> +{totalStats.xpBonus} XP</span>}
            {totalStats.goldBonus > 0 && <span className="text-[var(--color-yellow)] flex items-center gap-1"><Coins size={14} /> +{totalStats.goldBonus} Gold</span>}
            {totalStats.streakBonus > 0 && <span className="text-[var(--color-orange)] flex items-center gap-1"><Flame size={14} /> +{totalStats.streakBonus} Streak</span>}
            {totalStats.xpBonus === 0 && totalStats.goldBonus === 0 && totalStats.streakBonus === 0 && (
              <span className="text-[var(--color-text-muted)]">Equip items to gain bonuses</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Inventory Grid */}
      <h2 className="text-lg font-bold mb-4">Your Items ({inventory.length})</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatePresence>
          {inventory.map((item, index) => (
            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ delay: index * 0.05 }}
              className={`rpg-card cursor-pointer relative ${item.equipped ? 'ring-2 ring-[var(--color-purple)]' : ''}`} onClick={() => setSelectedItem(item)}>
              {item.equipped && <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-purple)] rounded-full flex items-center justify-center"><Sparkles size={14} className="text-white" /></div>}
              <div className="text-4xl mb-2 text-center">{ITEM_ICONS[item.icon] || '📦'}</div>
              <p className={`font-bold text-sm text-center ${INV_RARITY_COLORS[item.rarity]}`}>{item.name}</p>
              <p className="text-xs text-[var(--color-text-muted)] text-center capitalize">{item.rarity} {item.type}</p>
              {item.quantity > 1 && <div className="absolute bottom-2 right-2 text-xs bg-[var(--color-bg-dark)] px-2 py-1 rounded">x{item.quantity}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {inventory.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <Backpack size={48} className="mx-auto mb-4 opacity-30" />
          <p>Your inventory is empty</p><p className="text-sm">Complete quests to earn items!</p>
        </div>
      )}

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className={`${INV_RARITY_BG[selectedItem.rarity]} p-6 rounded-t-lg`}>
                <div className="text-6xl mb-4 text-center">{ITEM_ICONS[selectedItem.icon] || '📦'}</div>
                <h2 className={`text-2xl font-bold text-center ${INV_RARITY_COLORS[selectedItem.rarity]}`}>{selectedItem.name}</h2>
                <p className="text-center text-[var(--color-text-secondary)] capitalize">{selectedItem.rarity} {selectedItem.type}</p>
              </div>
              <div className="p-6">
                <p className="text-[var(--color-text-secondary)] mb-4">{selectedItem.description}</p>
                {selectedItem.stats && (
                  <div className="space-y-2 mb-6">
                    <p className="font-bold text-sm">Stats:</p>
                    {selectedItem.stats.xpBonus && <div className="flex items-center gap-2 text-[var(--color-green)]"><Zap size={16} /> +{selectedItem.stats.xpBonus} XP Bonus</div>}
                    {selectedItem.stats.goldBonus && <div className="flex items-center gap-2 text-[var(--color-yellow)]"><Coins size={16} /> +{selectedItem.stats.goldBonus} Gold Bonus</div>}
                    {selectedItem.stats.streakBonus && <div className="flex items-center gap-2 text-[var(--color-orange)]"><Flame size={16} /> +{selectedItem.stats.streakBonus} Streak Bonus</div>}
                  </div>
                )}
                <div className="flex gap-3">
                  {(selectedItem.type === 'weapon' || selectedItem.type === 'armor' || selectedItem.type === 'accessory') && (
                    <button onClick={() => handleEquip(selectedItem)} className="flex-1 rpg-button !bg-[var(--color-purple)] !text-white">
                      {selectedItem.equipped ? 'Unequip' : 'Equip'}
                    </button>
                  )}
                  {selectedItem.type === 'consumable' && (
                    <button onClick={() => { consumeItem(selectedItem.id); addToast(`Used ${selectedItem.name}!`, 'success'); setSelectedItem(null); }}
                      className="flex-1 rpg-button !bg-[var(--color-green)] !text-white">Use</button>
                  )}
                  <button onClick={() => { removeItem(selectedItem.id); addToast(`Discarded ${selectedItem.name}`, 'info'); setSelectedItem(null); }}
                    className="rpg-button !text-[var(--color-red)]"><Trash2 size={18} /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddItem(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Add New Item</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Item Name</label>
                  <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="input-field" placeholder="e.g., Mystic Sword" />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Type</label>
                  <select value={newItemType} onChange={(e) => setNewItemType(e.target.value as ItemType)} className="input-field">
                    <option value="weapon">Weapon</option><option value="armor">Armor</option>
                    <option value="accessory">Accessory</option><option value="consumable">Consumable</option><option value="material">Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Rarity</label>
                  <select value={newItemRarity} onChange={(e) => setNewItemRarity(e.target.value as ItemRarity)} className="input-field">
                    <option value="Common">Common</option><option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option><option value="Epic">Epic</option><option value="Legendary">Legendary</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddItem(false)} className="flex-1 rpg-button">Cancel</button>
                  <button onClick={handleAddNewItem} disabled={!newItemName.trim()} className="flex-1 rpg-button !bg-[var(--color-purple)] !text-white disabled:opacity-50">Add Item</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
function CraftingTab() {
  const { craftingRecipes, inventory, craftItem } = useGameStore();
  const { addToast } = useToastStore();
  const canCraft = (recipe: CraftingRecipe) =>
    recipe.inputs.every(input => {
      const item = inventory.find(i => i.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || i.id === input.itemId);
      return item && item.quantity >= input.quantity;
    });

  const handleCraft = (recipe: CraftingRecipe) => {
    const success = craftItem(recipe.id);
    if (success) addToast(`Crafted ${recipe.output.name}!`, 'success');
    else addToast(`Missing materials for ${recipe.name}`, 'error');
  };

  const renderRecipeCard = (recipe: CraftingRecipe, craftColor: string) => {
    const craftable = canCraft(recipe);
    return (
      <motion.div key={recipe.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={`rpg-card ${craftable ? `hover:border-[${craftColor}]` : 'opacity-60'}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 ${CRAFT_RARITY_BG[recipe.rarity]} rounded-lg flex items-center justify-center text-2xl`}>{recipe.icon}</div>
          <div className="flex-1">
            <h3 className="font-bold">{recipe.name}</h3>
            <p className={`text-xs ${CRAFT_RARITY_COLORS[recipe.rarity]}`}>{recipe.rarity}</p>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">{recipe.description}</p>
        {recipe.output.stats && (
          <div className="mb-3 flex gap-2">
            {recipe.output.stats.xpBonus && <span className="text-xs px-2 py-1 bg-[var(--color-green)]/20 text-[var(--color-green)] rounded">+{recipe.output.stats.xpBonus} XP</span>}
            {recipe.output.stats.goldBonus && <span className="text-xs px-2 py-1 bg-[var(--color-yellow)]/20 text-[var(--color-yellow)] rounded">+{recipe.output.stats.goldBonus} Gold</span>}
            {recipe.output.stats.damage && <span className="text-xs px-2 py-1 bg-[var(--color-red)]/20 text-[var(--color-red)] rounded">+{recipe.output.stats.damage} DMG</span>}
            {recipe.output.stats.defense && <span className="text-xs px-2 py-1 bg-[var(--color-blue)]/20 text-[var(--color-blue)] rounded">+{recipe.output.stats.defense} DEF</span>}
          </div>
        )}
        <div className="mb-3">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Materials:</p>
          <div className="flex flex-wrap gap-1">
            {recipe.inputs.map((input, i) => {
              const hasItem = inventory.find(item => item.name.toLowerCase().includes(input.itemId.replace('-', ' ')) || item.id === input.itemId);
              const hasEnough = hasItem && hasItem.quantity >= input.quantity;
              return (
                <span key={i} className={`text-xs px-2 py-1 rounded ${hasEnough ? 'bg-[var(--color-green)]/20 text-[var(--color-green)]' : 'bg-[var(--color-red)]/20 text-[var(--color-red)]'}`}>
                  {input.itemId.replace('-', ' ')} x{input.quantity}
                </span>
              );
            })}
          </div>
        </div>
        <div className="mb-3">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Creates:</p>
          <div className="flex items-center gap-2"><span className="text-lg">{recipe.output.icon}</span><span className="font-bold">{recipe.output.name}</span></div>
        </div>
        <button onClick={() => handleCraft(recipe)} disabled={!craftable}
          className={`w-full rpg-button text-sm ${craftable ? `!bg-[${craftColor}] !text-white` : 'opacity-50 cursor-not-allowed'}`}>
          {craftable ? <><Hammer size={14} /> Craft</> : <><X size={14} /> Missing Materials</>}
        </button>
      </motion.div>
    );
  };

  const consumables = craftingRecipes.filter(r => r.output.type === 'consumable');
  const weapons = craftingRecipes.filter(r => r.output.type === 'weapon');
  const armor = craftingRecipes.filter(r => r.output.type === 'armor');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <motion.div className="mb-6 border-l-4 border-[var(--color-orange)] pl-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-[var(--color-orange)] italic font-medium">Combine materials to create powerful items!</p>
      </motion.div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Sparkles size={20} className="text-[var(--color-green)]" /> Consumables</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {consumables.map(r => renderRecipeCard(r, 'var(--color-green)'))}
      </div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-xl">⚔️</span> Weapons</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {weapons.map(r => renderRecipeCard(r, 'var(--color-orange)'))}
      </div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-xl">🛡️</span> Armor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {armor.map(r => renderRecipeCard(r, 'var(--color-blue)'))}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────
function ShopTab() {
  const { gold, gems, shopItems, addShopItem, deleteShopItem, buyReward, addGems, addBuff, buyGoldBuff, streakFreezes, buyStreakFreeze } = useGameStore();
  const { addToast } = useToastStore();
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState(100);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addShopItem(newItemName, newItemCost);
    addToast(`Reward "${newItemName}" created!`, 'success');
    setNewItemName(''); setNewItemCost(100);
  };

  const handleBuy = (itemId: string, itemName: string, itemCost: number) => {
    if (gold >= itemCost) { buyReward(itemId); addToast(`Reward "${itemName}" purchased!`, 'success'); }
    else addToast(`Not enough gold! Need ${itemCost - gold} more.`, 'error');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <motion.div className="mb-6 border-l-4 border-[var(--color-purple)] pl-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-[var(--color-purple)] italic font-medium">Spend your gold on buffs, or use gems to unlock special boosts.</p>
      </motion.div>

      {/* Create Reward */}
      <motion.div className="rpg-card mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-lg font-bold mb-4">Create Reward</h2>
        <form onSubmit={handleAddItem} className="space-y-4">
          <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g., Watch a movie" className="input-field" />
          <div className="flex items-center gap-2 bg-[var(--color-bg-dark)] border border-[var(--color-border)] px-4 py-3 rounded flex-1">
            <Gem className="text-[var(--color-blue)]" size={20} />
            <input type="number" value={newItemCost} onChange={(e) => setNewItemCost(Number(e.target.value))} min={1}
              className="bg-transparent w-full font-bold text-lg focus:outline-none text-[var(--color-text-primary)]" />
          </div>
          <motion.button type="submit" disabled={!newItemName.trim()}
            className="rpg-button w-full !bg-[var(--color-purple)] !text-white disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Plus size={20} /> Create Reward
          </motion.button>
        </form>
      </motion.div>

      {/* Special Items (gems) */}
      <h2 className="text-xl font-bold mb-2">Special Items</h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4 flex items-center gap-2">
        <Gem className="text-[var(--color-blue)]" size={16} /> You have <span className="font-bold text-[var(--color-blue)]">{gems}</span> gems
      </p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {([
          { icon: Heart, label: 'Gem Pack', desc: 'Instantly gain 50 bonus gems', cost: 50, gradient: 'from-red-500 to-pink-500', onBuy: () => { addGems(50); addToast('+50 Gems added!', 'success'); } },
          { icon: Zap, label: 'XP Boost', desc: 'Double XP for 1 hour', cost: 100, gradient: 'from-yellow-400 to-orange-500', onBuy: () => { addBuff('xp', 2, 60); addToast('XP Boost active! 2x XP for 60 min', 'success'); } },
          { icon: Flame, label: 'Streak Freeze', desc: `Protect your streak from breaking. You have ${streakFreezes} stored.`, cost: 10, gradient: 'from-cyan-500 to-blue-500', onBuy: () => { buyStreakFreeze(); addToast('Streak Freeze saved! Your streak is protected for one miss.', 'success'); } },
        ] as const).map((item, index) => {
          const Icon = item.icon;
          const canAfford = gems >= item.cost;
          return (
            <motion.div key={item.label} className="rpg-card text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + index * 0.1 }} whileHover={{ scale: 1.05 }}>
              <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-lg mx-auto mb-3 flex items-center justify-center`}><Icon className="text-white" size={32} /></div>
              <h3 className="font-bold mb-1">{item.label}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">{item.desc}</p>
              <motion.button onClick={() => { if (!canAfford) { addToast(`Need ${item.cost - gems} more gems.`, 'error'); return; } addGems(-item.cost); item.onBuy(); }}
                className={`rpg-button w-full !text-white text-sm !py-2 ${canAfford ? '!bg-[var(--color-orange)]' : 'opacity-50 cursor-not-allowed !bg-[var(--color-bg-hover)]'}`}
                whileHover={canAfford ? { scale: 1.05 } : {}} whileTap={canAfford ? { scale: 0.95 } : {}}>
                <Gem size={16} /> {item.cost} Gems
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Gold Exchange */}
      <h2 className="text-xl font-bold mb-2">Gold Exchange</h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        🪙 You have <span className="font-bold text-[var(--color-yellow)]">{gold}</span> gold
      </p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'XP Elixir', desc: '+50% XP for 30 min', cost: 150, type: 'xp' as const, duration: 30 },
          { label: 'Gold Aura', desc: '+50% Gold for 30 min', cost: 200, type: 'gold' as const, duration: 30 },
        ].map((item) => {
          const canAfford = gold >= item.cost;
          return (
            <motion.div key={item.label} className="rpg-card text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.03 }}>
              <p className="text-3xl mb-2">{item.type === 'xp' ? '✨' : '💫'}</p>
              <h3 className="font-bold mb-1">{item.label}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">{item.desc}</p>
              <motion.button onClick={() => { const ok = buyGoldBuff(item.type, item.duration, item.cost); if (ok) addToast(`${item.label} active!`, 'success'); else addToast(`Need ${item.cost - gold} more gold!`, 'error'); }}
                className={`rpg-button w-full !text-white text-sm !py-2 ${canAfford ? '!bg-[var(--color-yellow)] !text-black' : 'opacity-50 cursor-not-allowed'}`}
                whileHover={canAfford ? { scale: 1.05 } : {}} whileTap={canAfford ? { scale: 0.95 } : {}}>
                🪙 {item.cost} Gold
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Custom Rewards */}
      <h2 className="text-xl font-bold mb-4">Your Rewards</h2>
      {shopItems.length === 0 ? (
        <motion.div className="rpg-card text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                <motion.div key={item.id} className="rpg-card !p-4 flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.1 }} layout>
                  <div className={`w-14 h-14 bg-gradient-to-br ${iconConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}><Icon className="text-white" size={28} /></div>
                  <div className="flex-1">
                    <h3 className="font-bold">{item.name}</h3>
                    <div className="flex items-center gap-1 text-[var(--color-blue)] font-bold text-sm"><Gem size={16} />{item.cost}</div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button onClick={() => handleBuy(item.id, item.name, item.cost)} disabled={!canAfford}
                      className={`rpg-button !py-2 !px-4 text-sm ${canAfford ? '!bg-[var(--color-purple)] !text-white' : 'opacity-50 cursor-not-allowed'}`}
                      whileHover={canAfford ? { scale: 1.05 } : {}} whileTap={canAfford ? { scale: 0.95 } : {}}>
                      {canAfford ? 'Buy' : 'Locked'}
                    </motion.button>
                    <motion.button onClick={() => { deleteShopItem(item.id); addToast(`Reward deleted`, 'info'); }}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
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
  );
}

// ─────────────────────────────────────────────
export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'inventory', label: 'Inventory', icon: '🎒' },
    { id: 'crafting', label: 'Crafting', icon: '🔨' },
    { id: 'shop', label: 'Shop', icon: '💎' },
  ];

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-5xl mx-auto px-4 pt-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Backpack className="text-[var(--color-purple)]" /> Items
          </h1>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 mt-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-purple)] text-[var(--color-purple)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'inventory' && <InventoryTab />}
      {activeTab === 'crafting' && <CraftingTab />}
      {activeTab === 'shop' && <ShopTab />}
    </motion.div>
  );
}
