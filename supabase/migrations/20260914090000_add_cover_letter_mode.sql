-- `resumes.mode` gains a fourth value, `cover_letter`.
--
-- THE COLUMN CHANGED MEANING, not just its domain. `mode` was written to say
-- WHICH EDITOR ENGINE renders the row -- word, latex, structured. The LaTeX
-- editor was deleted on 2026-09-13 and the structured one was never built, so
-- there is exactly one engine left and the question the column answered no
-- longer has two possible answers. It now says WHICH KIND OF DOCUMENT the row
-- is: a CV, or a cover letter. Both open in the same Word editor.
--
-- A SEPARATE `cover_letters` TABLE WAS THE OBVIOUS ALTERNATIVE AND WAS
-- REJECTED. It would have duplicated the RLS policies, the snapshot table and
-- its ten-version cap, the document links to applications, and every read in
-- `resumeService` -- for a row with identical columns and an identical editor.
-- The only thing that differs between a CV and a cover letter here is which
-- templates start it and which rail edits it, and neither of those is a
-- storage concern.
--
-- `latex` and `structured` STAY IN THE CHECK. Rows written before 2026-09-13
-- still carry `latex`, and dropping it from the constraint would make this
-- migration fail on exactly the databases that have the history. Application
-- code folds them to `word` on read (`normalizeMode` in resumeService.ts);
-- this constraint's job is only to keep new writes inside the vocabulary.
ALTER TABLE public.resumes DROP CONSTRAINT IF EXISTS resumes_mode_check;
ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_mode_check CHECK (mode IN ('word','latex','structured','cover_letter'));

COMMENT ON COLUMN public.resumes.mode IS 'Which kind of document this row is: word (a CV) or cover_letter. latex and structured are legacy editor-engine values kept for pre-2026-09-13 rows and folded to word on read.';
