#!/usr/bin/env node
/**
 * Seeds the public demo account.
 *
 *   node --env-file=.env scripts/seed-demo.mjs
 *
 * Order matters. This signs in as the demo user and writes as that user, so RLS
 * applies exactly as it will for a visitor. That means the account must NOT yet
 * be in demo_accounts when this runs: the demo_block_* policies are restrictive
 * and would refuse every insert here.
 *
 *   1. create the demo auth user in the dashboard (auto-confirm)
 *   2. run this script
 *   3. add its id to demo_accounts, which flips the account read-only
 *
 * Re-running is safe: it clears the account's existing rows first, so the demo
 * is rebuilt rather than duplicated.
 */
import { createClient } from '@supabase/supabase-js'
import { buildDemoDataset } from './demoSeedData.mjs'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.DEMO_USER_EMAIL
const password = process.env.DEMO_USER_PASSWORD

const missing = [
  !url && 'VITE_SUPABASE_URL',
  !anonKey && 'VITE_SUPABASE_ANON_KEY',
  !email && 'DEMO_USER_EMAIL',
  !password && 'DEMO_USER_PASSWORD',
].filter(Boolean)

if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`)
  console.error('Run with: node --env-file=.env scripts/seed-demo.mjs')
  process.exit(1)
}

function addDays(iso, days) {
  const d = new Date(`${iso}T10:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}
function minusDays(iso, days) {
  const d = new Date(`${iso}T09:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString()
}

const fail = (label, error) => {
  if (error) {
    console.error(`${label}: ${error.message}`)
    process.exit(1)
  }
}

const client = createClient(url, anonKey, { auth: { persistSession: false } })

const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password })
fail('Sign-in failed', authError)
const userId = auth.user.id

const { data: isDemo } = await client.from('demo_accounts').select('user_id').eq('user_id', userId).maybeSingle()
if (isDemo) {
  console.error(
    'This account is already in demo_accounts, so RLS will refuse every write.\n' +
    'Remove it from demo_accounts, re-run this, then add it back.'
  )
  process.exit(1)
}

const data = buildDemoDataset()

// Rebuild rather than append. jobs cascades to events, activity_log,
// application_documents and application_contacts, so those go with it.
console.log('Clearing existing demo rows...')
fail('clear jobs', (await client.from('jobs').delete().eq('user_id', userId)).error)
fail('clear contacts', (await client.from('contacts').delete().eq('user_id', userId)).error)
fail('clear resumes', (await client.from('resumes').delete().eq('user_id', userId)).error)

console.log(`Inserting ${data.jobs.length} applications...`)
const { data: insertedJobs, error: jobsError } = await client
  .from('jobs')
  .insert(data.jobs.map(({ ref, ...job }) => ({ ...job, user_id: userId })))
  .select('id, company')
fail('insert jobs', jobsError)

// Map the dataset's stable refs onto the ids Postgres just generated.
const idByRef = new Map()
data.jobs.forEach((job, i) => idByRef.set(job.ref, insertedJobs[i].id))

console.log(`Inserting ${data.events.length} events...`)
fail('insert events', (await client.from('events').insert(
  data.events.map((e) => ({
    user_id: userId,
    job_id: idByRef.get(e.jobRef),
    kind: e.kind,
    title: e.title,
    starts_at: addDays(data.today, e.startsInDays),
    duration_minutes: e.duration_minutes,
  }))
)).error)

console.log(`Inserting ${data.activity.length} activity notes...`)
fail('insert activity', (await client.from('activity_log').insert(
  data.activity.map((a) => ({
    user_id: userId,
    job_id: idByRef.get(a.jobRef),
    note: a.note,
    occurred_at: minusDays(data.today, a.daysAgo),
  }))
)).error)

console.log(`Inserting ${data.contacts.length} contacts...`)
const { data: insertedContacts, error: contactsError } = await client
  .from('contacts')
  .insert(data.contacts.map(({ ref, jobRefs, ...c }) => ({ ...c, user_id: userId })))
  .select('id')
fail('insert contacts', contactsError)

const links = []
data.contacts.forEach((c, i) => {
  for (const jobRef of c.jobRefs) {
    links.push({ user_id: userId, contact_id: insertedContacts[i].id, job_id: idByRef.get(jobRef) })
  }
})
fail('link contacts', (await client.from('application_contacts').insert(links)).error)

console.log('Inserting the demo CV...')
const { data: resume, error: resumeError } = await client
  .from('resumes')
  .insert({ user_id: userId, title: data.cv.title, mode: data.cv.mode, sections: data.cv.sections })
  .select('id')
  .single()
fail('insert resume', resumeError)

fail('pin cv', (await client.from('application_documents').insert({
  user_id: userId,
  job_id: idByRef.get('stripe'),
  resume_id: resume.id,
  sent_at: data.jobs.find((j) => j.ref === 'stripe').date_applied,
})).error)

await client.auth.signOut()

console.log(`\nDone. Seeded ${data.jobs.length} applications for ${email}.`)
console.log(`Now add this user to demo_accounts to make it read-only:`)
console.log(`  insert into public.demo_accounts (user_id) values ('${userId}');`)
