/**
 * Two letters standing in for a name, when there is no photo.
 *
 * ITS OWN MODULE FOR THE REASON `button-variants.ts` AND `progress-tones.ts`
 * ARE: `react-refresh/only-export-components` warns when a file exports both
 * components and plain functions, and this one is shared by `OrgTile` (a
 * letter for an organisation) and `Identity` (initials for a person). Keeping
 * one copy in a module neither of them owns is what stops the two drifting the
 * first time somebody decides three letters read better than two.
 */
export function initialsOf(name: string | null): string {
  const parts = (name ?? '').split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}
