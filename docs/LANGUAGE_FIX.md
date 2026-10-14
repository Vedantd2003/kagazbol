# Language Fix — Hindi and Marathi

Branch: `feat/frontend-v2`  
Date: 2026-10-14  

---

## Failures Found

### F1 — `<html lang="hi">` hardcoded

**File**: `src/app/layout.tsx:30`  
**Root cause**: The `lang` attribute was permanently set to `"hi"` regardless of which language the user selected. This caused:
- CSS `:lang(hi)` font-size rule to always fire (every page rendered 5% larger text for all languages)
- CSS `:lang(mr)` rule never fired (Marathi text never got its larger size)
- Screen readers announced all text as Hindi — English was read with Hindi phonology, Marathi was never distinguished
- Browser hyphenation and spell-check used Hindi rules globally

**Fix**: Changed the default to `lang="en"` in layout.tsx. Added a `useEffect` in `page.tsx` that updates `document.documentElement.lang` to the BCP-47 root code (`en`, `hi`, `mr`) from `LANGUAGE_CONFIG[language].htmlLang` on every language state change.

**Verified**: Building passes. The CSS `:lang()` rules now fire correctly per language.

---

### F2 — STT sent no language code

**File**: `src/lib/sarvam/stt.ts:24`, `src/lib/apiClient.ts:136`  
**Root cause**: `speechToText()` called Saaras:v3 with only `model` and `mode` fields — no `language_code`. Saaras auto-detects, but for Marathi speech with limited training data the auto-detector may classify it as Hindi, causing the transcript to come back in Devanagari but with Hindi spelling/grammar normalisation applied. This degrades downstream chat quality.

**Fix**: 
1. Added `language: AppLanguage = "en-IN"` parameter to `speechToText()` in `stt.ts`
2. Reads `LANGUAGE_CONFIG[language].sttLanguageCode` and sends it as `language_code` in the FormData
3. Updated `transcribeAudio(blob, language)` in `apiClient.ts` to accept and forward the language
4. Updated `page.tsx` to pass `language` when calling `transcribeAudio(blob, language)`
5. Updated `/api/stt/route.ts` to read `language` from FormData and pass to `speechToText()`

**Note**: `codemix` mode is retained — Saaras still handles code-switched Hinglish/Marathi-English freely. The `language_code` hint improves accuracy without restricting code-switching.

---

### F3 — TTS missing `enable_preprocessing`

**File**: `src/lib/sarvam/tts.ts`  
**Root cause**: The TTS call did not include `enable_preprocessing: true`. Without this, Bulbul receives raw numeric strings (e.g. "₹1,234", "31/10/2024") and may read them digit-by-digit in English even when `target_language_code` is `hi-IN` or `mr-IN`. A user hearing "rupees one comma two three four" instead of "एक हज़ार दो सौ चौंतीस रुपये" would consider Hindi/Marathi "broken".

**Fix**: Added `enable_preprocessing: true` to the TTS request body. This instructs Bulbul to expand numbers, dates, currency symbols, and abbreviations using the target language's rules before synthesis.

---

### F4 — Prompts used English language name only — no script instruction

**File**: `src/lib/prompts.ts`  
**Root cause**: Both the summary and chat system prompts told the model "write in Hindi" / "write in Marathi" but never specified the script. The 30B model, optimised for low latency, occasionally falls back to English or Romanised Devanagari (e.g. "aapka bill hai") particularly for short answers. Without a script constraint, the model's output language was non-deterministic.

**Fix**: 
1. Added `promptScript` field to `LANGUAGE_CONFIG` (`"Latin script"` for en-IN, `"Devanagari script"` for hi-IN and mr-IN)
2. Both prompts now include `using ${promptScript}` in the language instruction
3. Added an explicit negative constraint: "Do NOT reply in English if the user's language is ${promptName}"
4. The chat prompt also reinforces: "the main language must be ${promptName}"

---

### F5 — `DOC_INTELLIGENCE_LANGUAGE` mapping was a separate constant

**File**: `src/lib/sarvam/config.ts`  
**Root cause**: Language codes for Document Intelligence were in a separate `DOC_INTELLIGENCE_LANGUAGE` record that could drift out of sync with the main language config. Not a current bug, but a maintenance hazard.

**Fix**: Moved all per-language values into `src/lib/languages.ts` (`LANGUAGE_CONFIG[lang].docIntelligenceCode`). `config.ts` now re-exports from `languages.ts`.

---

### F6 — Hardcoded English fallback strings

**Files**: `src/lib/parseSummary.ts:12`, `src/components/ErrorCard.tsx:42`  
**Root cause**: 
- `parseSummaryResponse()` returned `"I could not read this document clearly."` and `"Please review the document text below."` in English regardless of the user's language
- `ErrorCard` detected language by searching for the substring `"try"` or `"कोशिश"` in the `errorGeneric` string — a fragile hack that would break on any copy change

**Fix**:
- Added `FALLBACK_STRINGS` in `parseSummary.ts` with Hindi and Marathi equivalents. `parseSummaryResponse()` now accepts an optional `language` parameter and picks the right set.
- Added `tryAgain` key to `UiStrings` with translations for all three languages. `ErrorCard` now uses `strings.tryAgain` directly.
- Updated `/api/summarize/route.ts` to pass `body.language` to `parseSummaryResponse()`.

---

## Central Language Config (`src/lib/languages.ts`)

All language-specific values now live in one place:

| Field | Purpose |
|-------|---------|
| `code` | AppLanguage BCP-47 code |
| `label` | Short pill label (EN / हि / म) |
| `nativeLabel` | Full native label (English / हिंदी / मराठी) |
| `htmlLang` | HTML `lang` attribute root (en / hi / mr) |
| `promptName` | English name for LLM system prompts |
| `promptScript` | Script name for LLM system prompts |
| `ttsSpeaker` | Bulbul v3 speaker |
| `ttsLanguageCode` | `target_language_code` for TTS |
| `sttLanguageCode` | `language_code` for STT |
| `docIntelligenceCode` | Language for OCR job |
| `fontStack` | CSS font-family for the language |

Every component and API route reads from `LANGUAGE_CONFIG` — no language values are duplicated elsewhere.

---

## Verification

- `npm run build` — clean (0 errors, 0 warnings)
- `npm test` — 15/15 unit tests pass
- The `parseSummary` tests confirm Hindi and Marathi fallback strings are correct

### Open items (need live Sarvam API key to verify)

1. **TTS speaker "priya" + mr-IN**: While Bulbul v3 is a multilingual model and "priya" is documented as a multilingual speaker, actual Marathi TTS output quality should be verified with a real API call. If Sarvam adds a dedicated Marathi speaker, update `LANGUAGE_CONFIG["mr-IN"].ttsSpeaker`.

2. **STT language_code + codemix**: Verify that sending `language_code: "mr-IN"` with `mode: "codemix"` does not restrict code-switching — Saaras:v3 should still accept English words in the transcript. Run `npm run smoke-test` with Marathi speech to confirm.

3. **Prompt language compliance**: Run the chat through the full flow in Hindi and Marathi and verify the 30B model responds in Devanagari. If it still falls back to English, escalate `reasoning_effort` or consider adding a Hindi/Marathi phrase to the system prompt as a style anchor.
