import { notFound } from 'next/navigation'
import { isDevSurfaceEnabled } from '@/lib/isDevSurface'
import { Tokens } from './sections/Tokens'
import { Icons } from './sections/Icons'
import { Primitives } from './sections/Primitives'
import { Composites } from './sections/Composites'
import { Motion } from './sections/Motion'

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
        <h1 className="text-2xl font-bold">design system</h1>
        <p className="text-sm text-muted-foreground">
          every component, both themes. toggle the theme to review dark.
        </p>
      </header>
      <Tokens />
      <Icons />
      <Primitives />
      <Composites />
      <Motion />
    </main>
  )
}
