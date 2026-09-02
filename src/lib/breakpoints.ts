/**
 * The one responsive breakpoint the landing page turns on.
 *
 * 768 is `md` in Tailwind, and it is already what hides the app sidebar
 * (`hidden md:flex`) and where M5's "no kanban below 768px" constraint sits.
 * It lives here rather than in either consumer because two files need it and a
 * second literal is how two parts of one page end up disagreeing about what
 * "mobile" means.
 *
 * Consumers, and why each one cares:
 *   - lib/landingNav.ts    -- the navbar is 60px below it and 80px above.
 *   - lib/pinnedScroll.ts  -- PIN_MIN_WIDTH_PX (M6 Task 3). Mobile does not
 *     pin, settled 2026-08-28. That file must IMPORT this rather than declare
 *     its own 768.
 */
export const MD_BREAKPOINT_PX = 768
