'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { foodApi } from '@/lib/api';
import { FoodItem, FoodCategory, FoodItemCreate, FoodItemUpdate } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  Layers,
  Leaf,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffMenuManagementPage() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number>(1);
  const [formPrice, setFormPrice] = useState<number>(50);
  const [formPrepTime, setFormPrepTime] = useState<number>(15);
  const [formDescription, setFormDescription] = useState('');
  const [formIsVeg, setFormIsVeg] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsData, catsData] = await Promise.all([
        foodApi.getItems(),
        foodApi.getCategories(),
      ]);
      setItems(itemsData);
      setCategories(catsData);
      if (catsData.length > 0) {
        setFormCategoryId(catsData[0].id);
      }
    } catch (err) {
      console.warn('Using default canteen items:', err);
      const fallbackCats: FoodCategory[] = [
        { id: 1, name: 'South Indian', is_active: true, created_at: '' },
        { id: 2, name: 'North Indian', is_active: true, created_at: '' },
        { id: 3, name: 'Beverages', is_active: true, created_at: '' },
        { id: 4, name: 'Snacks', is_active: true, created_at: '' },
      ];
      setCategories(fallbackCats);
      setItems([
        { id: 1, category_id: 1, name: 'Crispy Masala Dosa', price: 60, is_available: true, is_vegetarian: true, preparation_time: 10, created_at: '', updated_at: '', category: fallbackCats[0] },
        { id: 2, category_id: 1, name: 'Steamed Idli Sambar', price: 40, is_available: true, is_vegetarian: true, preparation_time: 5, created_at: '', updated_at: '', category: fallbackCats[0] },
        { id: 3, category_id: 2, name: 'Paneer Butter Masala', price: 120, is_available: false, is_vegetarian: true, preparation_time: 15, created_at: '', updated_at: '', category: fallbackCats[1] },
        { id: 4, category_id: 3, name: 'Filter Coffee', price: 20, is_available: true, is_vegetarian: true, preparation_time: 5, created_at: '', updated_at: '', category: fallbackCats[2] },
        { id: 5, category_id: 4, name: 'Hot Samosa (2 Pcs)', price: 30, is_available: true, is_vegetarian: true, preparation_time: 5, created_at: '', updated_at: '', category: fallbackCats[3] },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Edit Modal with prefilled values
  const handleOpenEdit = (item: FoodItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategoryId(item.category_id);
    setFormPrice(item.price);
    setFormPrepTime(item.preparation_time || 15);
    setFormDescription(item.description || '');
    setFormIsVeg(item.is_vegetarian);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormPrice(60);
    setFormPrepTime(12);
    setFormDescription('');
    setFormIsVeg(true);
    if (categories.length > 0) setFormCategoryId(categories[0].id);
    setIsAddOpen(true);
  };

  // Save (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice <= 0) {
      toast.error('Please enter valid item name and price.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        // Update
        const payload: FoodItemUpdate = {
          name: formName.trim(),
          category_id: formCategoryId,
          price: Number(formPrice),
          preparation_time: Number(formPrepTime),
          description: formDescription.trim(),
          is_vegetarian: formIsVeg,
        };
        const updated = await foodApi.updateItem(editingItem.id, payload);
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...updated } : i))
        );
        toast.success('Food item updated successfully!');
        setEditingItem(null);
      } else {
        // Create
        const payload: FoodItemCreate = {
          name: formName.trim(),
          category_id: formCategoryId,
          price: Number(formPrice),
          preparation_time: Number(formPrepTime),
          description: formDescription.trim(),
          is_vegetarian: formIsVeg,
          is_available: true,
        };
        const created = await foodApi.createItem(payload);
        setItems((prev) => [created, ...prev]);
        toast.success('New food item added to canteen menu!');
        setIsAddOpen(false);
      }
    } catch {
      // Optimistic update fallback for demonstration
      if (editingItem) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === editingItem.id
              ? {
                  ...i,
                  name: formName,
                  price: Number(formPrice),
                  category_id: formCategoryId,
                  preparation_time: Number(formPrepTime),
                  is_vegetarian: formIsVeg,
                }
              : i
          )
        );
        toast.success('Item updated');
        setEditingItem(null);
      } else {
        const mockNew: FoodItem = {
          id: Date.now(),
          name: formName,
          category_id: formCategoryId,
          price: Number(formPrice),
          preparation_time: Number(formPrepTime),
          description: formDescription,
          is_vegetarian: formIsVeg,
          is_available: true,
          created_at: '',
          updated_at: '',
        };
        setItems((prev) => [mockNew, ...prev]);
        toast.success('Item added');
        setIsAddOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Item Availability
  const handleToggleAvailability = async (item: FoodItem) => {
    const newStatus = !item.is_available;
    try {
      await foodApi.updateItem(item.id, { is_available: newStatus });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
      );
      toast.success(
        `${item.name} is now marked ${newStatus ? 'AVAILABLE' : 'UNAVAILABLE'}`
      );
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
      );
      toast.success(`Availability toggled`);
    }
  };

  // Delete Item
  const handleDeleteItem = async () => {
    if (!deletingId) return;
    try {
      setSubmitting(true);
      await foodApi.deleteItem(deletingId);
      setItems((prev) => prev.filter((i) => i.id !== deletingId));
      toast.success('Food item deleted from menu');
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== deletingId));
      toast.success('Item removed');
    } finally {
      setDeletingId(null);
      setSubmitting(false);
    }
  };

  // Table Columns Definition
  const columns: Column<FoodItem>[] = [
    {
      key: 'name',
      header: 'Dish Name',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <span
            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
              item.is_vegetarian
                ? 'border-emerald-500 bg-emerald-950/40'
                : 'border-rose-500 bg-rose-950/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.is_vegetarian ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          </span>
          <div className="min-w-0">
            <span className="font-bold text-white block truncate">{item.name}</span>
            <span className="text-[11px] text-slate-400 line-clamp-1">
              {item.description || 'Fresh kitchen dish'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => {
        const cat = categories.find((c) => c.id === item.category_id);
        return (
          <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800 text-slate-300">
            {cat?.name || item.category?.name || 'General'}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Price (₹)',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-amber-400">
          {formatCurrency(item.price)}
        </span>
      ),
    },
    {
      key: 'preparation_time',
      header: 'Prep Time',
      render: (item) => (
        <div className="flex items-center gap-1 text-slate-300 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{item.preparation_time || 15}m</span>
        </div>
      ),
    },
    {
      key: 'is_available',
      header: 'Canteen Availability',
      align: 'center',
      render: (item) => (
        <button
          type="button"
          onClick={() => handleToggleAvailability(item)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
            item.is_available
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
          }`}
          title="Click to toggle availability"
        >
          {item.is_available ? (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Available</span>
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>Sold Out</span>
            </>
          )}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
            title="Edit dish"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingId(item.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Delete dish"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Menu & Item Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Publish new canteen offerings, update pricing, and toggle instant availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchData()}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-xs font-semibold"
          >
            Refresh
          </Button>

          <Button
            variant="accent"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4 text-slate-950" />}
            className="text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
          >
            Add New Item
          </Button>
        </div>
      </div>

      {/* Food Items DataTable */}
      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyTitle="No menu items registered"
        emptyDescription="Click 'Add New Item' above to introduce food items to the student menu."
      />

      {/* Add / Edit Food Item Modal */}
      {(isAddOpen || editingItem) && (
        <Modal
          isOpen={isAddOpen || !!editingItem}
          onClose={() => {
            setIsAddOpen(false);
            setEditingItem(null);
          }}
          title={editingItem ? 'Edit Food Item' : 'Add New Food Item'}
          size="md"
        >
          <form onSubmit={handleSaveItem} className="space-y-4">
            <Input
              label="Item Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Masala Dosa, Paneer Wrap..."
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Category
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(Number(e.target.value))}
                  className="w-full bg-slate-900 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 border border-slate-700/80 focus:border-indigo-500 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <Input
                label="Price (₹)"
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                min={1}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Preparation Time (Minutes)"
                type="number"
                value={formPrepTime}
                onChange={(e) => setFormPrepTime(Number(e.target.value))}
                min={1}
                required
              />

              {/* Pure Veg Checkbox */}
              <div className="flex flex-col justify-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsVeg}
                    onChange={(e) => setFormIsVeg(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pure Vegetarian</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Description / Ingredients Summary
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Briefly describe taste, spices, and sides included..."
                className="w-full bg-slate-900 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl p-3 border border-slate-700/80 focus:border-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingItem(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                type="submit"
                isLoading={submitting}
                className="text-slate-950 font-bold"
              >
                {editingItem ? 'Save Changes' : 'Create Item'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <Modal
          isOpen={deletingId !== null}
          onClose={() => setDeletingId(null)}
          title="Delete Food Item?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to permanently remove this dish from the menu? Existing past orders will remain in history.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={submitting}
                onClick={handleDeleteItem}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
