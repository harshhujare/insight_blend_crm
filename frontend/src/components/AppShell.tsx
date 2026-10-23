'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Client } from '@/types/client';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Hash,
} from 'lucide-react';
import { Role } from '@/types/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Clients Directory', href: '/clients', icon: Briefcase },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Scripts', href: '/scripts', icon: FileText },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    allowedRoles: ['MANAGER'], // Strictly MANAGER only!
  },
];

function getRoleBadge(role?: Role) {
  switch (role) {
    case 'MANAGER':
      return {
        label: 'Manager',
        classes: 'bg-[#4A154B]/50 text-purple-200 border border-purple-500/40',
      };
    case 'STRATEGIST':
      return {
        label: 'Strategist',
        classes: 'bg-[#1164A3]/50 text-sky-200 border border-sky-400/40',
      };
    case 'WRITER':
      return {
        label: 'Writer',
        classes: 'bg-emerald-950/60 text-emerald-200 border border-emerald-500/40',
      };
    default:
      return {
        label: 'User',
        classes: 'bg-slate-800 text-slate-300 border border-slate-700',
      };
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Active Client Channels in Sidebar
  const [clientChannels, setClientChannels] = useState<Client[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadClientChannels() {
      try {
        const data = await api.get<Client[]>('/clients', {
          params: { status: 'ACTIVE' },
        });
        if (isMounted) {
          setClientChannels(Array.isArray(data) ? data : []);
        }
      } catch {
        // Silently tolerate if unauthenticated or network drop
      } finally {
        if (isMounted) {
          setChannelsLoading(false);
        }
      }
    }

    loadClientChannels();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const roleBadge = getRoleBadge(user?.role);
  const userInitials =
    user?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'IB';

  // Filter navigation links based on user role
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    return user?.role && item.allowedRoles.includes(user.role);
  });

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#19171D] text-slate-300">
      {/* Top Workspace Header */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#2d3136] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4A154B] text-base font-bold text-white shadow-md">
              IB
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">Insight Blend</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" title="Connected" />
              </div>
              <p className="text-[11px] text-slate-400">Social Media CRM</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded p-1 text-slate-400 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active User Card */}
        {user && (
          <div className="mx-3 mt-3 rounded-lg border border-[#2d3136] bg-[#222529] p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#4A154B] text-xs font-bold text-white shadow-sm">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                <p className="truncate text-[10px] text-slate-400">{user.email}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ${roleBadge.classes}`}>
                {roleBadge.label}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            </div>
          </div>
        )}

        {/* Workspace Navigation Items */}
        <div className="mt-5 px-3">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </div>
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || (item.href === '/clients' && pathname === '/clients');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1164A3] text-white shadow-sm'
                      : 'text-slate-300 hover:bg-[#27242C] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.allowedRoles && (
                    <span className="rounded bg-purple-950 px-1.5 py-0.2 text-[9px] font-semibold text-purple-300 border border-purple-800">
                      ADMIN
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Slack-Inspired Collapsible Client Channels Section */}
        <div className="mt-6 px-3">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <button
              type="button"
              onClick={() => setChannelsCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
              aria-expanded={!channelsCollapsed}
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${channelsCollapsed ? '-rotate-90' : ''}`}
              />
              <span>Clients Channels</span>
              {clientChannels.length > 0 && (
                <span className="rounded-full bg-[#2d3136] px-1.5 py-0.2 text-[9px] font-semibold text-slate-300">
                  {clientChannels.length}
                </span>
              )}
            </button>
          </div>

          {!channelsCollapsed && (
            <div className="space-y-0.5 mt-1">
              {channelsLoading ? (
                <div className="space-y-2 px-2 py-1.5">
                  <div className="h-4 w-3/4 rounded bg-slate-800/80 animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-slate-800/80 animate-pulse" />
                  <div className="h-4 w-4/5 rounded bg-slate-800/80 animate-pulse" />
                </div>
              ) : clientChannels.length === 0 ? (
                <p className="px-2 py-1.5 text-[11px] text-slate-500 italic">No active clients</p>
              ) : (
                clientChannels.map((client) => {
                  const isChannelActive = pathname === `/clients/${client.id}`;
                  const slug = client.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                  return (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isChannelActive
                          ? 'bg-[#1164A3] text-white shadow-xs'
                          : 'text-slate-300 hover:bg-[#27242C] hover:text-white'
                      }`}
                      title={client.name}
                    >
                      <Hash
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isChannelActive
                            ? 'text-white'
                            : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span className="truncate">{slug}</span>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="border-t border-[#2d3136] p-3">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[#2d3136] md:block">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-64 flex-col bg-[#19171D] shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Workspace /</span>
              <h2 className="text-sm font-semibold capitalize text-slate-800">
                {pathname === '/' ? 'Dashboard' : pathname.replace('/', '')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-xs">
                <span className="hidden text-slate-600 sm:inline">{user.name}</span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${roleBadge.classes}`}>
                  {roleBadge.label}
                </span>
              </div>
            )}
            <div className="hidden items-center gap-1.5 text-[11px] text-slate-500 lg:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>RBAC Protected</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 md:p-8 bg-[#F8F8F8]">{children}</main>
      </div>
    </div>
  );
}

