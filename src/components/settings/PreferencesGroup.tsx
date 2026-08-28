import { PanelSection } from '@/components/ui/panel-section'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/services/userPreferences'

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))

/**
 * One row: default currency, a six-segment ARIA radiogroup over
 * `SUPPORTED_CURRENCIES` -- the same six codes `jobs_salary_currency_check`
 * and `ApplicationForm`'s currency `Select` already agree on. `Field` gives
 * it the label-above-control shape the currency `Select` already uses in
 * `ApplicationForm`, so "how a currency picker is introduced" stays one
 * vocabulary across the app rather than forking for the one screen that
 * shows it as a row of segments instead of a dropdown.
 */
export interface PreferencesGroupProps {
  defaultCurrency: SupportedCurrency
  onDefaultCurrencyChange?: (code: SupportedCurrency) => void
  saving?: boolean
}

export function PreferencesGroup({
  defaultCurrency,
  onDefaultCurrencyChange,
  saving = false,
}: PreferencesGroupProps) {
  return (
    <div data-settings-group="preferences">
      <PanelSection title="Preferences" titleSize="m">
        <Field
          id="default-currency"
          label="Default currency"
          hint="Seeds the currency for every new application. Existing applications keep the currency they were saved in."
        >
          <SegmentedControl
            id="default-currency"
            options={CURRENCY_OPTIONS}
            value={defaultCurrency}
            onChange={(code) => onDefaultCurrencyChange?.(code)}
            aria-label="Default currency"
            aria-disabled={saving || undefined}
            className={saving ? 'pointer-events-none opacity-50' : undefined}
          />
        </Field>
      </PanelSection>
    </div>
  )
}
