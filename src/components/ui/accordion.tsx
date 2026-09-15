import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"

import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "@/components/icons/chevron-down"
import { ChevronUpIcon } from "@/components/icons/chevron-up"

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          // NO `size-4` ON THE ICONS HERE any more -- see the two `size={16}`
          // props below for why a Tailwind size class was the wrong tool.
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        {/*
          BOTH CHEVRONS ARE THE SAME SIZE AND THE SAME DISPLAY, and until
          2026-09-15 they were neither -- which is what made the FAQ's open
          animation look broken.

          TWO DEFECTS, and only fixing both makes the swap invisible:

          1. `size={16}` rather than the `**:…:size-4` that used to sit on the
             trigger. These are AnimateIcons: the root is a <div> wrapping a
             LazyMotion tree and the <svg> inside sizes off the numeric prop,
             so a Tailwind size class squeezed the 16px wrapper while the glyph
             stayed 24px and overflowed it. src/components/icons/index.ts and
             skiper51's edit 1 already state this rule; the accordion was the
             one control still breaking it.

          2. `inline-flex`, not `inline`, on the expanded branch. The base
             class on these icons IS `inline-flex`, and `cn` resolves the
             `hidden` beside it away -- so the up chevron came back as
             `display: inline`, which ignores width and height outright. The
             down chevron stayed a flex box. Swapping between two glyphs of
             two different display types is the jump that reads as a regression
             rather than as a state change.
        */}
        <ChevronDownIcon
          size={16}
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          size={16}
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline-flex"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
