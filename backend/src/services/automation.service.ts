/**
 * Automation Engine
 * Evaluates workflows on entity events and executes actions.
 * Triggered from controllers after mutations.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

type TriggerName =
  | 'LEAD_CREATED' | 'LEAD_STATUS_CHANGED'
  | 'DEAL_STAGE_CHANGED' | 'DEAL_CREATED'
  | 'TASK_OVERDUE' | 'TICKET_CREATED'
  | 'CONTACT_CREATED' | 'SCHEDULED';

interface TriggerPayload {
  trigger: TriggerName;
  entityId: string;
  entityType: string;
  data: Record<string, any>;
  userId?: string;
}

type Condition = { field: string; operator: string; value: any };
type Action = { type: string; config: Record<string, any> };

const evaluateCondition = (condition: Condition, data: Record<string, any>): boolean => {
  const fieldValue = data[condition.field];
  switch (condition.operator) {
    case 'equals': return fieldValue === condition.value;
    case 'not_equals': return fieldValue !== condition.value;
    case 'contains': return String(fieldValue).includes(condition.value);
    case 'greater_than': return Number(fieldValue) > Number(condition.value);
    case 'less_than': return Number(fieldValue) < Number(condition.value);
    case 'is_set': return fieldValue !== null && fieldValue !== undefined;
    default: return true;
  }
};

const executeAction = async (action: Action, payload: TriggerPayload): Promise<void> => {
  const { type, config } = action;

  switch (type) {
    case 'CREATE_NOTIFICATION': {
      if (!payload.userId) break;
      await prisma.notification.create({
        data: {
          type: 'AUTOMATION',
          title: config.title || 'Automation triggered',
          body: config.body || '',
          link: config.link || '',
          userId: payload.userId,
        },
      });
      break;
    }

    case 'CREATE_TASK': {
      if (!payload.userId) break;
      await prisma.task.create({
        data: {
          title: config.title || 'Follow up',
          description: config.description,
          priority: config.priority || 'MEDIUM',
          dueDate: config.dueDays
            ? new Date(Date.now() + config.dueDays * 86400000)
            : undefined,
          ownerId: payload.userId,
          [`${payload.entityType.toLowerCase()}Id`]: payload.entityId,
        },
      });
      break;
    }

    case 'ASSIGN_TO_USER': {
      if (!config.assigneeId) break;
      await (prisma as any)[payload.entityType.toLowerCase()].update({
        where: { id: payload.entityId },
        data: { assigneeId: config.assigneeId },
      }).catch(() => {}); // entity may not have assigneeId
      break;
    }

    case 'SEND_WEBHOOK': {
      if (!config.url) break;
      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: payload.trigger, data: payload.data }),
        });
        logger.info(`Webhook sent to ${config.url}: ${response.status}`);
      } catch (err) {
        logger.error(`Webhook failed: ${err}`);
      }
      break;
    }

    default:
      logger.warn(`Unknown automation action: ${type}`);
  }
};

export const runAutomation = async (payload: TriggerPayload): Promise<void> => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { trigger: payload.trigger as any, isActive: true },
    });

    for (const workflow of workflows) {
      const conditions = workflow.conditions as Condition[];
      const actions = workflow.actions as Action[];

      // Check all conditions
      const conditionsMet = conditions.every(c => evaluateCondition(c, payload.data));
      if (!conditionsMet) continue;

      // Execute all actions
      const results: string[] = [];
      for (const action of actions) {
        try {
          await executeAction(action, payload);
          results.push(`${action.type}: ok`);
        } catch (err) {
          results.push(`${action.type}: failed - ${err}`);
        }
      }

      // Log execution
      await prisma.automationLog.create({
        data: {
          workflowId: workflow.id,
          status: 'success',
          input: payload.data,
          output: { actions: results },
          triggeredById: payload.userId,
        },
      });

      // Increment run count
      await prisma.workflow.update({
        where: { id: workflow.id },
        data: { runCount: { increment: 1 } },
      });
    }
  } catch (err) {
    logger.error(`Automation engine error: ${err}`);
  }
};
