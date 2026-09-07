export interface KeywordMatch {
  /** 0-100, share of the posting's terms the CV mentions. */
  score: number
  matched: string[]
  missing: string[]
}

/**
 * Words that carry no requirement, so counting them would inflate the score.
 *
 * WHY THIS GREW, on 2026-09-06. The old list was about 110 words and the
 * docblock argued for keeping it short. Measured against a real posting, that
 * produced SIXTY-THREE "requirements" from one paragraph -- among them
 * "provide", "manages", "necessary", "willing", "smoothly", "500" and "hours".
 * A CV cannot contain "smoothly", so every one of those counted as a miss and
 * dragged the score down. Gabe saw 30% on a CV that was not a 30% match.
 *
 * The old argument was the right one applied to the wrong list: the risk is
 * removing REAL terms, not having many entries. So everything below is prose
 * scaffolding -- verbs, adjectives, adverbs and generic nouns that describe how
 * a job is written rather than what it asks for.
 *
 * WHAT IS DELIBERATELY ABSENT, and must stay absent: `go`, `r`, `c`, `ai`,
 * `ml`, `ui`, `ux`, `qa`, `aws`, `sql`, `php`, `os`, `mac`. Each is a real
 * answer to "what does this job need" even though several read as ordinary
 * words. A posting that says "Go" means the language.
 */
const STOPWORDS = new Set([
  // Function words.
  'a', 'an', 'and', 'or', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'as', 'is', 'are', 'be', 'been', 'being', 'was', 'were', 'will', 'would',
  'you', 'your', 'we', 'our', 'us', 'they', 'their', 'them', 'it', 'its', 'this',
  'that', 'these', 'those', 'have', 'has', 'had', 'do', 'does', 'did', 'can',
  'could', 'should', 'may', 'might', 'must', 'shall', 'not', 'but', 'if', 'then',
  'than', 'so', 'such', 'who', 'whom', 'which', 'what', 'when', 'where', 'how',
  'why', 'all', 'any', 'both', 'each', 'more', 'most', 'other', 'others', 'some',
  'only', 'own', 'same', 'very', 'just', 'also', 'about', 'into', 'over', 'under',
  'up', 'out', 'per', 'via', 'etc', 'within', 'across', 'through', 'while',
  'during', 'before', 'after', 'between', 'upon', 'there', 'here', 'been',

  // Verbs that describe doing a job rather than a skill.
  'provide', 'provides', 'provided', 'providing', 'manage', 'manages', 'managed',
  'managing', 'assist', 'assists', 'assisted', 'assisting', 'ensure', 'ensures',
  'ensuring', 'coordinate', 'coordinates', 'coordinating', 'communicate',
  'communicates', 'communicating', 'resolve', 'resolves', 'resolving', 'attend',
  'attends', 'attending', 'perform', 'performs', 'performing', 'handle',
  'handles', 'handling', 'maintain', 'maintains', 'maintaining', 'create',
  'creates', 'creating', 'identify', 'identifies', 'identifying', 'render',
  'renders', 'arise', 'arises', 'runs', 'run', 'help', 'helps', 'helping',
  'include', 'includes', 'including', 'included', 'use', 'uses', 'used',
  'using', 'ability', 'able', 'willing', 'seeking', 'looking', 'join', 'apply',
  'welcome', 'stay', 'updated', 'expand', 'expanding', 'continue', 'continuing',

  // Adjectives and adverbs.
  'best', 'better', 'good', 'great', 'strong', 'excellent', 'proven', 'relevant',
  'related', 'necessary', 'required', 'preferred', 'desired', 'ideal', 'basic',
  'advanced', 'latest', 'fresh', 'new', 'current', 'familiar', 'knowledgeable',
  'limited', 'following', 'various', 'multiple', 'several', 'smoothly', 'quickly',
  'effectively', 'efficiently', 'successfully', 'highly', 'well', 'first',
  'second', 'third', 'daily', 'weekly', 'monthly', 'detail', 'oriented',
  'motivated', 'curious', 'similar', 'plus', 'minimum', 'maximum', 'least',

  // Generic nouns: the vocabulary of a job advert, not of a job.
  'team', 'teams', 'work', 'works', 'working', 'role', 'roles', 'job', 'jobs',
  'position', 'positions', 'experience', 'year', 'years', 'day', 'days', 'hour',
  'hours', 'week', 'weeks', 'month', 'months', 'time', 'times', 'staff',
  'process', 'processes', 'issue', 'issues', 'task', 'tasks', 'duty', 'duties',
  'responsibility', 'responsibilities', 'requirement', 'requirements',
  'qualification', 'qualifications', 'candidate', 'candidates', 'applicant',
  'applicants', 'company', 'companies', 'opportunity', 'opportunities',
  'career', 'careers', 'line', 'lines', 'level', 'levels', 'area', 'areas',
  'improvement', 'improvements', 'practice', 'practices', 'version', 'versions',
  'trend', 'trends', 'graduate', 'graduates', 'student', 'students', 'course',
  'courses', 'shifter', 'shifters', 'business', 'businesses',
])

/**
 * Whether a token can be a requirement at all.
 *
 * NUMBERS NEVER CAN. "500", "2025" and "10" are quantities in a sentence --
 * "render a minimum of 500 hours" -- and no CV contains them as a skill, so
 * every one was a guaranteed miss. Ordinals go with them.
 *
 * Anything that merely STARTS with a digit survives, because `3d` and `2fa`
 * are real answers.
 */
function isRequirementCandidate(token: string): boolean {
  if (token.length < 2) return false
  if (STOPWORDS.has(token)) return false
  if (/^\d+$/.test(token)) return false
  if (/^\d+(st|nd|rd|th)$/.test(token)) return false
  return true
}

/**
 * Splits text into comparable terms.
 *
 * Keeps `+` and `#` so c++ and c# survive, and dots so node.js does. Anything
 * one character long is dropped except a lone language name is rare enough not
 * to justify the false positives.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length > 1)
}

/**
 * Whether the CV mentions a term, allowing for a plural on either side.
 *
 * ADDITIVE ONLY: it tries the term, then the term plus `s`, then the term with
 * a trailing `s` removed. It never rewrites the canonical term, so nothing is
 * corrupted for display and nothing can be merged by accident -- the worst a
 * wrong guess does is fail to find a word that was not there anyway. A
 * transform-then-compare stemmer would have turned `kubernetes` into
 * `kubernete` and `aws` into `aw`.
 *
 * The two floors are different on purpose. ADDING an `s` is safe from three
 * characters up, which is what lets `api` find `apis`. REMOVING one is only
 * safe from four, and never from a word ending `ss` -- otherwise a posting's
 * `css` would be satisfied by a CV that merely said `cs`.
 */
function mentions(cvTokens: Set<string>, term: string): boolean {
  if (cvTokens.has(term)) return true
  if (term.length < 3) return false
  if (cvTokens.has(`${term}s`)) return true
  if (term.length < 4 || term.endsWith('ss')) return false
  return term.endsWith('s') && cvTokens.has(term.slice(0, -1))
}

/**
 * Scores a CV against a job posting.
 *
 * Terms come from the posting, not the CV: the question is what the employer
 * asked for and whether the CV answers it, not how much the CV happens to say.
 *
 * Matching is whole-token, so "Java" in a posting is not satisfied by
 * "JavaScript" in the CV — the substring match that would allow is exactly the
 * kind of false confidence this is meant to catch.
 *
 * An empty posting scores 0 rather than 100. Nothing to match against means the
 * CV is unscored, and reporting a perfect match would be a lie the user acts on.
 */
export function matchKeywords(cvText: string, jobDescription: string): KeywordMatch {
  const required = [...new Set(tokenize(jobDescription).filter(isRequirementCandidate))]
  if (required.length === 0) {
    return { score: 0, matched: [], missing: [] }
  }

  const present = new Set(tokenize(cvText))
  const matched = required.filter((t) => mentions(present, t))
  const missing = required.filter((t) => !mentions(present, t))

  return {
    score: Math.round((matched.length / required.length) * 100),
    matched,
    missing,
  }
}
