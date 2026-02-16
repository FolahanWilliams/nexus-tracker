'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Coins,
  Sparkles,
  Gift,
  Coffee,
  Gamepad2,
  Tv,
  Music,
  ShoppingCart
} from 'lucide-react';

const rewardIcons = [
  { icon: Coffee, color: 'from-amber-400 to-orange-500' },
  { icon: Gamepad2, color: 'from-indigo-400 to-purple-500' },
  { icon: Tv, color: 'from-pink-400 to-rose-500' },
  { icon: Music, color: 'from-cyan-400 to-blue-500' },
  { icon: Gift, color: 'from-emerald-400 to-teal-500' },
  { icon: Sparkles, color: 'from-yellow-400 to-amber-500' },
];

export default function ShopPage() {
  const { gold, shopItems, addShopItem, deleteShopItem, buyReward, purchasedRewards } = useGameStore();
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState(100);
  const [showHistory, setShowHistory] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addShopItem(newItemName, newItemCost);
    setNewItemName('');
    setNewItemCost(100);
  };

  const getRewardIcon = (index: number) => {
    const config = rewardIcons[index % rewardIcons.length];
    const Icon = config.icon;
    return { Icon, color: config.color };
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Reward Shop</h1>
          <p className="text-white/60">Spend your gold on well-deserved rewards</p>
        </div>
        <div className="card px-6 py-3 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Coins className="text-white" size={24} />
          </div>
          <div>
            <p className="text-white/60 text-sm">Your Balance</p>
            <p className="text-3xl font-bold text-yellow-400">{gold} Gold</p>
          </div>
        </div>
      </div>

      {/* Add Custom Reward */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus size={20} className="text-indigo-400" />
          Create Custom Reward
        </h3>
        <form onSubmit={handleAddItem} className="flex flex-col lg:flex-row gap-4">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="What reward do you want? (e.g., 'Watch a movie')"
            className="input flex-1"
          />
          <div className="flex gap-3">
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400" size={18} />
              <input
                type="number"
                value={newItemCost}
                onChange={(e) => setNewItemCost(Number(e.target.value))}
                min={1}
                className="input pl-10 w-32"
              />
            </div>
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="btn btn-primary whitespace-nowrap"
            >
              <Plus size={20} />
              Add Reward
            </button>
          </div>
        </form>
      </div>

      {/* Rewards Grid */}
      <div>
        <h3 className="text-lg font-bold mb-4">Available Rewards</h3>
        {shopItems.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <ShoppingBag size={40} className="text-white/30" />
            </div>
            <h3 className="text-xl font-bold mb-2">No rewards yet</h3>
            <p className="text-white/60">Create your first reward above!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopItems.map((item, index) => {
              const { Icon, color } = getRewardIcon(index);
              const canAfford = gold >= item.cost;
              
              return (
                <div
                  key={item.id}
                  className={`card p-5 flex flex-col transition-all duration-300 ${
                    canAfford ? 'card-interactive' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <button
                      onClick={() => deleteShopItem(item.id)}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <h4 className="font-bold text-lg mb-2 flex-1">{item.name}</h4>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Coins size={18} />
                      <span className="font-bold">{item.cost}</span>
                    </div>
                    <button
                      onClick={() => buyReward(item.id)}
                      disabled={!canAfford}
                      className={`btn py-2 px-4 text-sm ${
                        canAfford 
                          ? 'btn-primary' 
                          : 'btn-secondary opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (
                        <>
                          <ShoppingCart size={16} />
                          Buy
                        </>
                      ) : (
                        'Locked'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase History */}
      {purchasedRewards.length > 0 && (
        <div className="card p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="text-lg font-bold">Purchase History</h3>
            <span className="text-white/60 text-sm">
              {showHistory ? 'Hide' : 'Show'} ({purchasedRewards.length} items)
            </span>
          </button>
          
          {showHistory && (
            <div className="mt-4 space-y-2 animate-fade-in">
              {[...purchasedRewards].reverse().map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <span className="text-white/80">{item.name}</span>
                  <span className="text-yellow-400 font-medium">-{item.cost} gold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
