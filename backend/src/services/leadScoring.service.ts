/**
 * Lead Scoring Engine
 * Rule-based scoring (0–100). Extend with ML model later.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScoringRule {
  name: string;
  points: number;
  check: (lead: any) => boolean;
}

const SCORING_RULES: ScoringRule[] = [
  { name: 'has_email',      points: 10, check: l => Boolean(l.email) },
  { name: 'has_phone',      points: 10, check: l => Boolean(l.phone) },
  { name: 'has_company',    points: 10, check: l => Boolean(l.company) },
  { name: 'has_job_title',  points: 5,  check: l => Boolean(l.jobTitle) },
  { name: 'has_value',      points: 5,  check: l => Boolean(l.value && l.value > 0) },
  { name: 'high_value',     points: 20, check: l => l.value >= 100000 },
  { name: 'mid_value',      points: 10, check: l => l.value >= 10000 && l.value < 100000 },
  { name: 'website_source', points: 15, check: l => l.source === 'WEBSITE' },
  { name: 'referral',       points: 20, check: l => l.source === 'REFERRAL' },
  { name: 'qualified',      points: 25, check: l => l.status === 'QUALIFIED' },
  { name: 'proposal_stage', points: 15, check: l => l.status === 'PROPOSAL' },
  { name: 'has_account',    points: 10, check: l => Boolean(l.accountId) },
];

export const calculateLeadScore = (lead: any): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of SCORING_RULES) {
    if (rule.check(lead)) {
      score += rule.points;
      reasons.push(`+${rule.points} ${rule.name}`);
    }
  }

  return { score: Math.min(score, 100), reasons };
};

export const updateLeadScore = async (leadId: string): Promise<number> => {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return 0;

  const { score, reasons } = calculateLeadScore(lead);

  await prisma.lead.update({ where: { id: leadId }, data: { score } });

  await prisma.leadScoreHistory.create({
    data: { leadId, score, reason: reasons.join(', ') },
  });

  return score;
};
