'use client';

import React, { useState, useEffect } from 'react';
import { X, Briefcase, Loader2, AlertCircle } from 'lucide-react';
import { Client, ClientFormData, ClientStatus } from '@/types/client';

interface ClientModalProps {
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

export function ClientModal({
  isOpen,
  client,
  isLoading,
  serverError,
  onSubmit,
  onClose,
}: ClientModalProps) {
  const isEdit = !!client;

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    category: '',
    onboardingDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ClientFormData, boolean>>>({});

  // Populate form on edit/open
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
  }, [client, isOpen]);

  if (!isOpen) return null;

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
        if (!value.trim()) return 'Client notes are required';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A154B] text-white">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEdit ? 'Edit Client Account' : 'Create New Client'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEdit
                  ? 'Update business details and notes'
                  : 'Onboard a new client into the CRM and content production pipeline'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Client Name */}
          <div>
            <label htmlFor="client-name" className="block text-xs font-semibold text-slate-700">
              Client Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="client-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="e.g. Acme Wellness Co."
              className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 ${
                errors.name
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-[#1164A3] focus:ring-[#1164A3]/20'
              }`}
            />
            {errors.name && <p className="mt-1 text-[11px] text-rose-600">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="client-category" className="block text-xs font-semibold text-slate-700">
              Business Category <span className="text-rose-500">*</span>
            </label>
            <input
              id="client-category"
              type="text"
              list="categories-list"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              placeholder="e.g. Health & Wellness, B2B SaaS"
              className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 ${
                errors.category
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-[#1164A3] focus:ring-[#1164A3]/20'
              }`}
            />
            <datalist id="categories-list">
              {COMMON_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            {errors.category && <p className="mt-1 text-[11px] text-rose-600">{errors.category}</p>}
          </div>

          {/* Onboarding Date & Status Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="onboarding-date" className="block text-xs font-semibold text-slate-700">
                Onboarding Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="onboarding-date"
                type="date"
                value={formData.onboardingDate}
                onChange={(e) => handleChange('onboardingDate', e.target.value)}
                onBlur={() => handleBlur('onboardingDate')}
                className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 ${
                  errors.onboardingDate
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-[#1164A3] focus:ring-[#1164A3]/20'
                }`}
              />
              {errors.onboardingDate && (
                <p className="mt-1 text-[11px] text-rose-600">{errors.onboardingDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Status</label>
              <div className="mt-1.5 flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => handleChange('status', 'ACTIVE' as ClientStatus)}
                  className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all ${
                    formData.status === 'ACTIVE'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('status', 'INACTIVE' as ClientStatus)}
                  className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all ${
                    formData.status === 'INACTIVE'
                      ? 'bg-white text-slate-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="client-notes" className="block text-xs font-semibold text-slate-700">
              Client Notes & Overview <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="client-notes"
              rows={4}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              onBlur={() => handleBlur('notes')}
              placeholder="Primary social objectives, target audience, brand guidelines, or operational notes..."
              className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 ${
                errors.notes
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-[#1164A3] focus:ring-[#1164A3]/20'
              }`}
            />
            {errors.notes && <p className="mt-1 text-[11px] text-rose-600">{errors.notes}</p>}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-[#1164A3] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0d4f82] transition-colors disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{isEdit ? 'Saving...' : 'Creating...'}</span>
              </>
            ) : (
              <span>{isEdit ? 'Save Changes' : 'Create Client'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
