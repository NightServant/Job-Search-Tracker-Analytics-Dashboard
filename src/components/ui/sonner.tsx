"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { CircleCheckIcon } from "@/components/icons/circle-check"
import { InfoIcon } from "@/components/icons/info"
import { LoaderCircleIcon } from "@/components/icons/loader-circle"
import { TriangleAlertIcon } from "@/components/icons/triangle-alert"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon
            className="size-4 [&_svg]:size-4"
          />
        ),
        info: (
          <InfoIcon
            className="size-4 [&_svg]:size-4"
          />
        ),
        warning: (
          <TriangleAlertIcon
            className="size-4 [&_svg]:size-4"
          />
        ),
        // No `error` icon. base-nova ships lucide's OctagonX here and
        // AnimateIcons has no octagon glyph -- searched the 542-item manifest.
        // Substituting a different shape would invent a severity vocabulary,
        // so the element is dropped: this design system carries severity on a
        // rule in the status colour, not on a glyph (Task 8).
        loading: (
          <LoaderCircleIcon
            className="size-4 [&_svg]:size-4 animate-spin"
          />
        ),
      }}
      // --color-popover, not --popover. This project's tokens are declared in
      // an `@theme` block, which names them --color-*; base-nova ships this
      // file wired to shadcn's bare --popover / --border, none of which exist
      // here. Every one of these resolved to nothing, so the toast fell back
      // to sonner's own default surface instead of the popover white.
      style={
        {
          "--normal-bg": "var(--color-popover)",
          "--normal-text": "var(--color-popover-foreground)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius)",
          // Above everything. Dialogs, popovers and the sticky sidebar all sit
          // at z-50, so a toast at the same level was ordered by DOM position
          // and lost to whatever rendered after it -- a confirm dialog would
          // cover the toast reporting the result of the action it confirmed.
          // 100 rather than 51: it leaves room for a layer between the two
          // without another renumbering, and nothing in this app goes higher.
          zIndex: 100,
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
