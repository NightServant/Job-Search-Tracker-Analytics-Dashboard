/**
 * The product screens the landing carousel shows.
 *
 * CAPTURED FROM /demo/*, NOT FROM A REAL ACCOUNT. Every figure in these images
 * comes from src/lib/demoFixture.ts, so they are invented by construction --
 * which is the only safe way to do this, because publishing a screenshot
 * publishes whatever is in it, and the only accounts with real data are real
 * people's. Route them through the demo and there is nothing to redact.
 *
 * Taken with headless Chrome at 1440x900, light theme:
 *
 *   for r in dashboard applications analytics documents calendar; do
 *     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
 *       --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
 *       --window-size=1440,900 --virtual-time-budget=9000 \
 *       --screenshot="public/screens/$r.png" "http://localhost:3000/demo/$r"
 *   done
 *
 * Each file stays under 400 KB. Five uncompressed screenshots is several
 * megabytes shipped to every visitor of a page whose whole argument is
 * restraint. Check with `du -h public/screens/*.png` after re-capturing.
 *
 * They include the demo banner, deliberately. These ARE the demo screens, and
 * a landing page arguing "no marketing claims, just things you can check"
 * should not crop the one label saying where its screenshots came from.
 *
 * `documents.png` is here rather than an application-detail shot because M5.5
 * rebuilt Documents into a Word-style start screen with a template gallery,
 * which is now the most distinctive screen in the app. A detail pane is not.
 *
 * There is no CV-editor shot: /demo has no CV route, because the editor is a
 * write surface and the demo has no write path. Captioning a calendar as the
 * CV editor to fill the slot would be the kind of small lie this page's whole
 * social-proof section exists to avoid.
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
    src: '/screens/calendar.png',
    alt: 'The calendar screen, showing interviews and deadlines on a month grid.',
    caption: 'the calendar',
  },
]
