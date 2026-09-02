/**
 * The product screens the landing carousel shows.
 *
 * ⚠️ THE FIVE PNGs DO NOT EXIST YET. `public/screens/` is empty, so this
 * carousel renders five broken images until someone captures them. Doing so is
 * Task 2 Step 1 and it cannot be done by writing code: it needs the app
 * running, signed in, with data on screen. It was NOT done in this pass
 * because the only accounts with data are real ones, and the plan forbids
 * shipping a PNG containing a real name, a real email or a real salary --
 * publishing a screenshot publishes what is in it.
 *
 * The two honest ways to produce them, in preference order:
 *   1. Build Task 6's demo fixture first and capture `/demo/*`. Invented data
 *      by construction, and it is the same fixture the demo already commits to
 *      showing strangers.
 *   2. Capture a real account and redact, which is slower and easy to get
 *      wrong in a corner of a chart.
 *
 * Capture at 1440x900 in the light theme, and keep each file under 400 KB --
 * five uncompressed screenshots is several megabytes shipped to every visitor
 * of a page whose whole argument is restraint. `du -h public/screens/*.png`.
 *
 * `documents.png` is here rather than an application-detail shot because M5.5
 * rebuilt Documents into a Word-style start screen with a template gallery,
 * which is now the most distinctive screen in the app. A detail pane is not.
 */

export interface LandingScreen {
  src: string
  alt: string
  caption: string
}

export const SCREENS: LandingScreen[] = [
  {
    src: '/screens/dashboard.png',
    alt: 'The overview screen, showing application counts by stage and recent activity.',
    caption: 'the overview',
  },
  {
    src: '/screens/applications.png',
    alt: 'The applications screen, showing the five-stage pipeline as a board.',
    caption: 'the pipeline',
  },
  {
    src: '/screens/analytics.png',
    alt: 'The analytics screen, showing conversion and time-in-stage charts.',
    caption: 'the analytics',
  },
  {
    src: '/screens/documents.png',
    alt: 'The documents screen, showing the CV template gallery.',
    caption: 'the documents',
  },
  {
    src: '/screens/cv.png',
    alt: 'The CV editor, showing a document beside its ATS check.',
    caption: 'the cv editor',
  },
]
