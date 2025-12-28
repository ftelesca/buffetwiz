import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  resetAt: Date;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'email-validation': { maxRequests: 5, windowSeconds: 3600 },
  'email-resetpwd': { maxRequests: 3, windowSeconds: 3600 },
  'google-oauth-initiate': { maxRequests: 10, windowSeconds: 300 },
  'google-onetap': { maxRequests: 10, windowSeconds: 300 },
};

export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;
  return 'unknown';
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return { allowed: true, currentCount: 0, resetAt: new Date() };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const rateLimitConfig = config || RATE_LIMIT_CONFIGS[endpoint] || { maxRequests: 10, windowSeconds: 60 };

  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: rateLimitConfig.maxRequests,
      p_window_seconds: rateLimitConfig.windowSeconds,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true, currentCount: 0, resetAt: new Date() };
    }

    if (data && data.length > 0) {
      return {
        allowed: data[0].allowed,
        currentCount: data[0].current_count,
        resetAt: new Date(data[0].reset_at),
      };
    }

    return { allowed: true, currentCount: 0, resetAt: new Date() };
  } catch (err) {
    console.error("Rate limit check exception:", err);
    return { allowed: true, currentCount: 0, resetAt: new Date() };
  }
}

export function rateLimitExceededResponse(
  resetAt: Date,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter: retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
