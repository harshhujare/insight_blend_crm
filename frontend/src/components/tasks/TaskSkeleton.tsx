'use client';

import React from 'react';

export function TaskSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="border-b border-slate-200 bg-slate-50/75 px-4 py-3">
        <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 animate-pulse gap-3">
            {/* Status + Title */}
            <div className="flex items-center gap-3 w-2/5">
              <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/3 rounded bg-slate-100" />
              </div>
            </div>

            {/* Client pill */}
            <div className="h-5 w-24 rounded-md bg-slate-100 hidden sm:block shrink-0" />

            {/* Content item pill */}
            <div className="h-5 w-20 rounded-md bg-slate-100 hidden md:block shrink-0" />

            {/* Priority */}
            <div className="h-5 w-16 rounded-full bg-slate-100 hidden lg:block shrink-0" />

            {/* Assignee */}
            <div className="flex items-center gap-2 w-28 hidden sm:flex shrink-0">
              <div className="h-6 w-6 rounded-full bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-100" />
            </div>

            {/* Due date */}
            <div className="h-4 w-24 rounded bg-slate-100 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
