// Barrel over the vendored AnimateIcons components -- installed via `shadcn
// add` in Task 2 (as registry:ui items under src/components/ui/<name>-icon.tsx,
// then moved into this directory, see cb7b441) -- replacing the hand-drawn
// 34-icon custom set that used to live here as index.tsx (deleted, Task 2b,
// 2026-08-29, "Replace the custom icons with the new library").
//
// This file keeps the OLD export shape deliberately: a <Name>Icon component
// per glyph, an `icons` record, and an `IconName` type. nav-item.tsx does
// `icons[icon]`; `NAV` in sidebar.tsx is typed against `IconName`. Neither
// changes because of this barrel -- that is the whole point of keeping the
// shape.
//
// AnimateIcons defaults `size` to 24 and draws a 24-unit viewBox (the custom
// set was 20 units); every wrapped export below forces this design system's
// authored default of 20. Every one of the app's ~25 call sites passes its
// own explicit numeric `size` prop anyway, so this default is a safety net,
// not something most renders actually rely on.
//
// AnimateIcons' root is a <div>, not an <svg> -- a bare Tailwind size class on
// a caller would size the wrapper while the glyph stayed at 24px. None of this
// app's call sites do that (verified by grep, 2026-08-29): every one sizes
// through the numeric `size` prop, so no call site needs a `[&_svg]:size-N`
// companion class.
//
// Never pass `color`. These icons render `stroke="currentColor"`; `color`
// overrides that and breaks the accent/status token inheritance.
//
// Three glyphs had no exact lookup and were re-ruled (Task 2b):
//   GripVertical -> ellipsis-vertical  (no grip/drag glyph exists; three
//     stacked dots is the closest "drag me" affordance and is not lu-menu,
//     which reads as "open a menu")
//   RotateCcw    -> history            (lu-refresh-cw DOES exist in the set,
//     contradicting an earlier draft of this plan -- but the CV editor sites
//     mean "restore a previous version", which lu-history says better than a
//     reload arrow)
//   Briefcase    -> unchanged, see ./briefcase.tsx. No AnimateIcons glyph
//     covers it, and Gabe ruled LoginPage.tsx (its only call site, deleted by
//     M6 Task 4) stays untouched rather than take a near-match substitute.
import { createElement, type ComponentType } from 'react'

import { ArrowRightIcon as ArrowRightIconBase } from './arrow-right'
import { CalendarIcon as CalendarIconBase } from './calendar'
import { ChartLineIcon } from './chart-line'
import { CheckIcon as CheckIconBase } from './check'
import { CircleCheckIcon as CircleCheckIconBase } from './circle-check'
import { ChevronDownIcon as ChevronDownIconBase } from './chevron-down'
import { ChevronLeftIcon as ChevronLeftIconBase } from './chevron-left'
import { ChevronRightIcon as ChevronRightIconBase } from './chevron-right'
import { ClockIcon as ClockIconBase } from './clock'
import { DownloadIcon as DownloadIconBase } from './download'
import { EllipsisVerticalIcon } from './ellipsis-vertical'
import { ExternalLinkIcon } from './external-link'
import { EyeIcon as EyeIconBase } from './eye'
import { EyeOffIcon as EyeOffIconBase } from './eye-off'
import { FileTextIcon } from './file-text'
import { HistoryIcon } from './history'
import { InfoIcon as InfoIconBase } from './info'
import { LayoutDashboardIcon } from './layout-dashboard'
import { LayoutListIcon } from './layout-list'
import { LockIcon as LockIconBase } from './lock'
import { MailIcon as MailIconBase } from './mail'
import { MenuIcon as MenuIconBase } from './menu'
import { MoonIcon as MoonIconBase } from './moon'
import { PlusIcon as PlusIconBase } from './plus'
import { SearchIcon as SearchIconBase } from './search'
import { SettingsIcon as SettingsIconBase } from './settings'
import { ShieldCheckIcon as ShieldCheckIconBase } from './shield-check'
import { SunIcon as SunIconBase } from './sun'
import { TrashIcon as TrashIconBase } from './trash'
import { TriangleAlertIcon } from './triangle-alert'
import { UploadIcon as UploadIconBase } from './upload'
import { UserRoundIcon as UserRoundIconBase } from './user-round'
import { XIcon } from './x'

import { BriefcaseIcon } from './briefcase'
export { BriefcaseIcon }

/**
 * Forces this design system's authored 20px default over AnimateIcons' 24px
 * one, and TURNS THE REGISTRY'S OWN HOVER ANIMATION OFF.
 *
 * `isAnimated: false` is the second half of the icon motion work
 * (2026-09-04). Every glyph here ships a hover animation of its own, and two
 * things were wrong with leaving them on:
 *
 *   1. They fire on the icon's own 20px <div>, not on the control around it,
 *      so hovering a 200px nav row did nothing unless the pointer crossed the
 *      glyph. Focus and press were never handled, so the keyboard got no
 *      feedback at all.
 *   2. They are 0.6-1.2s springy overshoots -- the plus does
 *      `scale: [1, 1.2, 0.85, 1], rotate: [0, 10, -10, 0]`, the chevron emits
 *      a ghost trail. That is a playful consumer aesthetic, and this system is
 *      Swiss: minimal, fast, and explicitly not decorative.
 *
 * ./motion.ts replaces them with one CSS vocabulary driven by the control's
 * own hover, focus and press. The imperative `startAnimation()` handle each
 * glyph exposes is untouched and still works, so nothing is lost -- a caller
 * that genuinely wants the registry's one-shot can still ask for it, and a
 * caller can pass `isAnimated` back to override this default.
 *
 * SCOPED TO THE BARREL. Vendored shadcn primitives -- accordion, combobox,
 * calendar, pagination -- import their glyphs directly from the source files
 * and keep the registry's behaviour. Rewriting 39 registry files is a
 * different change than the one this is.
 */
function withDefaultSize<P extends { size?: number; isAnimated?: boolean }>(
  Component: ComponentType<P>
) {
  function Sized(props: P) {
    return createElement(Component, { size: 20, isAnimated: false, ...props })
  }
  const name = (Component as { displayName?: string; name?: string }).displayName
    ?? (Component as { displayName?: string; name?: string }).name
    ?? 'Icon'
  Sized.displayName = `Sized(${name})`
  return Sized
}

export const OverviewIcon = withDefaultSize(LayoutDashboardIcon)
export const ApplicationsIcon = withDefaultSize(LayoutListIcon)
export const CalendarIcon = withDefaultSize(CalendarIconBase)
export const DocumentsIcon = withDefaultSize(FileTextIcon)
export const AnalyticsIcon = withDefaultSize(ChartLineIcon)
export const SettingsIcon = withDefaultSize(SettingsIconBase)
export const PlusIcon = withDefaultSize(PlusIconBase)
export const SearchIcon = withDefaultSize(SearchIconBase)
export const ArrowRightIcon = withDefaultSize(ArrowRightIconBase)
export const UploadIcon = withDefaultSize(UploadIconBase)
export const DownloadIcon = withDefaultSize(DownloadIconBase)
export const CloseIcon = withDefaultSize(XIcon)
export const ClockIcon = withDefaultSize(ClockIconBase)
export const ExternalIcon = withDefaultSize(ExternalLinkIcon)
export const InfoIcon = withDefaultSize(InfoIconBase)
export const EyeIcon = withDefaultSize(EyeIconBase)
export const EyeOffIcon = withDefaultSize(EyeOffIconBase)
export const LockIcon = withDefaultSize(LockIconBase)
export const MailIcon = withDefaultSize(MailIconBase)
export const MenuIcon = withDefaultSize(MenuIconBase)
export const SunIcon = withDefaultSize(SunIconBase)
export const MoonIcon = withDefaultSize(MoonIconBase)
export const AlertCircleIcon = withDefaultSize(TriangleAlertIcon)
export const ChevronDownIcon = withDefaultSize(ChevronDownIconBase)
export const ChevronLeftIcon = withDefaultSize(ChevronLeftIconBase)
export const ChevronRightIcon = withDefaultSize(ChevronRightIconBase)
export const TrashIcon = withDefaultSize(TrashIconBase)
export const CheckIcon = withDefaultSize(CheckIconBase)
export const CircleCheckIcon = withDefaultSize(CircleCheckIconBase)
export const ShieldCheckIcon = withDefaultSize(ShieldCheckIconBase)
export const UserRoundIcon = withDefaultSize(UserRoundIconBase)
export const GripVerticalIcon = withDefaultSize(EllipsisVerticalIcon)
export const RotateCcwIcon = withDefaultSize(HistoryIcon)

/**
 * The common surface every glyph in the `icons` record is used through --
 * bracket-name lookup (nav-item.tsx) and the gallery, neither of which need
 * more than this. Individual named exports above (e.g. `AlertCircleIcon`)
 * keep their own richer, more precise prop types for direct import; only the
 * record itself is narrowed to a homogeneous shape. Needed because
 * `BriefcaseIcon` genuinely renders an `<svg>` and takes `SVGProps`, while
 * every AnimateIcons-backed glyph renders a wrapping `<div>` and takes
 * `HTMLAttributes<HTMLDivElement>` -- two real, different element types that
 * a single union call site (`icons[name]`) cannot otherwise typecheck through.
 */
type IconGlyphProps = {
  size?: number
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}

function asIconComponent<P extends IconGlyphProps>(
  Component: ComponentType<P>
): ComponentType<IconGlyphProps> {
  return Component as unknown as ComponentType<IconGlyphProps>
}

/** Every icon by name. Used by the gallery and by nav-item.tsx's icons[icon] lookup. */
export const icons = {
  Overview: asIconComponent(OverviewIcon),
  Applications: asIconComponent(ApplicationsIcon),
  Calendar: asIconComponent(CalendarIcon),
  Documents: asIconComponent(DocumentsIcon),
  Analytics: asIconComponent(AnalyticsIcon),
  Settings: asIconComponent(SettingsIcon),
  Plus: asIconComponent(PlusIcon),
  Search: asIconComponent(SearchIcon),
  ArrowRight: asIconComponent(ArrowRightIcon),
  Upload: asIconComponent(UploadIcon),
  Download: asIconComponent(DownloadIcon),
  Close: asIconComponent(CloseIcon),
  Check: asIconComponent(CheckIcon),
  CircleCheck: asIconComponent(CircleCheckIcon),
  ShieldCheck: asIconComponent(ShieldCheckIcon),
  UserRound: asIconComponent(UserRoundIcon),
  Clock: asIconComponent(ClockIcon),
  External: asIconComponent(ExternalIcon),
  Info: asIconComponent(InfoIcon),
  Eye: asIconComponent(EyeIcon),
  EyeOff: asIconComponent(EyeOffIcon),
  Lock: asIconComponent(LockIcon),
  Mail: asIconComponent(MailIcon),
  Menu: asIconComponent(MenuIcon),
  Sun: asIconComponent(SunIcon),
  Moon: asIconComponent(MoonIcon),
  AlertCircle: asIconComponent(AlertCircleIcon),
  ChevronDown: asIconComponent(ChevronDownIcon),
  ChevronLeft: asIconComponent(ChevronLeftIcon),
  ChevronRight: asIconComponent(ChevronRightIcon),
  Trash: asIconComponent(TrashIcon),
  GripVertical: asIconComponent(GripVerticalIcon),
  RotateCcw: asIconComponent(RotateCcwIcon),
  Briefcase: asIconComponent(BriefcaseIcon),
} as const

export type IconName = keyof typeof icons
