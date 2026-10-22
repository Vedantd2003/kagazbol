import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness + configuration check for Render. Reports whether keys are set, never their values. */
export function GET() {
  return NextResponse.json({
    ok: true,
    providerConfigured: !!process.env.SARVAM_API_KEY,
    evalDashboardEnabled: (process.env.EVAL_ADMIN_TOKEN ?? "").length >= 24,
  });
}
