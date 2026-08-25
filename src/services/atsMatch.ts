export interface KeywordMatch {
  /** 0-100, share of the posting's terms the CV mentions. */
  score: number
  matched: string[]
  missing: string[]
}

/**
 * Words that carry no requirement, so counting them would inflate the score.
 *
 * Deliberately short: an aggressive list starts removing real terms, and a
 * posting that says "Go" or "R" means the language.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'as', 'is', 'are', 'be', 'been', 'being', 'was', 'were', 'will', 'would',
  'you', 'your', 'we', 'our', 'us', 'they', 'their', 'it', 'its', 'this', 'that',
  'these', 'those', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could',
  'should', 'may', 'might', 'must', 'shall', 'not', 'but', 'if', 'then', 'than',
  'so', 'such', 'who', 'whom', 'which', 'what', 'when', 'where', 'how', 'why',
  'all', 'any', 'both', 'each', 'more', 'most', 'other', 'some', 'only', 'own',
  'same', 'very', 'just', 'also', 'about', 'into', 'over', 'under', 'up', 'out',
  'team', 'work', 'working', 'role', 'experience', 'years', 'strong', 'good',
])

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
  const required = [...new Set(tokenize(jobDescription).filter((t) => !STOPWORDS.has(t)))]
  if (required.length === 0) {
    return { score: 0, matched: [], missing: [] }
  }

  const present = new Set(tokenize(cvText))
  const matched = required.filter((t) => present.has(t))
  const missing = required.filter((t) => !present.has(t))

  return {
    score: Math.round((matched.length / required.length) * 100),
    matched,
    missing,
  }
}
