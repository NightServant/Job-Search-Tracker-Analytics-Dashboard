'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon } from '@/components/icons'
import { getTemplatesForMode, type ResumeTemplate } from '@/services/resumeTemplateService'

/**
 * Starter documents for whichever editor is open.
 *
 * Moved out of `src/components/resume/` with the editors that render it, and
 * kept rather than deleted for the same reason `ResumeVersionHistory` was.
 * Behaviour is unchanged; the chrome is M4. `Sparkles` was one of the four
 * glyphs the icon set deliberately eliminated, so the trigger is text.
 */
interface TemplatePresetSelectorProps {
  mode: 'word' | 'latex'
  onSelect: (template: ResumeTemplate) => void
}

export function TemplatePresetSelector({ mode, onSelect }: TemplatePresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const templates = getTemplatesForMode(mode)

  return (
    <div className="relative inline-block">
      <Button
        variant="secondary"
        size="s"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        templates
        <ChevronDownIcon size={14} aria-hidden className={isOpen ? 'rotate-180' : undefined} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-md border border-border-default bg-bg-canvas">
            <div className="border-b border-border-subtle p-4">
              <h3 className="text-heading-s text-text-primary">CV templates</h3>
              <p className="mt-1 text-body-s text-text-muted">
                A template replaces the current content. Version history can undo it.
              </p>
            </div>

            <div className="p-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onSelect(template)
                    setIsOpen(false)
                  }}
                  className="w-full rounded-md p-2 text-left transition-colors duration-[--duration-fast] hover:bg-bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
                >
                  <p className="text-body-m text-text-primary">{template.name}</p>
                  <p className="text-body-s text-text-muted">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
