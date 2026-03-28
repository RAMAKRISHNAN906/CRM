"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferences = exports.getPreferences = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getPreferences = async (req, res, next) => {
    try {
        const pref = await prisma_1.prisma.preference.findUnique({ where: { userId: req.user.userId } });
        if (!pref) {
            (0, response_1.sendError)(res, 'Preferences not found', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, pref, 'Preferences retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getPreferences = getPreferences;
const updatePreferences = async (req, res, next) => {
    try {
        const data = req.body;
        const updateData = { ...data };
        if (data.selectedModules)
            updateData.selectedModules = JSON.stringify(data.selectedModules);
        if (data.dashboardLayout)
            updateData.dashboardLayout = JSON.stringify(data.dashboardLayout);
        if (data.notifications)
            updateData.notifications = JSON.stringify(data.notifications);
        const pref = await prisma_1.prisma.preference.upsert({
            where: { userId: req.user.userId },
            update: updateData,
            create: { userId: req.user.userId, ...updateData },
        });
        (0, response_1.sendSuccess)(res, pref, 'Preferences updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updatePreferences = updatePreferences;
//# sourceMappingURL=preferences.controller.js.map