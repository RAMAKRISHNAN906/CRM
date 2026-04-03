import api from './api';

async function downloadBlob(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const exportService = {
  exportLeads: (format: 'csv' | 'json' = 'csv') =>
    downloadBlob(`/export/leads?format=${format}`, `leads.${format}`),

  exportDeals: (format: 'csv' | 'json' = 'csv') =>
    downloadBlob(`/export/deals?format=${format}`, `deals.${format}`),

  exportCountryReport: (format: 'csv' | 'json' = 'csv') =>
    downloadBlob(`/export/reports/country?format=${format}`, `country-report.${format}`),
};
