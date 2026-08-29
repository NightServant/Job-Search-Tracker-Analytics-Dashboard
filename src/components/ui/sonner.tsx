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
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
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
