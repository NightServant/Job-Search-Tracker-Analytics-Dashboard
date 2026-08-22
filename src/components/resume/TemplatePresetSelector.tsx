import { useState } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'
import {
  getTemplatesForMode,
  type ResumeTemplate,
} from '@/services/resumeTemplateService'

interface TemplatePresetSelectorProps {
  mode: 'word' | 'latex'
  onSelect: (template: ResumeTemplate) => void
}

export function TemplatePresetSelector({ mode, onSelect }: TemplatePresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const templates = getTemplatesForMode(mode)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary inline-flex items-center gap-1.5"
        title="Load a template preset"
      >
        <Sparkles className="w-4 h-4" />
        Templates
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white">CV Templates</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Choose a template to replace your current content.
              </p>
            </div>

            <div className="space-y-2 p-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onSelect(template)
                    setIsOpen(false)
                  }}
                  className="w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 p-3 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-white text-sm">
                        {template.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-xl">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                💡 Templates replace your current content. You can undo with version history.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
