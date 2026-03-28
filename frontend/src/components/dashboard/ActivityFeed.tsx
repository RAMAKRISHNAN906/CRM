import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Activity } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import { ActivityLog } from '../../types';

const ACTION_ICONS: Record<string, string> = {
  USER_REGISTERED: '🎉',
  USER_LOGIN: '🔑',
  LEAD_CREATED: '👤',
  LEAD_UPDATED: '✏️',
  LEAD_DELETED: '🗑️',
  CONTACT_CREATED: '📇',
  CONTACT_UPDATED: '✏️',
  DEAL_CREATED: '💼',
  DEAL_UPDATED: '✏️',
  TASK_CREATED: '✅',
  TASK_UPDATED: '✏️',
};

const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: 'registered an account',
  USER_LOGIN: 'logged in',
  LEAD_CREATED: 'created a lead',
  LEAD_UPDATED: 'updated a lead',
  LEAD_DELETED: 'deleted a lead',
  CONTACT_CREATED: 'created a contact',
  CONTACT_UPDATED: 'updated a contact',
  DEAL_CREATED: 'created a deal',
  DEAL_UPDATED: 'updated a deal',
  TASK_CREATED: 'created a task',
  TASK_UPDATED: 'updated a task',
};

interface ActivityFeedProps {
  activities: ActivityLog[];
  userName?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, userName }) => {
  return (
    <Card>
      <CardHeader title="Recent Activity" subtitle="Latest actions in your CRM" icon={<Activity size={16} />} />
      <div className="space-y-1">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-tertiary flex items-center justify-center mb-3">
              <Activity size={22} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center text-base mt-0.5">
                {ACTION_ICONS[activity.action] || '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-white">{userName || 'You'}</span>
                  {' '}{ACTION_LABELS[activity.action] || activity.action.toLowerCase().replace(/_/g, ' ')}
                  {activity.details?.name && (
                    <span className="text-accent-muted"> "{activity.details.name}"</span>
                  )}
                  {activity.details?.title && (
                    <span className="text-accent-muted"> "{activity.details.title}"</span>
                  )}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{formatRelativeTime(activity.createdAt)}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
};
