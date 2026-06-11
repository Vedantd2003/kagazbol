# I built a voice assistant that talks to Indian documents — here's why it only runs on Sarvam

Every household has a version of this scene: someone hands over an electricity bill, a
prescription, or a bank notice, and asks "what does this actually say, and what do I need
to do?" Usually it's a child or grandchild reading it aloud and translating the officialese.
I wanted to see if I could build that moment into an app — one you could point a phone
camera at, that would read the document back to you in your own language and then answer
follow-up questions out loud.

That app is **KagazBol** ("paper, talk"): photograph any Indian document, get a structured
summary card, hear a two-line spoken summary, and have a voice conversation about it — in
English, Hindi, or Marathi.

## Why this needed an Indian-language-first stack

The obvious approach — Whisper for speech-to-text, GPT for reasoning, a generic TTS voice —
falls apart at almost every step here. Indian documents mix Devanagari and Latin scripts in
the same line. People ask follow-up questions in code-mixed Hindi-English or
Marathi-English ("ye bill kab tak bharna hai?"), not "pure" Hindi or "pure" English. And a
robotic, transliterated TTS voice undermines the entire premise of "explain this to me like
a person would."

Sarvam AI's stack is built around exactly this: OCR that handles mixed-script Indian
documents, an ASR model (Saaras) with a dedicated **codemix** mode for Hinglish/Marathi-English
speech, chat models that reason fluently in Indian languages, and a TTS voice (Bulbul) that
sounds natural rather than transliterated. KagazBol is essentially a thin orchestration
layer over five Sarvam capabilities: Document Intelligence (OCR), Sarvam 105B, Sarvam 30B,
Bulbul TTS, and Saaras STT.

## The key design decision: routing between two chat models

The most interesting engineering decision in KagazBol isn't the OCR or the voice loop —
it's that the app deliberately calls **two different Sarvam chat models** depending on the
job:

```ts
// One accuracy-critical call per document — worth the extra latency
const result = await chatCompletion(
  SARVAM_MODELS.chatFlagship, // "sarvam-105b"
  [{ role: "user", content: buildSummaryPrompt(ocrText, language) }],
  { temperature: 0.1, maxTokens: 1024 }
);
console.log(`[model-routing] summarize via ${result.model}: ${result.latencyMs}ms`);
```

```ts
// Many latency-critical calls per session — keep the voice loop snappy
const result = await chatCompletion(
  SARVAM_MODELS.chatConversational, // "sarvam-30b"
  messages, // grounded system prompt + history + new question
  { temperature: 0.3, maxTokens: 256 }
);
console.log(`[model-routing] chat via ${result.model}: ${result.latencyMs}ms`);
```

The reasoning: **document summarization happens once per document**, and it's the moment
where accuracy matters most — getting the amount, the due date, and the required action
right, and writing a fluent native-language summary, not just a literal translation. A
slightly slower call here is an acceptable trade.

**Conversational follow-ups happen many times per session**, and they're in the critical
path of a live voice interaction — the user is sitting there with the mic open, waiting.
Here, a smaller, faster model that stays grounded in the document via a strict system
prompt (answer only from the document, three sentences max, no markdown) keeps the whole
voice loop feeling responsive without sacrificing correctness.

Both routes log their latency to the server console with a `[model-routing]` prefix. One thing
that surprised me while wiring this up: both `sarvam-105b` and `sarvam-30b` are *reasoning*
models — they spend part of their token budget on a hidden `reasoning_content` field before
emitting the actual answer, and that hidden step varies a lot in length call-to-call (I saw
105B calls range from ~6s to ~40s on the same prompt). I pass `reasoning_effort: "low"` to keep
that step short. So the routing decision isn't really about a guaranteed per-call speed
delta — it's about **call frequency and accuracy needs**. 105B runs once per document, so it's
fine to give it more headroom to get amounts/dates/deadlines right. 30B runs on every follow-up
in a live voice session, so it's the one that needs to *typically* feel snappy, even if any
individual reasoning model call can occasionally take longer than you'd like.

## What I'd build on top of this

KagazBol is intentionally narrow — no accounts, no history, no settings — but the pipeline
generalizes well:

- **A WhatsApp bot version**, so users never need to install an app at all — just send a
  photo to a WhatsApp number and get a voice note back.
- **A pension/government scheme form filler** that extends the summary step to detect
  required fields on a form and walks the user through filling it out by voice.
- **A pharmacy prescription checker** that cross-references extracted medicine names
  against a drug database to flag interactions or suggest generic alternatives.
- **A "village kiosk" mode** — a shared-device variant with larger touch targets and a
  "read it again" button, aimed at low-literacy users in shared community settings.

All four are the same core loop — OCR → grounded structured understanding → grounded
voice conversation — pointed at a different document type and a different distribution
channel. That's the bet underneath KagazBol: once OCR, reasoning, and voice all work
natively in Indian languages, "talk to your documents" stops being a gimmick and starts
being infrastructure.
