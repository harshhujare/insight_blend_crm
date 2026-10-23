'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Hash, Loader2, AlertCircle, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Client, ClientFormData, ClientStatus } from '@/types/client';

interface ClientDrawerProps {
  isOpen: boolean;
  client?: Client | null; // If passed, edit mode; else create mode
  isLoading: boolean;
  serverError?: string | null;
  onSubmit: (data: ClientFormData) => Promise<void>;
  onClose: () => void;
}

const COMMON_CATEGORIES = [
  'Health & Wellness',
  'B2B SaaS',
  'E-commerce & Retail',
  'Hospitality & Travel',
  'Real Estate',
  'Finance & FinTech',
  'Education & Coaching',
  'Fashion & Beauty',
];

export function ClientDrawer({
  isOpen,
  client,
  isLoading,
  serverError,
  onSubmit,
  onClose,
}: ClientDrawerProps) {
  const isEdit = !!client;
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    category: '',
    onboardingDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ClientFormData, boolean>>>({});

  // Reset or populate formData when drawer opens or client changes
  useEffect(() => {
    if (client) {
      const dateStr = client.onboardingDate
        ? new Date(client.onboardingDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      setFormData({
        name: client.name || '',
        category: client.category || '',
        onboardingDate: dateStr,
        status: client.status || 'ACTIVE',
        notes: client.notes || '',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        onboardingDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        notes: '',
      });
    }
    setErrors({});
    setTouched({});

    if (isOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [client, isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  const validateField = (field: keyof ClientFormData, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Client name is required';
        if (value.trim().length > 100) return 'Name cannot exceed 100 characters';
        return undefined;
      case 'category':
        if (!value.trim()) return 'Category is required';
        if (value.trim().length > 100) return 'Category cannot exceed 100 characters';
        return undefined;
      case 'onboardingDate':
        if (!value) return 'Onboarding date is required';
        if (isNaN(new Date(value).getTime())) return 'Please select a valid date';
        return undefined;
      case 'notes':
        if (!value.trim()) return 'Client overview & notes are required';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: keyof ClientFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<Record<keyof ClientFormData, string>> = {
      name: validateField('name', formData.name),
      category: validateField('category', formData.category),
      onboardingDate: validateField('onboardingDate', formData.onboardingDate),
      notes: validateField('notes', formData.notes),
    };

    setTouched({
      name: true,
      category: true,
      onboardingDate: true,
      notes: true,
    });

    const hasErrors = Object.values(newErrors).some((err) => !!err);
    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  const channelSlug = formData.name
    ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'new-client';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Slide-over Right Thread Panel */}
      <aside
        className="fixed inset-y-0 right-0 flex max-w-full pl-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-drawer-title"
      >
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Slack Thread Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E2E2] px-6 bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#19171D] text-white">
                <Hash className="h-4 w-4 text-emerald-400" />
              </span>
              <div className="min-w-0">
                <h2
                  id="client-drawer-title"
                  className="truncate text-sm font-bold text-slate-900"
                >
                  {isEdit ? `Edit #${channelSlug}` : 'Create Client Channel'}
                </h2>
                <p className="text-[11px] text-slate-500 truncate">
                  {isEdit ? 'Update account info & strategy' : 'Onboard client into workflow'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
              aria-label="Close thread panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Server Error Alert Banner (FR-12) */}
          {serverError && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-[#E01E5A]/30 bg-[#FDF2F5] p-3 text-xs text-[#E01E5A]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#E01E5A]" />
              <span className="font-medium">{serverError}</span>
            </div>
          )}

          {/* Drawer Form Body */}
          <form
            id="client-drawer-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-[#F8F8F8]"
          >
            {/* Client Name Input */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <label
                htmlFor="drawer-client-name"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
              >
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Client Name</span>
                <span className="text-[#E01E5A]">*</span>
              </label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                  #
                </span>
                <input
                  ref={nameInputRef}
                  id="drawer-client-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g. Acme Wellness Co."
                  className={`w-full rounded-lg border bg-white py-2 pl-7 pr-3 text-xs text-slate-900 placeholder-slate-400 transition-all focus:outline-hidden focus:ring-2 ${
                    errors.name
                      ? 'border-[#E01E5A] focus:border-[#E01E5A] focus:ring-[#E01E5A]/20'
                      : 'border-slate-200 focus:border-[#1264A3] focus:ring-[#1264A3]/20'
                  }`}
                />
              </div>
              {errors.name ? (
                <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">{errors.name}</p>
              ) : (
                <p className="mt-1.5 text-[10px] text-slate-400">
                  Channel preview: <code className="text-slate-600 font-mono">#{channelSlug}</code>
                </p>
              )}
            </div>

            {/* Business Category Input */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <label
                htmlFor="drawer-client-category"
                className="block text-xs font-semibold text-slate-800"
              >
                Business Category <span className="text-[#E01E5A]">*</span>
              </label>
              <input
                id="drawer-client-category"
                type="text"
                list="drawer-categories-list"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                onBlur={() => handleBlur('category')}
                placeholder="Select or enter category (e.g. Health & Wellness)"
                className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 transition-all focus:outline-hidden focus:ring-2 ${
                  errors.category
                    ? 'border-[#E01E5A] focus:border-[#E01E5A] focus:ring-[#E01E5A]/20'
                    : 'border-slate-200 focus:border-[#1264A3] focus:ring-[#1264A3]/20'
                }`}
              />
              <datalist id="drawer-categories-list">
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              {errors.category && (
                <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">{errors.category}</p>
              )}
            </div>

            {/* Onboarding Date & Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label
                  htmlFor="drawer-onboarding-date"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Onboarding Date</span>
                  <span className="text-[#E01E5A]">*</span>
                </label>
                <input
                  id="drawer-onboarding-date"
                  type="date"
                  value={formData.onboardingDate}
                  onChange={(e) => handleChange('onboardingDate', e.target.value)}
                  onBlur={() => handleBlur('onboardingDate')}
                  className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 transition-all focus:outline-hidden focus:ring-2 ${
                    errors.onboardingDate
                      ? 'border-[#E01E5A] focus:border-[#E01E5A] focus:ring-[#E01E5A]/20'
                      : 'border-slate-200 focus:border-[#1264A3] focus:ring-[#1264A3]/20'
                  }`}
                />
                {errors.onboardingDate && (
                  <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">
                    {errors.onboardingDate}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="block text-xs font-semibold text-slate-800">Account Status</span>
                <div className="mt-2 flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleChange('status', 'ACTIVE' as ClientStatus)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                      formData.status === 'ACTIVE'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className={`h-3 w-3 ${formData.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('status', 'INACTIVE' as ClientStatus)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                      formData.status === 'INACTIVE'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Archived</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notes & Overview */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <label
                htmlFor="drawer-client-notes"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Strategy Notes & Objectives</span>
                <span className="text-[#E01E5A]">*</span>
              </label>
              <textarea
                id="drawer-client-notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                onBlur={() => handleBlur('notes')}
                placeholder="Target demographic, tone of voice, content pillars, reel cadence, and client preferences..."
                className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 placeholder-slate-400 transition-all focus:outline-hidden focus:ring-2 ${
                  errors.notes
                    ? 'border-[#E01E5A] focus:border-[#E01E5A] focus:ring-[#E01E5A]/20'
                    : 'border-slate-200 focus:border-[#1264A3] focus:ring-[#1264A3]/20'
                }`}
              />
              {errors.notes && (
                <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">{errors.notes}</p>
              )}
            </div>
          </form>

          {/* Sticky Slack Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[#E2E2E2] px-6 py-3.5 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="client-drawer-form"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-[#007A5A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#148567] active:bg-[#005A42] transition-colors disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isEdit ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Create Channel'}</span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
