import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const emailSchema = z.string().trim().min(1).max(255).email();
const passwordSchema = z.string().min(8).max(128);
const fullNameSchema = z.string().trim().max(100).optional();
const languageSchema = z.string().max(10).default("en");
const urlSchema = z.string().trim().url().max(2048);
const domainSchema = z.string().trim().min(1).max(255);
const uuidSchema = z.string().uuid();

export const emailValidationSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
  fullName: fullNameSchema,
  userId: z.string().uuid().nullish(),
  isResend: z.boolean().default(false),
  language: languageSchema,
  appName: z.string().max(100).default("BuffetWiz"),
  appDesc: z.string().max(500).default("Gestao de buffet"),
  appLogoUrl: z.string().url().max(2048).optional(),
  appUrl: urlSchema,
  appDomain: domainSchema,
}).refine((data) => data.isResend || data.password, {
  message: "Password is required for signup",
  path: ["password"],
});

export const emailResetPwdSchema = z.object({
  email: emailSchema,
  language: languageSchema,
  appName: z.string().max(100).default("BuffetWiz"),
  appDesc: z.string().max(500).default("Gestao de buffet"),
  appLogoUrl: z.string().url().max(2048).optional(),
  appUrl: urlSchema,
  appDomain: domainSchema,
});

export const emailChangeSchema = z.object({
  newEmail: emailSchema,
  fullName: fullNameSchema,
  language: languageSchema,
  appName: z.string().max(100).default("BuffetWiz"),
  appDesc: z.string().max(500).default("Gestao de buffet"),
  appLogoUrl: z.string().url().max(2048).optional(),
  appUrl: urlSchema,
  appDomain: domainSchema,
});

export const emailChangeVerifySchema = z.object({
  tokenId: uuidSchema,
  language: languageSchema,
  appName: z.string().max(100).default("BuffetWiz"),
  appDesc: z.string().max(500).default("Gestao de buffet"),
  appLogoUrl: z.string().url().max(2048).optional(),
  appUrl: urlSchema,
  appDomain: domainSchema,
});

export const emailChangeCompleteSchema = z.object({
  tokenId: uuidSchema,
});

export const googleOAuthInitiateSchema = z.object({
  appUrl: urlSchema,
  language: languageSchema,
});

export const googleOAuthCallbackSchema = z.object({
  code: z.string().min(1).max(2048),
  state: z.string().uuid().optional(),
  appUrl: urlSchema,
  language: languageSchema,
});

export const googleOneTapSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("getClientId") }),
  z.object({ action: z.literal("authenticate"), credential: z.string().min(1), language: languageSchema }),
]);

export const manageUsersSchema = z.object({
  action: z.enum(["list", "create", "update", "delete"]),
  id: z.string().uuid().optional(),
  email: emailSchema.optional(),
  full_name: z.string().trim().max(100).optional(),
  role: z.enum(["admin", "user"]).optional(),
  avatar_url: z.string().url().max(2048).nullable().optional(),
  preferred_language: z.string().max(10).optional(),
  display_mode: z.string().max(20).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  searchQuery: z.string().max(255).optional(),
  roleFilter: z.enum(["all", "admin", "user"]).default("all"),
});

export const deleteAccountSchema = z.object({
  confirmEmail: emailSchema,
});

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  corsHeaders: Record<string, string>
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return {
      success: false,
      response: new Response(
        JSON.stringify({ success: false, error: "Validation failed", details: errors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }
  return { success: true, data: result.data };
}
