import { notFound } from 'next/navigation'
import { isDevSurfaceEnabled } from '@/lib/isDevSurface'

/**
 * The design system review surface.
 *
 * M4 ships no application screens, so without somewhere to render components
 * they are unreviewable until M5. Each M4 task appends a section here.
 */
export default function GalleryPage() {
  if (!isDevSurfaceEnabled(process.env as Record<string, string | undefined>)) notFound()

  return (
    <main className="min-h-screen bg-background text-foreground p-8 space-y-16">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Design system</h1>
        <p className="text-sm text-muted-foreground">
          Every component, both themes. Toggle the theme to review dark.
        </p>
      </header>
      {/* Sections appended by Tasks 2-6 */}
    </main>
  )
}
