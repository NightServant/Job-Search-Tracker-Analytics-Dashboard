import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'

/**
 * The PDF route's fonts have to reach the server, and nothing local notices
 * when they do not.
 *
 * THIS IS HERE BECAUSE IT SHIPPED BROKEN. `@react-pdf/renderer` renders
 * through `pdfkit`, which loads the PDF standard fonts by a package IMPORTS
 * subpath -- `require('#standard-fonts/Helvetica')`, mapped inside pdfkit's
 * own package.json to `./js/standard-fonts/*.cjs`. No bundler and no file
 * tracer can follow that: the specifier is not a path, and the `*` is filled
 * in at runtime from a font name. So the build passed, every test passed, the
 * PDF rendered perfectly on a developer's machine -- where node_modules is
 * simply on disk -- and production answered 500 with
 * `Cannot find module '/var/task/node_modules/pdfkit/js/standard-fonts/
 * Helvetica.cjs'`.
 *
 * Measured, not assumed: the route traced 0 standard-font files without the
 * config below and 30 with it.
 *
 * A test on the CONFIG rather than on the output, deliberately. The real
 * check -- reading `.next/server/app/api/cv/pdf/route.js.nft.json` -- needs a
 * production build, which the suite does not run. This is the cheap guard that
 * fails in CI the moment somebody tidies these two lines away, which is the
 * realistic way this breaks again: they look like dead configuration.
 */
describe('the PDF route ships the fonts pdfkit loads at runtime', () => {
  it('externalizes @react-pdf/renderer so pdfkit resolves from node_modules', () => {
    expect(nextConfig.serverExternalPackages).toContain('@react-pdf/renderer')
  })

  it('force-includes pdfkit standard fonts for /api/cv/pdf', () => {
    const includes = nextConfig.outputFileTracingIncludes ?? {}
    const forRoute = includes['/api/cv/pdf'] ?? []
    expect(forRoute.some((pattern) => pattern.includes('pdfkit/js/standard-fonts'))).toBe(true)
  })
})
