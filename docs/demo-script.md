# Demo video script (3-6 minutes)

A suggested screen-recording script for a short demo video of KagazBol. Timings are
approximate — pace to whatever feels natural while recording.

---

## 1. Intro / framing (30-45s)

**Shot:** Talking head or voiceover over the empty upload screen (390px mobile view).

> "Meet KagazBol — 'paper, talk'. Across India, hundreds of millions of people regularly
> get documents they can't comfortably read on their own: an electricity bill full of
> English jargon, a doctor's prescription in cramped handwriting, a bank notice buried in
> officialese. Usually someone else in the family has to read it aloud and explain it.
>
> KagazBol turns that moment into something you can do yourself, by voice, in your own
> language. You photograph the document, it reads it, summarizes it out loud, and then
> you can just *ask it questions* — like you're talking to the person who'd normally
> explain it to you."

**Shot:** Quick zoom on the language switcher (English / हिंदी / मराठी).

> "It works in English, Hindi, and Marathi — and understands the way people actually
> speak: code-mixed Hindi-English, Marathi-English, the works."

---

## 2. End-to-end walkthrough — electricity bill, Hindi (90-120s)

**Shot:** Set language to हिंदी using the language switcher.

**Shot:** Tap the "MSEB Electricity Bill" sample document (or photograph the bundled
sample with a phone camera if recording on a real device).

> "Let's try a sample — an MSEB electricity bill. I'll just tap it."

**Shot:** Show the "Reading document..." and "Understanding..." processing states.

> "Behind the scenes, Sarvam's Document Intelligence is OCR-ing the page — including the
> Devanagari text — and then Sarvam's 105B model is turning that raw text into a
> structured summary: document type, key amounts, dates, and what action is needed."

**Shot:** Summary card appears. Let the autoplay TTS summary play out loud (in Hindi).

> "And it speaks the summary out loud immediately — 'Yeh aapka MSEB bijli ka bill hai...
> ₹1,840 bharna hai, 21 June tak.' No reading required."

**Shot:** Zoom on the summary card — amount, due date, action required, key facts.

> "The card itself shows the total amount, the due date highlighted in red, what action
> you need to take, and the key facts pulled straight from the bill — consumer name,
> units consumed, the late fee."

**Shot:** Tap the mic button, ask (in Hindi/Hinglish): *"Agar maine late payment kiya to
kitna extra dena padega?"*

> "Now I'll tap the mic and ask a follow-up — in Hinglish, the way people actually talk."

**Shot:** Show mic states — recording → transcribing → thinking → speaking. Let the
spoken answer play.

> "Sarvam's Saaras model transcribes that code-mixed speech, Sarvam's 30B model answers —
> grounded strictly in this bill, nothing made up — and Bulbul speaks the answer back."

---

## 3. Multilingual follow-up — Marathi (45-60s)

**Shot:** Switch language to मराठी using the language switcher. Note the summary card
re-renders and the TTS summary replays in Marathi.

> "Now here's the part that's hard to do outside the Sarvam ecosystem — let's switch to
> Marathi mid-conversation."

**Shot:** Tap the mic, ask a follow-up question in Marathi (e.g., *"बिल भरायची शेवटची
तारीख कोणती आहे?"*).

> "I'll ask, in Marathi, when the bill is due. Same document, same grounded answer — just
> in a different language, with a natural Marathi voice reply."

**Shot:** Let the Marathi spoken answer play, show the new turn appended to the
conversation history.

---

## 4. Why this only works on Sarvam (20s, explicit "model routing" beat)

**Shot:** Cut to a simple on-screen graphic or the README's model-routing table — or just
talking head with the architecture diagram visible.

> "Quick note on what's actually happening under the hood, because this is the core design
> decision: every document goes through **Sarvam 105B once** — that's the accuracy-critical
> step, turning messy OCR text into a structured, fluent summary in the right language.
> But every follow-up question goes through the smaller **Sarvam 30B** — that's the
> latency-critical step, because you're waiting for it live, in a voice conversation. One
> model for accuracy, a faster model for conversation — and Saaras and Bulbul handle the
> Hindi/Marathi/code-mixed speech on both ends. No English-only stack — no combination of
> Whisper, GPT, and a generic TTS voice — handles Devanagari OCR, Hinglish ASR, and natural
> Hindi/Marathi speech together like this."

---

## 5. Closing (10-15s)

**Shot:** Back to the summary card, "New document" button visible.

> "That's KagazBol — photograph any Indian document, hear it explained, and ask it
> anything, in your language. Thanks for watching."

---

## Suggested shot list (for editing)

1. Empty upload screen, mobile width (390px)
2. Language switcher close-up
3. Sample document tap → processing states
4. Summary card reveal + autoplay TTS (Hindi)
5. Summary card detail zoom (amount / deadline / action required)
6. Mic button states: idle → recording → transcribing → thinking → speaking
7. Conversation history with Hinglish Q&A
8. Language switch to Marathi + summary re-render
9. Marathi voice Q&A
10. Architecture diagram or model-routing table (from README)
11. "New document" reset
