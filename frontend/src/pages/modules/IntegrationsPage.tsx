import React from 'react';
import { Plug } from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#8b5cf622' }}>
          <Plug size={24} style={{ color: '#8b5cf6' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-gray-400 text-sm">Third-party integrations</p>
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
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#8b5cf622' }}>
          <Plug size={32} style={{ color: '#8b5cf6' }} />
        </div>
        <h2 className="text-lg font-semibold text-white">Integrations Module</h2>
        <p className="text-gray-400 text-sm text-center max-w-sm">Third-party integrations. Start by adding your first record.</p>
        <button
          className="mt-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#8b5cf6' }}
        >
          + New Integrations
        </button>
      </div>
    </div>
  );
};
