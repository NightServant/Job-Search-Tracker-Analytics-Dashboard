/**
 * Whether a user id belongs to a published demo account.
 *
 * This drives affordances only — dimming write controls so the demo reads as
 * intentionally read-only. It is not the security boundary. Demo credentials
 * are published, so anyone can call the REST API directly with them; the
 * restrictive `demo_block_*` policies and `public.is_demo()` are what actually
 * refuse the write.
 */
export function isDemoUser(userId: string | null, demoUserIds: string[]): boolean {
  if (userId === null) return false
  return demoUserIds.includes(userId)
}
