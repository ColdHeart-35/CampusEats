'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { foodApi, searchApi } from '@/lib/api';
import { FoodCategory, FoodItem } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import CategoryFilter from '@/components/food/CategoryFilter';
import SearchBar from '@/components/food/SearchBar';
import FoodGrid from '@/components/food/FoodGrid';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus, Check, Leaf, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentMenuPage() {
  const { addItem, cartCount } = useCart();

  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  const [vegetarianOnly, setVegetarianOnly] = useState(false);

  // Add to Cart Modal state
  const [modalItem, setModalItem] = useState<FoodItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await foodApi.getCategories();
        setCategories(data);
      } catch (err) {
        console.warn('Using default canteen categories:', err);
        setCategories([
          { id: 1, name: 'South Indian', is_active: true, created_at: '' },
          { id: 2, name: 'North Indian', is_active: true, created_at: '' },
          { id: 3, name: 'Chinese', is_active: true, created_at: '' },
          { id: 4, name: 'Beverages', is_active: true, created_at: '' },
          { id: 5, name: 'Snacks', is_active: true, created_at: '' },
          { id: 6, name: 'Desserts', is_active: true, created_at: '' },
        ]);
      }
    };
    fetchCategories();
  }, []);

  // Fetch food items based on active filters
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);

      if (semanticEnabled && searchQuery.trim()) {
        const results = await searchApi.semanticSearch({
          query: searchQuery.trim(),
          limit: 16,
        });
        setItems(results);
      } else {
        const params: {
          category_id?: number;
          search?: string;
          is_vegetarian?: boolean;
        } = {};

        if (selectedCategory !== null) params.category_id = selectedCategory;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (vegetarianOnly) params.is_vegetarian = true;

        const data = await foodApi.getItems(params);
        setItems(data);
      }
    } catch (err) {
      console.warn('Fallback sample canteen items:', err);
      // Sample mock data for smooth preview if backend is loading
      const fallbackItems: FoodItem[] = [
        {
          id: 1,
          category_id: 1,
          name: 'Crispy Masala Dosa',
          description: 'Golden fermented crepe filled with spiced potato masala, served with 3 chutneys & sambar.',
          price: 60,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 10,
          created_at: '',
          updated_at: '',
        },
        {
          id: 2,
          category_id: 1,
          name: 'Steamed Idli Sambar (2 Pcs)',
          description: 'Fluffy soft steamed rice cakes served with hot lentil vegetable stew & coconut chutney.',
          price: 40,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 5,
          created_at: '',
          updated_at: '',
        },
        {
          id: 3,
          category_id: 2,
          name: 'Paneer Butter Masala',
          description: 'Soft cottage cheese cubes simmered in a creamy, buttery tomato gravy with butter naan.',
          price: 120,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 15,
          created_at: '',
          updated_at: '',
        },
        {
          id: 4,
          category_id: 2,
          name: 'Chole Bhature (2 Pcs)',
          description: 'Spiced chickpea curry paired with deep-fried leavened bread, pickled onions & lemon.',
          price: 80,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 12,
          created_at: '',
          updated_at: '',
        },
        {
          id: 5,
          category_id: 3,
          name: 'Schezwan Veg Fried Rice',
          description: 'Wok-tossed basmati rice with crunchy carrots, cabbage, capsicum & fiery Schezwan chili paste.',
          price: 90,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 12,
          created_at: '',
          updated_at: '',
        },
        {
          id: 6,
          category_id: 4,
          name: 'South Indian Filter Coffee',
          description: 'Traditional frothed chicory coffee brewed fresh with steamed whole milk in brass davarah.',
          price: 20,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 5,
          created_at: '',
          updated_at: '',
        },
        {
          id: 7,
          category_id: 5,
          name: 'Hot Crispy Samosa (2 Pcs)',
          description: 'Crisp pastry triangles stuffed with spiced potatoes and peas, served with sweet tamarind dip.',
          price: 30,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 5,
          created_at: '',
          updated_at: '',
        },
        {
          id: 8,
          category_id: 6,
          name: 'Gulab Jamun (2 Pcs)',
          description: 'Warm milk-solid dumplings soaked in aromatic rose and cardamom sugar syrup.',
          price: 35,
          is_available: true,
          is_vegetarian: true,
          preparation_time: 5,
          created_at: '',
          updated_at: '',
        },
      ];

      // Filter locally for fallback
      let filtered = fallbackItems;
      if (selectedCategory !== null) {
        filtered = filtered.filter((i) => i.category_id === selectedCategory);
      }
      if (vegetarianOnly) {
        filtered = filtered.filter((i) => i.is_vegetarian);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
        );
      }
      setItems(filtered);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, semanticEnabled, vegetarianOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Open item modal for quantity selection
  const handleOpenAddToCart = (item: FoodItem) => {
    setModalItem(item);
    setModalQuantity(1);
  };

  // Add to cart submit
  const handleConfirmAddToCart = async () => {
    if (!modalItem) return;

    try {
      setIsAdding(true);
      await addItem(modalItem.id, modalQuantity);
      setModalItem(null);
    } catch {
      // Error handled by hook toast
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Canteen Food Menu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose your meals and schedule your pickup break time.
          </p>
        </div>

        {/* Veg Only Filter Toggle */}
        <button
          type="button"
          onClick={() => setVegetarianOnly(!vegetarianOnly)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 select-none ${
            vegetarianOnly
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-950/50'
              : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <Leaf className={`w-4 h-4 ${vegetarianOnly ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>Pure Vegetarian</span>
          <span
            className={`w-2 h-2 rounded-full ${
              vegetarianOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'
            }`}
          />
        </button>
      </div>

      {/* Category Pills Bar */}
      <CategoryFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={(catId) => setSelectedCategory(catId)}
      />

      {/* Search Bar with AI Semantic toggle */}
      <SearchBar
        onSearch={(q) => setSearchQuery(q)}
        onSemanticToggle={(enabled) => setSemanticEnabled(enabled)}
        semanticEnabled={semanticEnabled}
      />

      {/* Food Grid */}
      <FoodGrid
        items={items}
        loading={loading}
        onAddToCart={(item) => handleOpenAddToCart(item)}
      />

      {/* Add To Cart Quantity Modal */}
      {modalItem && (
        <Modal
          isOpen={!!modalItem}
          onClose={() => setModalItem(null)}
          title="Add to Your Tray"
          size="sm"
        >
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-bold text-base text-white">{modalItem.name}</h4>
                <span className="text-base font-extrabold text-amber-400">
                  {formatCurrency(modalItem.price)}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {modalItem.description || 'Prepared fresh in the canteen kitchen.'}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-base text-white">
                  {modalQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-slate-400">Subtotal Amount:</span>
              <span className="text-xl font-black text-amber-400">
                {formatCurrency(modalItem.price * modalQuantity)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setModalItem(null)}
                className="w-1/2 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="md"
                isLoading={isAdding}
                onClick={handleConfirmAddToCart}
                leftIcon={<ShoppingCart className="w-4 h-4" />}
                className="w-1/2 text-slate-950 font-bold text-xs"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
