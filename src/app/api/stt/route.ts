import { NextResponse } from "next/server";
import { speechToText } from "@/lib/sarvam/stt";
import { SarvamApiError } from "@/lib/sarvam/client";
import type { AppLanguage } from "@/lib/sarvam/config";

export const runtime = "nodejs";

/** Transcribes a recorded voice question via Saaras STT (codemix mode). */
export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "No audio received." }, { status: 400 });
    }

    const file = form.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No audio received." }, { status: 400 });
    }

    // Optional language hint from the client — improves Saaras accuracy for
    // Hindi and Marathi speech. Defaults to en-IN if not provided so existing
    // callers don't break.
    const language = (form.get("language") as AppLanguage | null) ?? "en-IN";

    const { transcript, languageCode } = await speechToText(
      file,
      file.name || "audio.webm",
      language
    );

    if (!transcript.trim()) {
      return NextResponse.json(
        { error: "Couldn't hear that clearly. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ transcript, languageCode });
  } catch (err) {
    if (err instanceof SarvamApiError) {
      console.error("Sarvam API error in STT:", err.status, err.body);
      return NextResponse.json({ error: `Sarvam API error: ${err.message}` }, { status: 502 });
    }
    console.error("stt error", err);
    return NextResponse.json({
      error: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 500 });
  }
}
