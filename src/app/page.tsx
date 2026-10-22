import Link from "next/link";
import { Camera, Mic, ShieldCheck, Square, Turtle, PencilLine, Check, Minus } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Stamp } from "@/components/ui/Stamp";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { LANGUAGE_REGISTRY } from "@/lib/languages";

const STEPS = [
  { title: "Take a photo", body: "Any one page: a bill, a prescription, a bank letter, a government form. Blurry or dark photos are flagged before they're sent." },
  { title: "KagazBol reads it", body: "Sarvam AI's document reader extracts the text, including Devanagari and pages that mix Hindi, Marathi and English." },
  { title: "You get the meaning", body: "What it is, how much, by when, and what to do — in plain English, Hindi or Marathi, read aloud if you like." },
  { title: "Ask anything", body: "Speak or type a question. Answers come only from your document, with the line they came from." },
];

export default function Landing() {
  const explain = LANGUAGE_REGISTRY.filter((l) => l.explanation === "supported");
  const readOnly = LANGUAGE_REGISTRY.filter((l) => l.explanation !== "supported");

  return (
    <>
      <a href="#main" className="sr-only-focusable fixed top-2 left-2 z-50 rounded bg-ink px-3 py-2 text-sheet">
        Skip to main content
      </a>
      <header className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-5 sm:px-8">
        <Wordmark />
        <nav aria-label="Page sections" className="ml-auto hidden items-center gap-6 text-base text-ink-2 md:flex">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#checked" className="hover:text-ink">Checked answers</a>
          <a href="#languages" className="hover:text-ink">Languages</a>
          <a href="#privacy" className="hover:text-ink">Privacy</a>
        </nav>
        <Link href="/app" className="ml-auto inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-ink px-4 font-semibold text-sheet md:ml-0">
          Open KagazBol
        </Link>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pt-6 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-14 lg:pb-28">
          <div>
            <h1 className="font-display text-[2.6rem] leading-[1.06] text-ink sm:text-5xl lg:text-[4.2rem]">
              Understand every document. In your language.
            </h1>
            <p lang="hi" className="mt-5 font-display text-2xl text-ink-2 sm:text-3xl">
              हर कागज़ समझिए, अपनी भाषा में।
            </p>
            <p className="mt-6 max-w-[33rem] text-xl leading-relaxed text-ink-2">
              Photograph a bill, prescription or bank notice. KagazBol tells you what it says, how much, and by when — in English, Hindi or Marathi — and answers your questions out loud.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/app" className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[var(--radius-control)] bg-stamp px-7 text-lg font-semibold text-stamp-ink shadow-[0_2px_0_rgb(0_0_0/0.15)] hover:brightness-110">
                <Camera className="size-6" aria-hidden />
                Explain a document
              </Link>
              <a href="#how" className="inline-flex min-h-16 items-center justify-center rounded-[var(--radius-control)] border border-rule-strong bg-sheet px-7 text-lg font-semibold text-ink hover:border-ink-2">
                See how it works
              </a>
            </div>
            <p className="mt-5 text-base text-ink-2">Free to try. No account. Works on any phone browser.</p>
          </div>
          <HeroDemo />
        </section>

        {/* How it works — a real sequence */}
        <section id="how" aria-labelledby="how-title" className="border-y border-rule bg-sheet">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <h2 id="how-title" className="max-w-2xl font-display text-3xl sm:text-4xl">
              From a photo to an answer
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative border-t-2 border-ink pt-5">
                  <span className="font-display text-4xl text-stamp">{i + 1}</span>
                  <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Checked, not guessed */}
        <section id="checked" aria-labelledby="checked-title" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 id="checked-title" className="font-display text-3xl sm:text-4xl">
              Every amount and date is checked against your document
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
              AI can misread. So after the explanation is written, KagazBol looks for each amount and date in the text of your document. If it&rsquo;s there, you can tap to see the exact line. If it isn&rsquo;t, you&rsquo;re told plainly to check the original.
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">
              Answers to your questions get the same check. It catches invented numbers and quotes; it can&rsquo;t prove an interpretation is right, so for medical, legal and money matters, KagazBol explains — it doesn&rsquo;t advise.
            </p>
          </div>
          <div className="sheet p-6 sm:p-8" aria-label="Example of checked values">
            <dl className="divide-y divide-rule">
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <dt className="text-ink-2">Total amount payable</dt>
                <dd className="flex items-center gap-3">
                  <span className="text-xl font-bold tabular-nums">Rs. 1,840.00</span>
                  <Stamp>Found in document</Stamp>
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <dt className="text-ink-2">Last date</dt>
                <dd className="flex items-center gap-3">
                  <span className="text-xl font-bold">21 June 2026</span>
                  <Stamp>Found in document</Stamp>
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <dt className="text-ink-2">Reconnection fee</dt>
                <dd className="flex items-center gap-3">
                  <span className="text-xl font-bold tabular-nums">₹250</span>
                  <Stamp tone="due">Not found — check the original</Stamp>
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-rule pt-4 text-base text-ink-2">
              The source line, highlighted: <mark className="mark">Rs. 1,840.00</mark>
            </p>
            <p className="mt-2 text-sm text-ink-3">Illustration. The third row shows how a value the AI produced but the document doesn&rsquo;t contain is flagged.</p>
          </div>
        </section>

        {/* Voice */}
        <section aria-labelledby="voice-title" className="bg-ink text-sheet">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 id="voice-title" className="font-display text-3xl sm:text-4xl">
                Ask the way you&rsquo;d ask your family
              </h2>
              <p lang="hi" className="mt-4 font-display text-2xl text-sheet/75">
                “कितना भरना है और कब तक?”
              </p>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-sheet/80">
                Speak in Hindi, Marathi, English or a mix of them. KagazBol shows what it heard before answering, so a misheard word never becomes a wrong answer.
              </p>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2">
              {[
                { icon: Mic, title: "One big button", body: "Tap to speak, tap when you finish. The microphone is on only while you're asking." },
                { icon: PencilLine, title: "Check what was heard", body: "Fix any word before the question is sent." },
                { icon: Square, title: "Stop any time", body: "Start talking again or tap stop, and the voice stops immediately." },
                { icon: Turtle, title: "Slower, or again", body: "0.75× speed, replay, pause. Or turn voice off and just read." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <Icon className="size-7 text-[var(--mark)]" aria-hidden />
                  <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-sheet/75">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Languages — straight from the capability registry */}
        <section id="languages" aria-labelledby="lang-title" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <h2 id="lang-title" className="font-display text-3xl sm:text-4xl">
            What works in which language
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            Explanations, answers and the app itself are in three languages today. The document reader can read eight more; those documents are explained in one of the three.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">Language support</caption>
              <thead>
                <tr className="border-b-2 border-ink text-sm text-ink-2">
                  <th scope="col" className="py-3 pr-4 font-semibold">Language</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Reads documents</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Explains &amp; answers</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Understands speech</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Speaks</th>
                </tr>
              </thead>
              <tbody>
                {explain.map((l) => (
                  <tr key={l.code} className="border-b border-rule">
                    <th scope="row" className="py-3.5 pr-4 font-normal">
                      <span className="text-lg font-semibold">{l.nativeName}</span>
                      {l.nativeName !== l.name && <span className="ml-2 text-ink-2">{l.name}</span>}
                    </th>
                    {(["ocr", "explanation", "stt", "tts"] as const).map((c) => (
                      <td key={c} className="px-3 py-3.5">
                        {l[c] === "supported" ? <Check className="size-5 text-ok" aria-label="Yes" /> : <Minus className="size-5 text-ink-3" aria-label="No" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-base text-ink-2">
            Also read (explained in English, Hindi or Marathi):{" "}
            {readOnly.map((l, i) => (
              <span key={l.code}>
                <span className="font-semibold text-ink">{l.nativeName}</span> ({l.name}){i < readOnly.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </section>

        {/* Privacy — only claims the implementation supports */}
        <section id="privacy" aria-labelledby="privacy-title" className="border-t border-rule bg-sheet">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <ShieldCheck className="size-9 text-ok" aria-hidden />
              <h2 id="privacy-title" className="mt-4 font-display text-3xl sm:text-4xl">
                What happens to your document
              </h2>
            </div>
            <ul className="space-y-5 text-lg leading-relaxed text-ink-2">
              <li><strong className="text-ink">No account, no database.</strong> KagazBol has no sign-up and does not store your document, its text or your questions on its servers.</li>
              <li><strong className="text-ink">Processed by Sarvam AI.</strong> To read and explain the document, the photo and its text are sent to Sarvam AI, an Indian AI provider. Their terms govern that processing.</li>
              <li><strong className="text-ink">Gone when you close the page.</strong> The explanation and conversation live only in your open browser tab.</li>
              <li><strong className="text-ink">Only settings are remembered</strong> — your language and voice choices — on your own device.</li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8">
          <h2 className="mx-auto max-w-2xl font-display text-3xl sm:text-5xl">Have a document you&rsquo;re not sure about?</h2>
          <Link href="/app" className="mt-9 inline-flex min-h-16 items-center justify-center gap-3 rounded-[var(--radius-control)] bg-stamp px-8 text-lg font-semibold text-stamp-ink hover:brightness-110">
            <Camera className="size-6" aria-hidden />
            Explain a document
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-ink-2 sm:flex-row sm:items-center sm:px-8">
          <Wordmark />
          <p className="sm:ml-4">Explains documents; not medical, legal or financial advice. Built on Sarvam AI.</p>
          <nav aria-label="Footer" className="flex gap-5 sm:ml-auto">
            <a href="https://github.com/Vedantd2003/kagazbol" className="hover:text-ink">Source code</a>
            <Link href="/eval" className="hover:text-ink">Reliability (admin)</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
