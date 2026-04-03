import api from './api';

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  pipelineType: string;
  color: string;
  isActive: boolean;
  description?: string;
  defaultProbability: number;
  isWon: boolean;
  isLost: boolean;
  expectedDays?: number;
  _count?: { deals: number };
}

export interface DealCard {
  id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  expectedClose?: string;
  stageId?: string;
  stageEnteredAt?: string;
  stageAgeDays?: number | null;
  isOverdue?: boolean;
  contact?: { id: string; firstName: string; lastName: string; company?: string } | null;
  owner?: { id: string; name: string; avatar?: string } | null;
  assignee?: { id: string; name: string; avatar?: string } | null;
  tags?: string[];
}

export interface BoardColumn {
  stage: PipelineStage;
  deals: DealCard[];
  count: number;
  totalValue: number;
}

export interface FunnelRow {
  stage: PipelineStage;
  count: number;
  totalValue: number;
  avgDurationHours: number | null;
  conversionRate: number | null;
}

export interface PipelineAnalytics {
  totalDeals: number;
  totalValue: number;
  wonValue: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  avgCycleDays: number | null;
  stageStats: {
    stageId: string;
    stageName: string;
    stageColor: string;
    avgDurationHours: number;
    transitionCount: number;
    isWon: boolean;
    isLost: boolean;
    expectedDays?: number;
  }[];
}

export interface StageTransition {
  id: string;
  enteredAt: string;
  exitedAt?: string;
  durationHours?: number;
  fromStage?: PipelineStage | null;
  toStage: PipelineStage;
  changedBy?: { id: string; name: string; avatar?: string } | null;
}

export interface DemoDetail {
  id: string;
  dealId: string;
  demoDate?: string;
  meetingLink?: string;
  demoStatus: 'Scheduled' | 'Completed' | 'Cancelled';
  demoSummary?: string;
  nextAction?: string;
}

export const pipelineService = {
  // Stages
  getStages: async (): Promise<PipelineStage[]> => {
    const res = await api.get('/pipeline/stages');
    return res.data.data;
  },
  createStage: async (data: Partial<PipelineStage>): Promise<PipelineStage> => {
    const res = await api.post('/pipeline/stages', data);
    return res.data.data;
  },
  updateStage: async (id: string, data: Partial<PipelineStage>): Promise<PipelineStage> => {
    const res = await api.put(`/pipeline/stages/${id}`, data);
    return res.data.data;
  },
  deleteStage: async (id: string): Promise<void> => {
    await api.delete(`/pipeline/stages/${id}`);
  },
  reorderStages: async (stages: { id: string; order: number }[]): Promise<void> => {
    await api.put('/pipeline/stages/reorder', { stages });
  },

  // Board
  getBoard: async (): Promise<BoardColumn[]> => {
    const res = await api.get('/pipeline/board');
    return res.data.data;
  },

  // Move deal
  moveDeal: async (dealId: string, stageId: string): Promise<void> => {
    await api.post(`/pipeline/deals/${dealId}/move`, { stageId });
  },

  // Timeline
  getDealTimeline: async (dealId: string): Promise<StageTransition[]> => {
    const res = await api.get(`/pipeline/deals/${dealId}/timeline`);
    return res.data.data;
  },

  // Funnel
  getFunnel: async (): Promise<FunnelRow[]> => {
    const res = await api.get('/pipeline/funnel');
    return res.data.data;
  },

  // Analytics
  getAnalytics: async (): Promise<PipelineAnalytics> => {
    const res = await api.get('/pipeline/analytics');
    return res.data.data;
  },

  // Demo details
  getDemoDetail: async (dealId: string): Promise<DemoDetail | null> => {
    const res = await api.get(`/pipeline/demo/${dealId}`);
    return res.data.data;
  },
  upsertDemoDetail: async (dealId: string, data: Partial<DemoDetail>): Promise<DemoDetail> => {
    const res = await api.put(`/pipeline/demo/${dealId}`, data);
    return res.data.data;
  },
};
