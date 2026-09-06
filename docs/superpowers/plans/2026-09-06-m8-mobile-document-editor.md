# M8 — Word-first Documents on tablet and mobile

**Status:** PLAN ONLY. Part 1 (the /applications flex-column restructure) is implemented and verified; this is the second half of Gabe's 2026-09-06 brief.

**Goal:** Below `lg`, Documents becomes a Word-shaped surface: recents first, a CTA to a Templates page, and a full-screen editor modelled on Word mobile — with AI tailoring and the CV check still reachable. LaTeX disappears below `lg`.

---

## What already exists (verified 2026-09-06)

Most of the machinery is here; this milestone re-shapes it rather than inventing it.

| Piece | Where | Note |
|---|---|---|
| Documents screen | `components/documents/DocumentsPage.tsx` | Already "laid out the way Word lays out its start screen" — but **gallery first, recents second**. Gabe wants that order reversed. |
| Template gallery | `components/documents/TemplateGallery.tsx` | Renders `WORD_TEMPLATES` + `LATEX_TEMPLATES` from `services/resumeTemplateService.ts` |
| Editor route | `app/(app)/cv/page.tsx` | `?draft=<id>` opens the stored mode; `?draft=new` shows `ModeChooser` |
| Word editor | `components/cv/WordResumeEditor.tsx` | Tiptap; composes `DocumentWorkspace` with two rails |
| AI tailor + CV check | `components/cv/CvTailoring.tsx` | `useCvTailoring()` plus `TailoringTargetRail` (pick a job) and `TailoringAnalysisRail` (the check). **These two rails are the "AI tailor and CV check" that must survive on mobile.** |
| Shell take-over | `components/shell/documentFocus.tsx` | An editor claims focus on mount; the shell hides its nav. Already the mechanism for "no app shell". |

**So the editor already goes full-screen.** What is missing is the Word-mobile *chrome* around it, and a way to reach the rails without a 1100px canvas.

## The Word mobile reference

From Gabe's screenshots, the shape to follow:

- **Title centred** in a slim bar of its own (`Document`), tinted accent.
- **Command row** under it: done (✓), format, save, find, layout, undo, overflow (⋮).
- **Canvas full-bleed**, no card, no rails.
- **Bottom formatting bar** pinned: B, I, U, highlight, font colour, list, and a caret that expands it.
- **New-document screen** is a *grid of template cards* with a "Create in" selector above — which is exactly the Templates page this milestone adds.

---

## Tasks

### Task 1 — LaTeX stops below `lg`
- [ ] `TemplateGallery` renders Word templates only below `lg`.
- [ ] `ModeChooser` is skipped below `lg` — new CVs are Word.
- [ ] **An existing LaTeX CV opened below `lg` is the case to get right** (see Question 2). It must not 404, silently render an empty Word editor, or lose content.
- [ ] Gate: a LaTeX draft id below `lg` reaches a defined, tested state.

### Task 2 — Documents: recents first, CTA to Templates
- [ ] Order becomes: page header → **recents** → CTA. The inline `TemplateGallery` leaves the screen below `lg` (see Question 1 for desktop).
- [ ] The CTA (`new CV`) navigates to `/documents/templates` rather than opening `ModeChooser`.
- [ ] Gate: existing DocumentsPage tests pass or are updated deliberately, not deleted.

### Task 3 — `/documents/templates`
- [ ] New route + its `/demo/documents/templates` twin.
- [ ] **Keeps the app shell** (top bar + bottom nav), and **the demo banner is suppressed on it** — Gabe's explicit instruction. Demo layout gets a per-route banner opt-out.
- [ ] Word templates only, as a card grid following Word's "New" screen.
- [ ] Blank document is the first card.
- [ ] Gate: from `/demo/documents/templates` every link stays inside `/demo` (the existing demo test already enforces this globally).

### Task 4 — The mobile editor chrome
- [ ] Choosing a template creates the draft and routes to the editor **with no app shell** — via the existing `useDocumentFocus()`, not a new mechanism.
- [ ] Below `lg`: centred title bar, command row, full-bleed canvas, pinned bottom formatting bar. Above `lg` the current `DocumentWorkspace` two-rail layout is untouched.
- [ ] Gate: the two layouts share one editor instance and one save path — no forked component tree.

### Task 5 — AI tailor and CV check on mobile
- [ ] `TailoringTargetRail` and `TailoringAnalysisRail` reachable from the command row (see Question 3).
- [ ] Same `useCvTailoring` state as desktop; the rails render in a different container, not a different implementation.
- [ ] Gate: a test drives tailoring end to end at a mobile width.

### Task 6 — Gates
- [ ] Full suite, tsc, lint, build.
- [ ] Browser verification by iframe measurement at 390, 780, 834, 1024, 1280 — the method used throughout 2026-09-06.

---

## Questions that change the work

1. **Does DESKTOP `/documents` change too?** Gabe's brief describes tablet-and-below. Recommendation: **yes, all widths** — recents first with a CTA to `/documents/templates`, so there is one Documents screen rather than two that drift. Desktop's Templates page then also shows LaTeX.
2. **An existing LaTeX CV opened below `lg`.** Recommendation: open **read-only** with a "LaTeX editing needs a larger screen" notice and an export action. Never silently convert — that would destroy the source.
3. **Where do the tailor and check live on mobile?** Recommendation: a **bottom sheet** from the command row's overflow, with the two rails as two tabs. Matches Word mobile, keeps the canvas full-bleed.
4. **"Word templates only from desktop screens"** — read as *the same Word template set the desktop gallery already lists*. Confirm if it meant something else.
