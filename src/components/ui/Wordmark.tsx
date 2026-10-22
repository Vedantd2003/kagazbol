import Link from "next/link";

/** Wordmark: the name set in the display face, with the Devanagari "बोल" (speak) as the voice cue. */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-baseline gap-1 rounded-md text-ink no-underline" aria-label="KagazBol home">
      <span className="font-display text-[1.45rem] leading-none">Kagaz</span>
      <span lang="hi" className="font-display text-[1.45rem] leading-none text-stamp">बोल</span>
    </Link>
  );
}
