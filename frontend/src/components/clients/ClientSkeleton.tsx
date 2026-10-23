'use client';

import React from 'react';

export function ClientSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-5 w-16 rounded-full bg-slate-200" />
            </div>

            <div className="mt-4 space-y-2">
              <div className="h-3 w-40 rounded bg-slate-100" />
              <div className="h-3 w-3/4 rounded bg-slate-100" />
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-3 w-12 rounded bg-slate-200" />
                <div className="h-3 w-12 rounded bg-slate-200" />
                <div className="h-3 w-12 rounded bg-slate-200" />
              </div>
              <div className="h-4 w-4 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
