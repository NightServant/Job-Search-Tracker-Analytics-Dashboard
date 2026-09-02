'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FAQ } from './content'

/**
 * Section 5. Exactly five questions, `type="single"` and `collapsible`.
 *
 * Five because Gabe specified five, and the discipline is that a sixth
 * question means one of the five was not worth asking. Landing.test.tsx
 * asserts the count, so a sixth is a red test rather than a quiet drift.
 *
 * The answers were checked against the code before they were written: the CSV
 * claim is buildJobsCsvText in src/lib/jobCsv.ts wired into ApplicationsPage,
 * and the deletion claim is delete_own_account, called from Settings. A FAQ
 * that oversells is the fastest way to lose the reader it just convinced.
 */
export function LandingFaq() {
  return (
    <section
      id="faq"
      data-landing-section="faq"
      className="px-5 py-20 md:px-16"
    >
      <h2 className="mb-10 text-heading-l text-text-primary">{FAQ.heading}</h2>
      {/*
        `multiple={false}`, not Radix's `type="single" collapsible`. The
        catalogue is base-nova, so this Accordion is Base UI: its Root takes
        `multiple` (already false by default, stated here so a default change
        cannot silently turn the FAQ into a multi-open list) and is collapsible
        inherently -- clicking an open item closes it, with no separate prop.
      */}
      <Accordion multiple={false} className="max-w-3xl">
        {FAQ.entries.map((entry, i) => (
          <AccordionItem key={entry.question} value={`faq-${i}`}>
            <AccordionTrigger className="text-body-m">{entry.question}</AccordionTrigger>
            <AccordionContent className="text-body-s text-text-secondary">
              {entry.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
