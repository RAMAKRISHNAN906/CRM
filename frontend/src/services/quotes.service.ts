import api from './api';

export type QuoteType = 'SQ' | 'SO' | 'SI' | 'SCR';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface QuoteLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  type: QuoteType;
  status: QuoteStatus;
  currency: string;
  country: string;
  financialYear?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  validUntil?: string;
  notes?: string;
  termsContent?: string;
  contactId?: string;
  contact?: { firstName: string; lastName: string };
  dealId?: string;
  deal?: { title: string };
  paymentTermId?: string;
  paymentTerm?: { name: string; content: string };
  lineItems: QuoteLineItem[];
  createdAt: string;
}

export interface PaymentTerm {
  id: string;
  name: string;
  description?: string;
  content: string;
  isDefault: boolean;
}

export const quotesService = {
  getAll: async (filters: Record<string, any> = {}): Promise<{ data: Quote[]; meta: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get(`/quotes?${params}`);
    return res.data;
  },

  getOne: async (id: string): Promise<Quote> => {
    const res = await api.get(`/quotes/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Quote>): Promise<Quote> => {
    const res = await api.post('/quotes', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Quote>): Promise<Quote> => {
    const res = await api.put(`/quotes/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/quotes/${id}`);
  },

  convert: async (id: string): Promise<Quote> => {
    const res = await api.post(`/quotes/${id}/convert`);
    return res.data.data;
  },

  getPaymentTerms: async (): Promise<PaymentTerm[]> => {
    const res = await api.get('/quotes/payment-terms');
    return res.data.data;
  },

  createPaymentTerm: async (data: Partial<PaymentTerm>): Promise<PaymentTerm> => {
    const res = await api.post('/quotes/payment-terms', data);
    return res.data.data;
  },

  updatePaymentTerm: async (id: string, data: Partial<PaymentTerm>): Promise<PaymentTerm> => {
    const res = await api.put(`/quotes/payment-terms/${id}`, data);
    return res.data.data;
  },

  deletePaymentTerm: async (id: string): Promise<void> => {
    await api.delete(`/quotes/payment-terms/${id}`);
  },

  downloadPdf: async (id: string, filename: string): Promise<void> => {
    const res = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
