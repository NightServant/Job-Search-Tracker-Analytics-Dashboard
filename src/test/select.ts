import { expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/**
 * Driving `ui/select` from a test.
 *
 * The component stopped being a native `<select>` on 2026-09-05, because the
 * operating system drew that element's option list and no CSS reached it. Six
 * tests broke on the change -- not because the behaviour changed, but because
 * they reached for `userEvent.selectOptions` and `toHaveValue`, neither of
 * which means anything to a button-plus-listbox.
 *
 * These helpers exist so those tests express the same INTENT ("choose USD",
 * "it is showing PHP") instead of each growing its own click-open-then-click
 * dance. One place to update if the control changes again.
 */

/** The label the closed control is currently showing. */
export function selectedLabel(trigger: HTMLElement): string {
  return trigger.textContent?.trim() ?? ''
}

/**
 * Open a select and pick an option by its visible text.
 *
 * `findByRole` rather than `getByRole` for the option: the list is portalled
 * and mounts asynchronously, so a synchronous query races it.
 */
export async function chooseOption(
  user: UserEvent,
  trigger: HTMLElement,
  optionName: string | RegExp
): Promise<void> {
  await user.click(trigger)
  const listbox = await screen.findByRole('listbox')
  await user.click(await within(listbox).findByRole('option', { name: optionName }))
  // The list closing is what tells the caller the choice landed; asserting on
  // state before it does is how these tests would go flaky.
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
}

/** Every option a select offers, in order, without choosing one. */
export async function openOptions(user: UserEvent, trigger: HTMLElement): Promise<string[]> {
  await user.click(trigger)
  const listbox = await screen.findByRole('listbox')
  return within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent?.trim() ?? '')
}
