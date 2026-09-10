import { useMutation } from '@tanstack/react-query'
import { authedFetch } from '@/lib/authedFetch'
import type { PostingDigestResult } from '@/components/applications/record/digest'

/**
 * Tidies a pasted job posting and mines it for the form's fields.
 *
 * THROUGH THE ROUTE, because the model provider's key is metered and must not
 * reach the browser -- the same reason `/api/tailor` exists.
 *
 * IT ALWAYS RESOLVES TO SOMETHING USABLE. With no provider configured the
 * server still returns the deterministic formatting and an extractive
 * summary, so this is never an all-or-nothing feature; only a genuinely
 * unreachable route rejects.
 */
export function usePostingDigest() {
  return useMutation<PostingDigestResult, Error, string>({
    mutationFn: async (text) => {
      const response = await authedFetch('/api/posting/digest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const body = (await response.json()) as
        | ({ ok: true } & PostingDigestResult)
        | { ok: false; message?: string }
      if (!body.ok) throw new Error(body.message ?? 'Could not read that description.')
      return body
    },
  })
}
