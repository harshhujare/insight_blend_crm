'use client';

import React from 'react';

export function ClientSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="border-b border-slate-200 bg-slate-50/75 px-4 py-3">
        <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5 animate-pulse">
            <div className="flex items-center gap-3 w-1/3">
              <div className="h-7 w-7 rounded-md bg-slate-200" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-5 w-24 rounded-full bg-slate-100 hidden sm:block" />
            <div className="h-3.5 w-28 rounded bg-slate-100 hidden md:block" />
            <div className="h-5 w-20 rounded-full bg-slate-100" />
            <div className="flex items-center gap-2 hidden lg:flex">
              <div className="h-4 w-12 rounded bg-slate-100" />
              <div className="h-4 w-12 rounded bg-slate-100" />
              <div className="h-4 w-12 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-14 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

