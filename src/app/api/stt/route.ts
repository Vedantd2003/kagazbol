import { NextResponse } from "next/server";
import { speechToText } from "@/lib/sarvam/stt";
import { SarvamApiError } from "@/lib/sarvam/client";

export const runtime = "nodejs";

/** Transcribes a recorded voice question via Saaras STT (codemix mode). */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No audio received." }, { status: 400 });
    }

    const { transcript, languageCode } = await speechToText(file, file.name || "audio.webm");
    if (!transcript.trim()) {
      return NextResponse.json(
        { error: "Couldn't hear that clearly. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ transcript, languageCode });
  } catch (err) {
    if (err instanceof SarvamApiError) {
      console.error("stt error", err.status, err.body);
      return NextResponse.json({ error: "The voice recognition service is unavailable right now." }, { status: 502 });
    }
    console.error("stt error", err);
    return NextResponse.json({ error: "Something went wrong transcribing audio." }, { status: 500 });
  }
}
