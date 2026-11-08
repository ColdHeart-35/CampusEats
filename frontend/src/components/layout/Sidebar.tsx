'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Utensils,
  ShoppingCart,
  ClipboardList,
  User,
  ChefHat,
  Layers,
  Boxes,
  QrCode,
  LayoutDashboard,
  Users,
  BarChart3,
  Database,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { role, user } = useAuth();

  const studentNavItems: NavItem[] = [
    { label: 'Food Menu', href: '/student/menu', icon: Utensils },
    { label: 'My Cart', href: '/student/cart', icon: ShoppingCart },
    { label: 'My Orders', href: '/student/orders', icon: ClipboardList },
    { label: 'My Profile', href: '/student/profile', icon: User },
  ];

  const staffNavItems: NavItem[] = [
    { label: 'Live Orders', href: '/staff/orders', icon: ChefHat },
    { label: 'Menu Management', href: '/staff/menu', icon: Layers },
    { label: 'Inventory Stock', href: '/staff/inventory', icon: Boxes },
    { label: 'QR Scanner', href: '/staff/scanner', icon: QrCode },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Executive Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'Sales & Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Inventory Control', href: '/admin/inventory', icon: Boxes },
    { label: 'Graph & Database', href: '/admin/graph', icon: Database },
  ];

  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return adminNavItems;
      case 'staff':
        return staffNavItems;
      case 'student':
      default:
        return studentNavItems;
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-16 bottom-0 left-0 z-40 w-64 bg-[#1E1B4B] border-r border-[#312E81] text-slate-100 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Navigation list */}
        <div className="flex-1 py-6 px-4 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between px-2 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className="px-3 mb-2 text-[11px] font-bold tracking-wider uppercase text-indigo-300/70">
              {role ? `${role} Portal` : 'Portal'}
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950/50 font-semibold'
                        : 'text-indigo-200/80 hover:bg-[#2E2870] hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-transform group-hover:scale-110',
                        isActive ? 'text-amber-400' : 'text-indigo-300'
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer / Current session info */}
        <div className="p-4 border-t border-[#312E81] bg-[#17143D]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-white truncate">
                {user?.full_name || 'Campus Student'}
              </span>
              <span className="text-[11px] text-indigo-300/80 truncate">
                {user?.email || 'Logged in'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
