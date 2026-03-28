import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { PreferenceInput } from '../utils/validation';

function parsePref(pref: any) {
  return {
    ...pref,
    selectedModules: typeof pref.selectedModules === 'string' ? JSON.parse(pref.selectedModules) : (pref.selectedModules ?? []),
    dashboardLayout: typeof pref.dashboardLayout === 'string' ? JSON.parse(pref.dashboardLayout) : (pref.dashboardLayout ?? {}),
    notifications:   typeof pref.notifications  === 'string' ? JSON.parse(pref.notifications)  : (pref.notifications  ?? {}),
  };
}

export const getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pref = await prisma.preference.findUnique({ where: { userId: req.user!.userId } });
    if (!pref) { sendError(res, 'Preferences not found', 404); return; }
    sendSuccess(res, parsePref(pref), 'Preferences retrieved');
  } catch (error) { next(error); }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: PreferenceInput = req.body;
    const updateData: any = { ...data };
    if (data.selectedModules) updateData.selectedModules = JSON.stringify(data.selectedModules);
    if (data.dashboardLayout) updateData.dashboardLayout = JSON.stringify(data.dashboardLayout);
    if (data.notifications)   updateData.notifications   = JSON.stringify(data.notifications);

    const pref = await prisma.preference.upsert({
      where: { userId: req.user!.userId },
      update: updateData,
      create: { userId: req.user!.userId, ...updateData },
    });
    sendSuccess(res, parsePref(pref), 'Preferences updated');
  } catch (error) { next(error); }
};
