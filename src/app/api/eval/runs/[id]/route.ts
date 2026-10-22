import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { getRun } from "@/lib/eval/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await ctx.params;
    const run = await getRun(id);
    if (!run) throw new AppError("NOT_FOUND", "Run not found.");
    return NextResponse.json({ run });
  } catch (err) {
    return errorResponse(err, "eval/run");
  }
}
