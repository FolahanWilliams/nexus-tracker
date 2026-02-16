'use client';

import { useGameStore, AuctionListing, InventoryItem } from '@/store/useGameStore';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Store, 
  Coins, 
  Plus,
  Trash2,
  Gem,
  Package,
  Search,
  Filter
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
  'Common': 'border-[var(--color-text-muted)]',
  'Uncommon': 'border-[var(--color-green)]',
  'Rare': 'border-[var(--color-blue)]',
  'Epic': 'border-[var(--color-purple)]',
  'Legendary': 'border-[var(--color-orange)]'
};

export default function AuctionHousePage() {
  const { auctionListings, inventory, gold, listItem, buyFromAuction, cancelListing } = useGameStore();
  const { addToast } = useToastStore();
  const [showListItem, setShowListItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [listingPrice, setListingPrice] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');

  const filteredListings = auctionListings.filter(listing => {
    const matchesSearch = listing.item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRarity = filterRarity === 'all' || listing.item.rarity === filterRarity;
    return matchesSearch && matchesRarity;
  });

  const handleListItem = () => {
    if (!selectedItem) return;
    listItem(selectedItem.id, listingPrice);
    addToast(`Listed ${selectedItem.name} for ${listingPrice} Gold!`, 'success');
    setShowListItem(false);
    setSelectedItem(null);
    setListingPrice(100);
  };

  const handleBuy = (listing: AuctionListing) => {
    if (gold < listing.price) {
      addToast(`Not enough gold! Need ${listing.price - gold} more.`, 'error');
      return;
    }
    buyFromAuction(listing.id);
    addToast(`Purchased ${listing.item.name} for ${listing.price} Gold!`, 'success');
  };

  const handleCancel = (listing: AuctionListing) => {
    cancelListing(listing.id);
    addToast(`Cancelled listing for ${listing.item.name}`, 'info');
  };

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
              <Store className="text-[var(--color-yellow)]" />
              Auction House
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[var(--color-yellow)]">
              <Coins size={20} />
              <span className="font-bold">{gold}</span>
            </div>
            <button
              onClick={() => setShowListItem(true)}
              className="rpg-button !bg-[var(--color-yellow)] !text-black"
            >
              <Plus size={18} />
              List Item
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <motion.div 
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-yellow)]">{auctionListings.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Active Listings</p>
          </div>
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-green)]">{inventory.length}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Your Items</p>
          </div>
          <div className="rpg-card text-center">
            <p className="text-2xl font-bold text-[var(--color-blue)]">
              {auctionListings.filter(l => l.sellerId === 'player').length}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">Your Listings</p>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="input-field w-40"
          >
            <option value="all">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <motion.div 
            className="rpg-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Store size={48} className="mx-auto mb-4 opacity-30 text-[var(--color-yellow)]" />
            <p className="text-[var(--color-text-secondary)] font-semibold">No items listed</p>
            <p className="text-sm text-[var(--color-text-muted)]">List your first item to start trading!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing, index) => {
              const isOwner = listing.sellerId === 'player';
              const canAfford = gold >= listing.price;
              
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rpg-card border-2 ${RARITY_BG[listing.item.rarity]} p-4`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-14 h-14 bg-[var(--color-bg-dark)] rounded-lg flex items-center justify-center text-2xl">
                      {listing.item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{listing.item.name}</h3>
                      <p className={`text-xs ${RARITY_COLORS[listing.item.rarity]}`}>{listing.item.rarity}</p>
                    </div>
                    {isOwner && (
                      <span className="text-xs px-2 py-1 bg-[var(--color-blue)]/20 text-[var(--color-blue)] rounded">
                        Yours
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">{listing.item.description}</p>
                  
                  {/* Stats */}
                  {listing.item.stats && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {listing.item.stats.xpBonus && (
                        <span className="text-xs px-2 py-1 bg-[var(--color-green)]/20 text-[var(--color-green)] rounded">
                          +{listing.item.stats.xpBonus} XP
                        </span>
                      )}
                      {listing.item.stats.goldBonus && (
                        <span className="text-xs px-2 py-1 bg-[var(--color-yellow)]/20 text-[var(--color-yellow)] rounded">
                          +{listing.item.stats.goldBonus} Gold
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Price & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[var(--color-yellow)] font-bold">
                      <Coins size={18} />
                      {listing.price}
                    </div>
                    
                    {isOwner ? (
                      <button
                        onClick={() => handleCancel(listing)}
                        className="rpg-button !bg-[var(--color-red)] !text-white !py-1 !px-3 text-sm"
                      >
                        <Trash2 size={14} />
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuy(listing)}
                        disabled={!canAfford}
                        className={`rpg-button !py-1 !px-3 text-sm ${
                          canAfford 
                            ? '!bg-[var(--color-green)] !text-white' 
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'Buy' : 'Too Expensive'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* List Item Modal */}
      <AnimatePresence>
        {showListItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowListItem(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rpg-card max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[var(--color-border)]">
                <h2 className="text-xl font-bold">List Item for Sale</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Select an item from your inventory</p>
              </div>

              <div className="p-6">
                {/* Selected Item Preview */}
                {selectedItem && (
                  <div className="mb-6 p-4 bg-[var(--color-bg-dark)] rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{selectedItem.icon}</span>
                      <div>
                        <h3 className="font-bold">{selectedItem.name}</h3>
                        <p className={`text-xs ${RARITY_COLORS[selectedItem.rarity]}`}>{selectedItem.rarity}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{selectedItem.description}</p>
                    
                    {/* Price Input */}
                    <div className="mt-4">
                      <label className="text-sm text-[var(--color-text-secondary)] mb-2 block">Listing Price (Gold)</label>
                      <div className="flex items-center gap-2">
                        <Coins size={20} className="text-[var(--color-yellow)]" />
                        <input
                          type="number"
                          value={listingPrice}
                          onChange={(e) => setListingPrice(Number(e.target.value))}
                          min={1}
                          className="input-field flex-1"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleListItem}
                      className="w-full mt-4 rpg-button !bg-[var(--color-yellow)] !text-black"
                    >
                      <Store size={16} />
                      List for {listingPrice} Gold
                    </button>
                  </div>
                )}

                {/* Inventory Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {inventory.map((item) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 bg-[var(--color-bg-dark)] rounded-lg border-2 text-left ${
                        selectedItem?.id === item.id 
                          ? 'border-[var(--color-yellow)]' 
                          : 'border-transparent hover:border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{item.name}</p>
                          <p className={`text-xs ${RARITY_COLORS[item.rarity]}`}>x{item.quantity}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                {inventory.length === 0 && (
                  <p className="text-center text-[var(--color-text-muted)] py-8">
                    Your inventory is empty
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
