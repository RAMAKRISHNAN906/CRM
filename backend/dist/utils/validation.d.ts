import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
}, {
    name: string;
    email: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const leadSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodOptional<z.ZodString>;
    company: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]>>;
    source: z.ZodOptional<z.ZodEnum<["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "EMAIL_CAMPAIGN", "COLD_CALL", "TRADE_SHOW", "OTHER"]>>;
    value: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    email?: string | undefined;
    value?: number | undefined;
    status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    jobTitle?: string | undefined;
    source?: "WEBSITE" | "REFERRAL" | "SOCIAL_MEDIA" | "EMAIL_CAMPAIGN" | "COLD_CALL" | "TRADE_SHOW" | "OTHER" | undefined;
    currency?: string | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
}, {
    firstName: string;
    lastName: string;
    email?: string | undefined;
    value?: number | undefined;
    status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    jobTitle?: string | undefined;
    source?: "WEBSITE" | "REFERRAL" | "SOCIAL_MEDIA" | "EMAIL_CAMPAIGN" | "COLD_CALL" | "TRADE_SHOW" | "OTHER" | undefined;
    currency?: string | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const contactSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodOptional<z.ZodString>;
    company: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    linkedin: z.ZodOptional<z.ZodString>;
    twitter: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    email?: string | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    jobTitle?: string | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
    address?: string | undefined;
    city?: string | undefined;
    country?: string | undefined;
    website?: string | undefined;
    linkedin?: string | undefined;
    twitter?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    email?: string | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    jobTitle?: string | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
    address?: string | undefined;
    city?: string | undefined;
    country?: string | undefined;
    website?: string | undefined;
    linkedin?: string | undefined;
    twitter?: string | undefined;
}>;
export declare const dealSchema: z.ZodObject<{
    title: z.ZodString;
    value: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    stage: z.ZodOptional<z.ZodEnum<["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]>>;
    probability: z.ZodOptional<z.ZodNumber>;
    expectedClose: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    notes: z.ZodOptional<z.ZodString>;
    contactId: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    value?: number | undefined;
    currency?: string | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
    stage?: "PROPOSAL" | "NEGOTIATION" | "PROSPECTING" | "QUALIFICATION" | "CLOSED_WON" | "CLOSED_LOST" | undefined;
    probability?: number | undefined;
    expectedClose?: string | undefined;
    contactId?: string | undefined;
}, {
    title: string;
    value?: number | undefined;
    currency?: string | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
    stage?: "PROPOSAL" | "NEGOTIATION" | "PROSPECTING" | "QUALIFICATION" | "CLOSED_WON" | "CLOSED_LOST" | undefined;
    probability?: number | undefined;
    expectedClose?: string | undefined;
    contactId?: string | undefined;
}>;
export declare const taskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
    status: z.ZodOptional<z.ZodEnum<["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]>>;
    dueDate: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    relatedType: z.ZodOptional<z.ZodString>;
    relatedId: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | undefined;
    relatedType?: string | undefined;
    relatedId?: string | undefined;
}, {
    title: string;
    status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | undefined;
    relatedType?: string | undefined;
    relatedId?: string | undefined;
}>;
export declare const preferenceSchema: z.ZodObject<{
    theme: z.ZodOptional<z.ZodEnum<["dark", "light", "system"]>>;
    accentColor: z.ZodOptional<z.ZodEnum<["violet", "blue", "cyan", "green", "orange", "red", "pink"]>>;
    sidebarCollapsed: z.ZodOptional<z.ZodBoolean>;
    selectedModules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dashboardLayout: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    notifications: z.ZodOptional<z.ZodObject<{
        email: z.ZodOptional<z.ZodBoolean>;
        push: z.ZodOptional<z.ZodBoolean>;
        desktop: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        push?: boolean | undefined;
        email?: boolean | undefined;
        desktop?: boolean | undefined;
    }, {
        push?: boolean | undefined;
        email?: boolean | undefined;
        desktop?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    theme?: "dark" | "light" | "system" | undefined;
    accentColor?: "violet" | "blue" | "cyan" | "green" | "orange" | "red" | "pink" | undefined;
    sidebarCollapsed?: boolean | undefined;
    selectedModules?: string[] | undefined;
    dashboardLayout?: Record<string, any> | undefined;
    notifications?: {
        push?: boolean | undefined;
        email?: boolean | undefined;
        desktop?: boolean | undefined;
    } | undefined;
}, {
    theme?: "dark" | "light" | "system" | undefined;
    accentColor?: "violet" | "blue" | "cyan" | "green" | "orange" | "red" | "pink" | undefined;
    sidebarCollapsed?: boolean | undefined;
    selectedModules?: string[] | undefined;
    dashboardLayout?: Record<string, any> | undefined;
    notifications?: {
        push?: boolean | undefined;
        email?: boolean | undefined;
        desktop?: boolean | undefined;
    } | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortOrder: "asc" | "desc";
    search?: string | undefined;
    sortBy?: string | undefined;
}, {
    limit?: string | undefined;
    search?: string | undefined;
    page?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type DealInput = z.infer<typeof dealSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
//# sourceMappingURL=validation.d.ts.map