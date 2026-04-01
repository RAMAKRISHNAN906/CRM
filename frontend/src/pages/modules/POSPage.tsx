import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const POSPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#ec489922' }}>
          <ShoppingBag size={24} style={{ color: '#ec4899' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Point of Sale</h1>
          <p className="text-gray-400 text-sm">Retail point-of-sale management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ label: 'Total Records', value: '0' }, { label: 'Active', value: '0' }, { label: 'This Month', value: '0' }].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface-elevated p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#ec489922' }}>
          <ShoppingBag size={32} style={{ color: '#ec4899' }} />
        </div>
        <h2 className="text-lg font-semibold text-white">Point of Sale Module</h2>
        <p className="text-gray-400 text-sm text-center max-w-sm">Retail point-of-sale management. Start by adding your first record.</p>
        <button
          className="mt-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#ec4899' }}
        >
          + New Point
        </button>
      </div>
    </div>
  );
};
