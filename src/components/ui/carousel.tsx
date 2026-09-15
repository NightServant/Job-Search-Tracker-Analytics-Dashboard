"use client"

// rounded-full is kept here and allowlisted in shadcnHouseRules.test.ts: the previous/next controls are circular buttons.
// The 4px cap governs corners on rectangles, not circles.
import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"

import { cn } from "@/lib/utils"
/**
 * THE APP'S OWN BUTTON, not `./shadcn-button` (2026-09-15).
 *
 * The two are different design systems wearing the same name. shadcn-button
 * draws a 28px control with an 8px radius, a 3px `ring/50` focus ring and a
 * `translate-y-px` press; this app's draws 32 or 40px with a 4px radius, a 2px
 * accent ring with an offset, and a `scale-[0.97]` press. The carousel's
 * arrows were the only controls in the app taking the first set, so the one
 * control a reader sees on four different screens was the one control that
 * did not match anything around it -- which is what Gabe means by "buttons of
 * the system are inconsistent in terms of design".
 *
 * `variant="secondary"` and `size="icon-s"` are the equivalents of the
 * `outline` / `icon-sm` pair they replace: a hairline-bordered square on the
 * page ground. `icon-s` is the size that did not exist until this change and
 * is why every square control in the app had to invent its own box.
 */
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon } from "@/components/icons/chevron-left"
import { ChevronRightIcon } from "@/components/icons/chevron-right"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on("reInit", onSelect)
    api.on("select", onSelect)

    return () => {
      api?.off("select", onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

/**
 * THE FLANKED LAYOUT: previous, the track, next -- all three in flow, in one
 * row (Gabe, 2026-09-15: "left and right must be placed besides carousel
 * content ... this change must be applied in general in order for other
 * carousel sections to follow the new design rules").
 *
 * WHAT IT REPLACES, AND IT WAS TWO DIFFERENT THINGS. The arrows shipped
 * `absolute -left-12 / -right-12`, which every caller in this app overrode:
 * TemplateGallery, JobFeed and UpNext each pushed them up onto the heading row
 * with `static translate-y-0`, and the landing carousel put them in a row
 * UNDER the stage. So the one control that appears on four screens was drawn
 * in three places, and a reader moving between them had to look for it each
 * time. This is the one arrangement, and it is the one the request names.
 *
 * WHY A WRAPPER RATHER THAN RESTORING THE ABSOLUTE DEFAULT. Absolute arrows
 * hang OUTSIDE the track's box, so they need 48px of clear space on each side
 * that nothing in the layout reserves -- which is why they were overridden
 * everywhere rather than used. In a flex row the track takes the width that is
 * actually left, so a narrow panel shrinks the cards instead of clipping a
 * control, and there is nothing to keep in sync.
 *
 * `min-w-0` ON THE TRACK IS LOAD-BEARING. A flex item's default `min-width` is
 * `auto`, which for an `overflow-hidden` scroller resolves to its CONTENT
 * width -- so a rail of eleven cards would refuse to shrink, push both arrows
 * off the panel, and overflow the page horizontally. It is set on
 * `CarouselContent`'s viewport below rather than asked of every caller.
 */
function CarouselRow({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carousel-row"
      // `gap-2` at phone width and `gap-3` above it: the arrows are 28-40px
      // controls and the gap between one and the cards is air, not structure,
      // so it is the first thing that should give when the viewport is narrow.
      className={cn("flex w-full items-center gap-2 sm:gap-3", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      // `flex-1 min-w-0` is inert outside a flex row and essential inside one
      // -- see CarouselRow. Stated here so the rule cannot be forgotten at a
      // call site.
      className="min-w-0 flex-1 overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "secondary",
  size = "icon-s",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        // IN FLOW, NOT ABSOLUTE. See CarouselRow for why the default flipped.
        // `shrink-0` so the control keeps its size when the row is tight --
        // without it a flex row squashes the button before it squashes the
        // track, which is backwards: a 40px card is still a card, a 12px
        // button is a smudge.
        "shrink-0 touch-manipulation rounded-full",
        orientation === "vertical" && "rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      {/* `size={16}`, not an `h-4 w-4` class. An AnimateIcon's root is a
          <div> wrapping a LazyMotion tree and the <svg> inside sizes off this
          numeric prop -- a Tailwind size class squeezes the wrapper and leaves
          a 24px glyph overflowing a 32px button. Same rule as the accordion's
          chevrons and skiper51's. */}
      <ChevronLeftIcon size={16} />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "secondary",
  size = "icon-s",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "shrink-0 touch-manipulation rounded-full",
        orientation === "vertical" && "rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRightIcon size={16} />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselRow,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
}
