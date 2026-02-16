'use client';

import { useGameStore, InventoryItem, ItemRarity, ItemType } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { useState } from 'react';
import { 
  Backpack, 
  Shield, 
  Sparkles, 
  Trash2, 
  Plus,
  ChevronLeft,
  Zap,
  Coins,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const RARITY_COLORS: Record<ItemRarity, string> = {
  'Common': 'text-gray-400',
  'Uncommon': 'text-green-400',
  'Rare': 'text-blue-400',
  'Epic': 'text-purple-400',
  'Legendary': 'text-yellow-400'
};

const RARITY_BG: Record<ItemRarity, string> = {
  'Common': 'bg-gray-500/20',
  'Uncommon': 'bg-green-500/20',
  'Rare': 'bg-blue-500/20',
  'Epic': 'bg-purple-500/20',
  'Legendary': 'bg-yellow-500/20'
};

const ITEM_ICONS: Record<string, string> = {
  'sword': '⚔️',
  'shield': '🛡️',
  'ring': '💍',
  'potion': '🧪',
  'scroll': '📜',
  'crystal': '💎',
  'chest': '📦',
  'key': '🗝️'
};

export default function InventoryPage() {
  const { 
    inventory, 
    equippedItems, 
    equipItem, 
    unequipItem, 
    removeItem, 
    useItem: consumeItem,
    addItem 
  } = useGameStore();
  const { addToast } = useToastStore();
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('accessory');
  const [newItemRarity, setNewItemRarity] = useState<ItemRarity>('Common');

  const handleEquip = (item: InventoryItem) => {
    if (item.equipped) {
      unequipItem(item.type);
      addToast(`Unequipped ${item.name}`, 'info');
    } else {
      equipItem(item.id);
      addToast(`Equipped ${item.name}!`, 'success');
    }
    setSelectedItem(null);
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) return;
    
    const itemStats: Partial<InventoryItem['stats']> = {};
    if (newItemRarity === 'Common') {
      itemStats.xpBonus = 10;
    } else if (newItemRarity === 'Uncommon') {
      itemStats.xpBonus = 25;
      itemStats.goldBonus = 10;
    } else if (newItemRarity === 'Rare') {
      itemStats.xpBonus = 50;
      itemStats.goldBonus = 25;
    } else if (newItemRarity === 'Epic') {
      itemStats.xpBonus = 100;
      itemStats.goldBonus = 50;
      itemStats.streakBonus = 1;
    } else if (newItemRarity === 'Legendary') {
      itemStats.xpBonus = 250;
      itemStats.goldBonus = 100;
      itemStats.streakBonus = 2;
    }

    addItem({
      name: newItemName,
      description: `A ${newItemRarity.toLowerCase()} ${newItemType} that boosts your abilities.`,
      type: newItemType,
      rarity: newItemRarity,
      icon: newItemType === 'weapon' ? 'sword' : newItemType === 'armor' ? 'shield' : 'ring',
      quantity: 1,
      stats: itemStats
    });
    
    addToast(`Added ${newItemName} to inventory!`, 'success');
    setNewItemName('');
    setShowAddItem(false);
  };

  const getTotalStats = () => {
    const stats = { xpBonus: 0, goldBonus: 0, streakBonus: 0 };
    
    Object.values(equippedItems).forEach(item => {
      if (item?.stats) {
        stats.xpBonus += item.stats.xpBonus || 0;
        stats.goldBonus += item.stats.goldBonus || 0;
        stats.streakBonus += item.stats.streakBonus || 0;
      }
    });
    
    return stats;
  };

  const totalStats = getTotalStats();

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
              <Backpack className="text-[var(--color-purple)]" />
              Inventory
            </h1>
          </div>
          <button
            onClick={() => setShowAddItem(true)}
            className="rpg-button !bg-[var(--color-purple)] !text-white"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Equipment Slots */}
        <motion.div 
          className="rpg-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield size={20} />
            Equipped Items
          </h2>
          
          <div className="grid grid-cols-3 gap-4">
            {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
              const equipped = equippedItems[slot];
              return (
                <div
                  key={slot}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                    equipped 
                      ? 'border-[var(--color-purple)] bg-[var(--color-purple)]/10' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
                  }`}
                  onClick={() => equipped && setSelectedItem(equipped)}
                >
                  {equipped ? (
                    <>
                      <div className="text-4xl mb-2">{ITEM_ICONS[equipped.icon] || '📦'}</div>
                      <p className={`font-bold text-sm ${RARITY_COLORS[equipped.rarity]}`}>
                        {equipped.name}
                      </p>
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

          {/* Total Stats */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Equipment Bonuses:</p>
            <div className="flex gap-4 text-sm">
              {totalStats.xpBonus > 0 && (
                <span className="text-[var(--color-green)] flex items-center gap-1">
                  <Zap size={14} /> +{totalStats.xpBonus} XP
                </span>
              )}
              {totalStats.goldBonus > 0 && (
                <span className="text-[var(--color-yellow)] flex items-center gap-1">
                  <Coins size={14} /> +{totalStats.goldBonus} Gold
                </span>
              )}
              {totalStats.streakBonus > 0 && (
                <span className="text-[var(--color-orange)] flex items-center gap-1">
                  <Flame size={14} /> +{totalStats.streakBonus} Streak
                </span>
              )}
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
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className={`rpg-card cursor-pointer relative ${item.equipped ? 'ring-2 ring-[var(--color-purple)]' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                {item.equipped && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-purple)] rounded-full flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}
                <div className="text-4xl mb-2 text-center">{ITEM_ICONS[item.icon] || '📦'}</div>
                <p className={`font-bold text-sm text-center ${RARITY_COLORS[item.rarity]}`}>
                  {item.name}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] text-center capitalize">
                  {item.rarity} {item.type}
                </p>
                {item.quantity > 1 && (
                  <div className="absolute bottom-2 right-2 text-xs bg-[var(--color-bg-dark)] px-2 py-1 rounded">
                    x{item.quantity}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Backpack size={48} className="mx-auto mb-4 opacity-30" />
            <p>Your inventory is empty</p>
            <p className="text-sm">Complete quests to earn items!</p>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`${RARITY_BG[selectedItem.rarity]} p-6 rounded-t-lg`}>
                <div className="text-6xl mb-4 text-center">{ITEM_ICONS[selectedItem.icon] || '📦'}</div>
                <h2 className={`text-2xl font-bold text-center ${RARITY_COLORS[selectedItem.rarity]}`}>
                  {selectedItem.name}
                </h2>
                <p className="text-center text-[var(--color-text-secondary)] capitalize">
                  {selectedItem.rarity} {selectedItem.type}
                </p>
              </div>
              
              <div className="p-6">
                <p className="text-[var(--color-text-secondary)] mb-4">{selectedItem.description}</p>
                
                {selectedItem.stats && (
                  <div className="space-y-2 mb-6">
                    <p className="font-bold text-sm">Stats:</p>
                    {selectedItem.stats.xpBonus && (
                      <div className="flex items-center gap-2 text-[var(--color-green)]">
                        <Zap size={16} /> +{selectedItem.stats.xpBonus} XP Bonus
                      </div>
                    )}
                    {selectedItem.stats.goldBonus && (
                      <div className="flex items-center gap-2 text-[var(--color-yellow)]">
                        <Coins size={16} /> +{selectedItem.stats.goldBonus} Gold Bonus
                      </div>
                    )}
                    {selectedItem.stats.streakBonus && (
                      <div className="flex items-center gap-2 text-[var(--color-orange)]">
                        <Flame size={16} /> +{selectedItem.stats.streakBonus} Streak Bonus
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  {(selectedItem.type === 'weapon' || selectedItem.type === 'armor' || selectedItem.type === 'accessory') && (
                    <button
                      onClick={() => handleEquip(selectedItem)}
                      className="flex-1 rpg-button !bg-[var(--color-purple)] !text-white"
                    >
                      {selectedItem.equipped ? 'Unequip' : 'Equip'}
                    </button>
                  )}
                  {selectedItem.type === 'consumable' && (
                  <button
                    onClick={() => { 
                      consumeItem(selectedItem.id); 
                      addToast(`Used ${selectedItem.name}!`, 'success');
                      setSelectedItem(null); 
                    }}
                    className="flex-1 rpg-button !bg-[var(--color-green)] !text-white"
                  >
                    Use
                  </button>
                  )}
                  <button
                    onClick={() => { 
                      removeItem(selectedItem.id); 
                      addToast(`Discarded ${selectedItem.name}`, 'info');
                      setSelectedItem(null); 
                    }}
                    className="rpg-button !text-[var(--color-red)]"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddItem(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">Add New Item</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Item Name</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="input-field"
                    placeholder="e.g., Mystic Sword"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Type</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as ItemType)}
                    className="input-field"
                  >
                    <option value="weapon">Weapon</option>
                    <option value="armor">Armor</option>
                    <option value="accessory">Accessory</option>
                    <option value="consumable">Consumable</option>
                    <option value="material">Material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2">Rarity</label>
                  <select
                    value={newItemRarity}
                    onChange={(e) => setNewItemRarity(e.target.value as ItemRarity)}
                    className="input-field"
                  >
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddItem(false)}
                    className="flex-1 rpg-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNewItem}
                    disabled={!newItemName.trim()}
                    className="flex-1 rpg-button !bg-[var(--color-purple)] !text-white disabled:opacity-50"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
