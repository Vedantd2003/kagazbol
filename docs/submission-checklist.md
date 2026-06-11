# Submission checklist

Use this as a final pass before submitting the assignment.

- [ ] **Repo access** — grant repository access to `vinayak-sarvam`.
- [ ] **Public post** — publish `docs/blog-draft.md` (or an adapted version of it) as a
      public dev blog post (e.g., dev.to, Medium, personal blog, X/LinkedIn long-form).
- [ ] **Doc with comment access** — share a copy of this checklist (or the assignment
      response doc) with comment access enabled.
- [ ] **Form link** — submit the assignment form with links to:
  - [ ] The GitHub repository
  - [ ] The published blog post
  - [ ] The demo video (recorded using `docs/demo-script.md`)
- [ ] **Demo video** — record a 3-6 minute walkthrough following `docs/demo-script.md`
      (intro framing, end-to-end Hindi walkthrough, Marathi follow-up, model-routing beat).
- [ ] **`SARVAM_API_KEY`** — confirm `.env` is *not* committed (`.env.example` is committed
      instead) and that the key used for testing/recording is not shared in the repo,
      video, or blog post.
- [ ] **Smoke test** — run `npm run smoke-test` against a live `SARVAM_API_KEY` and confirm
      all four capabilities (chat 105B + 30B, TTS, STT, Document Intelligence) succeed.
- [ ] **Clean-clone check** — from a fresh directory:
      `git clone <repo> && cd <repo> && cp .env.example .env` (add real key)
      `&& npm install && npm run dev`, then confirm the app loads at
      `http://localhost:3000` and the sample-document flow works end-to-end.
- [ ] **README** — confirm the architecture diagram renders on GitHub and the
      model-routing table is accurate.
