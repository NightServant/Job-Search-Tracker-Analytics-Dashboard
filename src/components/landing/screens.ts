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
 *
 * EVERY SCREEN HAS TWO CAPTURES, one per theme. A landing page that follows
 * the reader's theme and then shows five dark screenshots on a white page is
 * worse than one that never adapted at all: the mismatch reads as stock
 * imagery borrowed from somewhere else, which is the exact impression a
 * screenshot of your own product exists to prevent.
 *
 * JPEG, not PNG. These are UI over a gradient backdrop, which is the case PNG
 * is worst at -- the same captures were 4.6MB as PNG and are 1.2MB as JPEG at
 * quality 88, with the table text still crisp at 1:1 (checked, not assumed).
 * 1440px wide keeps them sharp in a slot that renders at roughly 1200.
 */

export interface LandingScreen {
  /** Shown while the page is in the light theme. */
  srcLight: string
  /** Shown while the page is in the dark theme. */
  srcDark: string
  alt: string
  caption: string
}

export const SCREENS: LandingScreen[] = [
  {
    srcLight: '/screens/light/dashboard.jpg',
    srcDark: '/screens/dark/dashboard.jpg',
    alt: 'The overview screen, showing application counts by stage and recent activity.',
    caption: 'the overview',
  },
  {
    srcLight: '/screens/light/applications.jpg',
    srcDark: '/screens/dark/applications.jpg',
    alt: 'The applications screen, showing the five-stage pipeline as a board.',
    caption: 'the pipeline',
  },
  {
    srcLight: '/screens/light/analytics.jpg',
    srcDark: '/screens/dark/analytics.jpg',
    alt: 'The analytics screen, showing conversion and time-in-stage charts.',
    caption: 'the analytics',
  },
  {
    srcLight: '/screens/light/documents.jpg',
    srcDark: '/screens/dark/documents.jpg',
    alt: 'The documents screen, showing the CV template gallery.',
    caption: 'the documents',
  },
  {
    srcLight: '/screens/light/calendar.jpg',
    srcDark: '/screens/dark/calendar.jpg',
    alt: 'The calendar screen, showing interviews and deadlines on a month grid.',
    caption: 'the calendar',
  },
]
