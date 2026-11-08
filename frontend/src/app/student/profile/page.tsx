'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { User, Phone, Mail, Shield, Save, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentProfilePage() {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name cannot be blank.');
      return;
    }

    try {
      setSaving(true);
      await authApi.updateMe({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      await refreshUser();
      toast.success('Profile details saved successfully!');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-12">
      {/* Title */}
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-2xl font-black text-white tracking-tight">My Profile Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal details and campus contact information
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card variant="highlighted" padding="md" className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/30">
          {user?.full_name?.charAt(0).toUpperCase() || 'S'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white truncate">
              {user?.full_name || 'Campus Student'}
            </h3>
            <Badge variant="success" size="sm">
              Active Student
            </Badge>
          </div>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Member since {formatDate(user?.created_at)}
          </p>
        </div>
      </Card>

      {/* Edit Form */}
      <Card variant="flat" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-bold text-white">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Personal Information</span>
          </div>

          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aarav Sharma"
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="College Email Address"
            type="email"
            value={user?.email || ''}
            disabled
            helperText="College email cannot be changed as it is linked to your campus enrollment."
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            helperText="Used for kitchen order SMS/pickup notifications."
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="accent"
              size="md"
              isLoading={saving}
              leftIcon={<Save className="w-4 h-4 text-slate-950" />}
              className="text-slate-950 font-bold text-xs"
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Account Security Info Card */}
      <Card variant="flat" padding="md" className="space-y-2 border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Security & Authentication</span>
        </div>
        <p className="text-xs text-slate-400">
          Your account is secured with JSON Web Token authentication and bcrypt hashing.
          If you need to reset your password or update credentials, please contact the campus canteen administrator.
        </p>
      </Card>
    </div>
  );
}
