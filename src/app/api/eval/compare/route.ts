import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { getRun } from "@/lib/eval/store";
import { compareRuns } from "@/lib/eval/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const url = new URL(request.url);
    const [base, candidate] = await Promise.all([getRun(url.searchParams.get("base") ?? ""), getRun(url.searchParams.get("candidate") ?? "")]);
    if (!base || !candidate) throw new AppError("NOT_FOUND", "Run not found.");
    return NextResponse.json({ comparison: compareRuns(base, candidate) });
  } catch (err) {
    return errorResponse(err, "eval/compare");
  }
}
