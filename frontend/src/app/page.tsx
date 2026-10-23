'use client';

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, Database } from 'lucide-react';
import { env } from '@/config/env';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/health`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data: HealthStatus = await res.json();
      setHealth(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach API server';
      setError(message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Slack-inspired Left Navigation Rail */}
      <aside className="w-64 bg-[#1A1D21] text-slate-300 flex flex-col justify-between p-4 border-r border-[#2d3136]">
        <div>
          <div className="flex items-center gap-2 px-2 py-3 mb-4 border-b border-[#2d3136]">
            <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center font-bold text-white text-base shadow">
              IB
            </div>
            <div>
              <h1 className="font-semibold text-white text-sm tracking-tight">Insight Blend</h1>
              <p className="text-xs text-slate-400">Social Media Agency CRM</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-2 mb-1">
              Workspace Overview
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#1164A3] text-white text-sm font-medium">
              <Layers className="w-4 h-4" />
              <span>Foundation Setup</span>
            </div>
          </div>
        </div>

        <div className="px-2 py-3 border-t border-[#2d3136] text-xs text-slate-400 flex items-center justify-between">
          <span>Milestone 0 & 1</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
            INF-01
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-800">Monorepo System Diagnostics</h2>
            <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              DOC-01, DOC-02 & INF-01
            </span>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-300 px-3 py-1.5 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Check Connectivity</span>
          </button>
        </header>

        {/* Page Content */}
        <div className="p-8 max-w-5xl space-y-6">
          {/* Welcome Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
              Insight Blend CRM Monorepo Initialized
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Decoupled Next.js frontend, Express backend, TypeScript, strict environment validation,
              and health check endpoints are now configured.
            </p>
          </div>

          {/* Backend Status Card (Testing UI states: loading, success, error) */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-semibold text-slate-800">API Health Probe (`/api/health`)</h4>
              </div>
              <span className="text-xs text-slate-500 font-mono">{env.NEXT_PUBLIC_API_URL}</span>
            </div>

            <div className="p-6">
              {loading && (
                <div className="flex items-center gap-3 text-slate-600 text-sm py-4">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#1164A3]" />
                  <span>Contacting backend API at {env.NEXT_PUBLIC_API_URL}/api/health...</span>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-900">Backend API probe uncontacted</p>
                      <p className="text-xs text-amber-700 font-mono">{error}</p>
                      <p className="text-xs text-amber-600 mt-2">
                        Start the backend with <code className="bg-amber-100 px-1 py-0.5 rounded">npm run dev:backend</code> to verify live HTTP communication.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!loading && health && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-md text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Backend service is healthy and responding with 200 OK</span>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                      <dt className="text-xs text-slate-500 font-medium">Environment</dt>
                      <dd className="text-sm font-semibold text-slate-800 mt-1 uppercase font-mono">
                        {health.environment}
                      </dd>
                    </div>
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                      <dt className="text-xs text-slate-500 font-medium">Process Uptime</dt>
                      <dd className="text-sm font-semibold text-slate-800 mt-1 font-mono">
                        {health.uptime}s
                      </dd>
                    </div>
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                      <dt className="text-xs text-slate-500 font-medium">Server Timestamp</dt>
                      <dd className="text-xs font-semibold text-slate-800 mt-1 font-mono truncate">
                        {health.timestamp}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>

          {/* Architecture Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#4A154B]" />
                <span>Backend Domain & RBAC Invariant</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All business rules, authorizations (Manager, Strategist, Writer), and revision loops are strictly isolated to Express backend API routes.
              </p>
            </div>

            <div className="p-5 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Database className="w-4 h-4 text-[#1164A3]" />
                <span>Upcoming Milestones</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                DB-01 (PostgreSQL schema on Neon) and AUTH-01 (Sessions and server-side RBAC) are next in the implementation roadmap.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
