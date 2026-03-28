"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenExpiry = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwt.accessSecret, {
        expiresIn: env_1.config.jwt.accessExpiresIn,
        issuer: 'crm-api',
        audience: 'crm-client',
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwt.refreshSecret, {
        expiresIn: env_1.config.jwt.refreshExpiresIn,
        issuer: 'crm-api',
        audience: 'crm-client',
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.config.jwt.accessSecret, {
        issuer: 'crm-api',
        audience: 'crm-client',
    });
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.config.jwt.refreshSecret, {
        issuer: 'crm-api',
        audience: 'crm-client',
    });
};
exports.verifyRefreshToken = verifyRefreshToken;
const getTokenExpiry = (expiresIn) => {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match)
        throw new Error('Invalid token expiry format');
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return new Date(now.getTime() + value * multipliers[unit]);
};
exports.getTokenExpiry = getTokenExpiry;
//# sourceMappingURL=jwt.js.map