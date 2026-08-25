-- resumes.content is an opaque Tiptap blob or LaTeX string: content and
-- presentation are fused, so templates cannot be swapped and AI tailoring
-- has nothing addressable. sections stores the JSON Resume schema instead.
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS sections JSONB;

COMMENT ON COLUMN public.resumes.sections IS 'Structured CV on the JSON Resume schema; content is null for legacy latex/word drafts';

-- mode gains a third value: structured is the new default authoring mode.
ALTER TABLE public.resumes DROP CONSTRAINT IF EXISTS resumes_mode_check;
ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_mode_check CHECK (mode IN ('word','latex','structured'));

CREATE INDEX IF NOT EXISTS idx_resumes_sections
  ON public.resumes USING GIN (sections);
