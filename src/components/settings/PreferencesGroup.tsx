import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsRow } from './SettingsRow'
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
 *
 * `saving` is passed straight through as `SegmentedControl`'s own
 * `disabled` prop rather than layered on with `pointer-events-none` +
 * `aria-disabled` here. The CSS-only version looked disabled but a focused
 * option still fired `onChange` on an arrow key, since pointer-events-none
 * only blocks pointer hit-testing -- a concurrent write while the first one
 * was still in flight. `SegmentedControl` owns the real gate (its keyboard
 * handler and its buttons' native `disabled` attribute) so there is exactly
 * one place that can get this wrong.
 *
 * `Field`'s `id`/`htmlFor` is not wired to `SegmentedControl` at all --
 * `SegmentedControl` deliberately does not accept one (see its own
 * docblock for why: it was tried, and it broke each option's accessible
 * name). `Field`'s `<label>` is here purely for its visible text and its
 * `hint` paragraph; the control's real accessible name comes from
 * `aria-label` below.
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
    <Card data-settings-group="preferences">
      <CardHeader>
        <CardTitle icon="Settings">
          <h2>preferences</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* SettingsRow, not Field: this was the only settings group not using
            it, which is why it sat differently from account and danger zone.
            `wide` is the roadmap's 5.7 mobile rule -- the currency selector is
            genuinely wide, so it stacks below its label at 375px. */}
        <SettingsRow
          label="default currency"
          description="seeds the currency for every new application. existing applications keep the currency they were saved in."
          wide
          control={
            // IT SCROLLS INSIDE ITS OWN ROW BELOW 320px, rather than pushing
            // the page sideways. Six segments of a currency code come to
            // 312px, and a 320px screen has 288px between the gutters -- so
            // this was an 8px horizontal overflow on the whole settings page,
            // measured 2026-09-06. It predates the tab removal; the tabs were
            // simply hiding it half the time.
            //
            // `overflow-y-hidden` IS NOT REDUNDANT: per the CSS overflow spec
            // a `visible` value coerces to `auto` the moment the other axis
            // scrolls, which would draw a vertical scrollbar in a 36px-tall
            // control that has nothing to scroll to. Same coercion the tab
            // strip and the applications table both hit.
            <div className="max-w-full overflow-x-auto overflow-y-hidden">
            <SegmentedControl
              options={CURRENCY_OPTIONS}
              value={defaultCurrency}
              onChange={(code) => onDefaultCurrencyChange?.(code)}
              aria-label="Default currency"
              disabled={saving}
            />
            </div>
          }
        />
      </CardContent>
    </Card>
  )
}
