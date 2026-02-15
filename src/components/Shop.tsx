'use client';

import { useGameStore } from '@/store/useGameStore';
import { Coins, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function Shop() {
    const { gold, shopItems, addShopItem, deleteShopItem, buyReward, purchasedRewards } = useGameStore();
    const [newItemName, setNewItemName] = useState('');
    const [newItemCost, setNewItemCost] = useState(50);
    const [showHistory, setShowHistory] = useState(false);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        addShopItem(newItemName, newItemCost);
        setNewItemName('');
        setNewItemCost(50);
    };

    return (
        <div className="glass-panel p-6 mt-8 border-yellow-500/30">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <ShoppingBag className="text-yellow-400" />
                    <span>REWARD SHOP</span>
                </h2>
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-900/20 rounded-full border border-yellow-500/50">
                    <Coins className="text-yellow-400" size={18} />
                    <span className="text-yellow-100 font-bold">{gold} Gold</span>
                </div>
            </div>

            {/* Add New Reward Form */}
            <form onSubmit={handleAddItem} className="flex gap-2 mb-8 p-4 bg-black/20 rounded-lg">
                <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="New Reward (e.g., Watch a Movie)"
                    className="flex-1 bg-transparent border-b border-gray-700 focus:border-yellow-400 focus:outline-none px-2 py-1 text-white"
                />
                <input
                    type="number"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(Number(e.target.value))}
                    className="w-20 bg-transparent border-b border-gray-700 focus:border-yellow-400 focus:outline-none px-2 py-1 text-white text-right"
                />
                <button
                    type="submit"
                    className="bg-yellow-500/20 text-yellow-400 p-2 rounded hover:bg-yellow-500/40 transition-colors"
                >
                    <Plus size={20} />
                </button>
            </form>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shopItems.map((item) => (
                    <div key={item.id} className="p-4 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center group">
                        <div>
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-xs text-yellow-500 flex items-center gap-1">
                                <Coins size={12} /> {item.cost}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => buyReward(item.id)}
                                disabled={gold < item.cost}
                                className={`px-3 py-1.5 rounded text-sm font-bold transition-all
                  ${gold >= item.cost
                                        ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'}
                `}
                            >
                                Buy
                            </button>
                            <button
                                onClick={() => deleteShopItem(item.id)}
                                className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toggle History */}
            <div className="mt-8 pt-4 border-t border-white/5 text-center">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs text-gray-500 hover:text-white underline-offset-4 hover:underline"
                >
                    {showHistory ? 'Hide Purchase History' : 'Show Purchase History'}
                </button>

                {showHistory && (
                    <div className="mt-4 space-y-2 text-left bg-black/20 p-4 rounded-lg max-h-40 overflow-y-auto">
                        {purchasedRewards.length === 0 && <p className="text-gray-600 text-center text-sm">No purchases yet.</p>}
                        {purchasedRewards.slice().reverse().map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-400 dashed-border-bottom pb-1 mb-1">
                                <span>{item.name}</span>
                                <span className="text-yellow-600/70">-{item.cost} G</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
