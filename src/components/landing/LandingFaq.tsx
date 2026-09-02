'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SearchIcon } from '@/components/icons'
import { Section, SectionHeading } from './Section'
import { FAQ } from './content'

/**
 * Section 5. Exactly five questions, single-open.
 *
 * Five because Gabe specified five, and the discipline is that a sixth
 * question means one of the five was not worth asking. Landing.test.tsx
 * asserts the count, so a sixth is a red test rather than a quiet drift.
 *
 * FULL CONTAINER WIDTH. It used to be capped at max-w-3xl while every other
 * section ran to the container edge, which left it as a narrow column stranded
 * beside full-width content -- the single most obviously unconsidered thing on
 * the page. An accordion row is mostly whitespace anyway; the width costs
 * nothing and buys alignment with the rest of the grid.
 *
 * The answers were checked against the code before they were written: the CSV
 * claim is buildJobsCsvText in src/lib/jobCsv.ts wired into ApplicationsPage,
 * and the deletion claim is delete_own_account, called from Settings. A FAQ
 * that oversells is the fastest way to lose the reader it just convinced.
 */
export function LandingFaq() {
  return (
    <Section name="faq" id="faq" tone="surface">
      <SectionHeading eyebrow="before you ask" title={FAQ.heading} icon={SearchIcon} />
      {/*
        `multiple={false}`, not Radix's `type="single" collapsible`. The
        catalogue is base-nova, so this Accordion is Base UI: its Root takes
        `multiple` (already false by default, stated here so a default change
        cannot silently turn the FAQ into a multi-open list) and is collapsible
        inherently -- clicking an open item closes it, with no separate prop.
      */}
      <Accordion
        multiple={false}
        className="w-full border-t border-border-subtle"
      >
        {FAQ.entries.map((entry, i) => (
          <AccordionItem key={entry.question} value={`faq-${i}`}>
            <AccordionTrigger className="py-5 text-body-l text-text-primary">
              {entry.question}
            </AccordionTrigger>
            <AccordionContent className="max-w-3xl pb-5 text-body-m text-text-secondary">
              {entry.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}
