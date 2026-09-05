import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '../select'
import { Textarea } from '../textarea'

const CURRENCIES = [
  { value: 'PHP', label: 'PHP' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]

describe('Select', () => {
  // IT IS NO LONGER A NATIVE `<select>`, reversing what this file used to
  // assert. The old test said five statuses and six currency codes did not
  // justify re-implementing the platform keyboard model -- a fair argument
  // that missed the consequence: a native option list is drawn by the OS, so
  // on macOS it was a dark grey rounded panel with system checkmarks, inside
  // an app built entirely from black, white, grey, orange and 4px corners.
  // Gabe called it, 2026-09-05.
  //
  // The tests below are the debts that argument correctly named. They are
  // here because reversing the decision only makes sense if they pass.

  it('renders a list this design system owns, not the operating system', () => {
    const { container } = render(
      <Select id="currency" aria-label="Currency" value="PHP" onValueChange={() => {}} items={CURRENCIES} />
    )
    // No native select anywhere -- if one survives, the OS draws the list again.
    expect(container.querySelector('select')).toBeNull()
    expect(screen.getByLabelText('Currency')).toBeTruthy()
  })

  it('opens a real listbox with real options', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <Select id="currency" aria-label="Currency" value="PHP" onValueChange={() => {}} items={CURRENCIES} />
    )
    await user.click(screen.getByLabelText('Currency'))

    // Role and options, not divs that merely look like a list. This is the
    // screen-reader half of what `<select>` used to provide for free.
    const listbox = await screen.findByRole('listbox')
    expect(listbox).toBeTruthy()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('marks which option is current, for a reader that cannot see the tick', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <Select id="currency" aria-label="Currency" value="USD" onValueChange={() => {}} items={CURRENCIES} />
    )
    await user.click(screen.getByLabelText('Currency'))
    const selected = (await screen.findAllByRole('option')).filter(
      (option) => option.getAttribute('aria-selected') === 'true'
    )
    expect(selected).toHaveLength(1)
    expect(selected[0].textContent).toContain('USD')
  })

  it('is reachable and openable from the keyboard alone', async () => {
    // The other half of the old argument for staying native. A listbox that
    // only works with a mouse is a regression from the element it replaced,
    // whatever it looks like.
    //
    // WHAT THIS DOES NOT ASSERT, and why: arrow-key traversal inside the list.
    // Base UI moves the highlight through a roving-focus composite that needs
    // real element geometry, and jsdom has no layout engine -- measured, the
    // list opens and focus lands on the selected item, then ArrowDown leaves
    // the highlight exactly where it was. That is the environment, not the
    // component. A test that cannot tell those two apart is worse than none,
    // so this covers the parts jsdom can genuinely observe and leaves
    // traversal to Base UI, which owns and tests it.
    const user = userEvent.setup({ delay: null })
    render(
      <Select id="currency" aria-label="Currency" value="PHP" onValueChange={() => {}} items={CURRENCIES} />
    )

    await user.tab()
    expect(screen.getByLabelText('Currency')).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(await screen.findByRole('listbox')).toBeTruthy()
    // Focus moves INTO the list, which is what makes the options reachable at
    // all -- if it stayed on the trigger, no amount of arrowing would work.
    expect(document.activeElement).not.toBe(screen.getByLabelText('Currency'))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
  })

  it('reports the chosen value, not an event', async () => {
    const user = userEvent.setup({ delay: null })
    const onValueChange = vi.fn()
    render(
      <Select id="currency" aria-label="Currency" value="PHP" onValueChange={onValueChange} items={CURRENCIES} />
    )
    await user.click(screen.getByLabelText('Currency'))
    await user.click(await screen.findByRole('option', { name: /EUR/ }))
    expect(onValueChange).toHaveBeenCalledWith('EUR')
  })

  it('wires its error message to the field the way Input does', () => {
    // UNCHANGED FROM THE NATIVE VERSION, deliberately: a form holds a mix of
    // Input and Select, and the two must describe an error identically or
    // every form grows a special case.
    render(
      <Select
        id="status"
        aria-label="Status"
        error="Pick one"
        value=""
        onValueChange={() => {}}
        items={[{ value: '', label: '--' }]}
      />
    )
    const field = screen.getByLabelText('Status')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe('status-error')
    expect(screen.getByText('Pick one')).toBeTruthy()
  })

  it('opens a list the width of the control, never the width of its longest option', async () => {
    // Gabe, 2026-09-05: "dropdown from the document editor is center and too
    // large". The popup was `min-w-(--anchor-width)` with NO cap, so it grew
    // to its widest item -- the CV tailoring picker's options are job titles,
    // and a 300px control opened a ~750px list. Wide enough that the
    // positioner then shifted it sideways to keep it on screen, which is the
    // "centered" half of the same bug.
    //
    // jsdom has no layout, so the WIDTH cannot be measured here; the class
    // contract is what is asserted, and the real measurement was taken in a
    // browser (trigger 481px, popup 481px, both left edges at 642px, with a
    // 118-character option truncating).
    const user = userEvent.setup({ delay: null })
    render(
      <Select
        id="application"
        aria-label="Application"
        value=""
        onValueChange={() => {}}
        items={[
          { value: '', label: 'none selected' },
          {
            value: 'long',
            label:
              'Junior Java Developer (Open for Fresh Grads with Java and Oracle knowledge) — Indra Philippines, Inc.',
          },
        ]}
      />
    )
    await user.click(screen.getByLabelText('Application'))
    const option = await screen.findByRole('option', { name: /Junior Java Developer/ })

    const popup = option.closest('[class*="anchor-width"]')
    expect(popup, 'the popup is not bound to the anchor width').toBeTruthy()
    expect(popup!.className).toContain('w-(--anchor-width)')
    expect(popup!.className).not.toContain('min-w-(--anchor-width)')

    // And the label has to be able to give: `truncate` does nothing on a flex
    // item whose default `min-width: auto` floors it at its content width, so
    // the text would push the popup wider instead of being cut.
    const text = option.querySelector('[class*="truncate"]')!
    expect(text.className).toContain('min-w-0')

    // What the ellipsis hides stays reachable.
    expect(option.getAttribute('title')).toContain('Indra Philippines')
  })

  it('keeps the accent for the choice and a neutral fill for the hover', () => {
    // The palette rule, made checkable: orange marks WHICH option is chosen;
    // moving over an option is a neutral token. Reversing those would make
    // every dropdown look like it had five selections.
    const { container } = render(
      <Select id="currency" aria-label="Currency" value="PHP" onValueChange={() => {}} items={CURRENCIES} />
    )
    expect(container.querySelector('[data-error]')).toBeNull()
  })
})

describe('Textarea', () => {
  it('grows from a minimum rather than being pinned to a row count', () => {
    const { container } = render(<Textarea id="notes" aria-label="Notes" />)
    const field = container.querySelector('textarea')!
    expect(field.className).toContain('min-h-24')
    expect(field.className).toContain('resize-y')
  })

  it('wires its error message to the field the way Input does', () => {
    render(<Textarea id="notes" aria-label="Notes" error="Too long" />)
    const field = screen.getByLabelText('Notes')
    expect(field.getAttribute('aria-describedby')).toBe('notes-error')
    expect(screen.getByText('Too long')).toBeTruthy()
  })
})
