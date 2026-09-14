import type { JSONContent } from '@tiptap/core'
import type { ResumeMode } from './resumeService'

/**
 * The documents a new draft can start from.
 *
 * THE LATEX HALF IS GONE. `LATEX_TEMPLATES` and the `{ type: 'latex'; source }`
 * content variant were deleted on 2026-09-14: the LaTeX editor was dropped on
 * 2026-09-13 and nothing had imported either since. Keeping a union member
 * whose only reader had been deleted meant every consumer still had to narrow
 * `content` before it could touch a tiptap tree, for a branch that could not
 * occur. `content` is a `JSONContent` now, full stop.
 *
 * `mode` IS THE DOCUMENT'S KIND, not its engine -- see `ResumeMode` in
 * resumeService.ts, which this reuses rather than restating so the two cannot
 * drift. A template's mode is what the row it creates gets written with, which
 * is exactly what the gallery needs to hand back.
 *
 * THE COPY IN THESE TREES IS NOT WHAT THE USER ENDS UP WITH. Text nodes carry
 * `{{token|fallback}}` markers that `personalizeTemplate` (templatePersonalization.ts)
 * substitutes from the stored LinkedIn profile before a draft is created.
 * Anything that writes a template's `content` straight to the database without
 * going through that function ships raw `{{name|Your Name}}` to a person.
 */
export type ResumeTemplate = {
  id: string
  name: string
  description: string
  mode: ResumeMode
  content: JSONContent
}

// CV templates
export const WORD_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'word-classic',
    name: 'Classic',
    description: 'Traditional CV with clear sections and formatting',
    mode: 'word',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{{name|Your Name}}' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{email|email@example.com}} | {{phone|(555) 123-4567}} | {{linkedin|linkedin.com/in/yourprofile}}',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Professional Summary' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{summary|Results-driven professional with experience in [your field]. Proven track record of [key achievement]. Seeking [position type] role to leverage [key skills].}}',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Professional Experience' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Job Title | Company Name', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'Month Year – Present' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Achievement with quantifiable results' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Leadership or project accomplishment' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Process improvement or innovation' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Skills' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Languages: | Frameworks: | Databases: | Tools & Platforms:',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Education' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bachelor of Science in [Major]', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'University Name | Graduation Year' },
          ],
        },
      ],
    },
  },
  {
    id: 'word-modern',
    name: 'Modern',
    description: 'Minimalist design with clean typography and spacing',
    mode: 'word',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{{name|Full Name}}', marks: [{ type: 'bold' }] }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{location|City, State}} | {{email|email@example.com}} | {{phone|(555) 123-4567}} | {{website|portfolio.com}}',
              marks: [{ type: 'italic' }],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'About' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{summary|Dynamic professional passionate about [field]. Specialized in [area]. Driven by impact and continuous improvement.}}',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Experience' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Role | Company', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'Start Date – Present' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Led initiative resulting in measurable improvement' },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Collaborated with cross-functional teams' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Tech Skills' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Frontend: | Backend: | DevOps: | Other:',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Education' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Degree, Major', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'School Name | Year' },
          ],
        },
      ],
    },
  },
  {
    id: 'word-detailed',
    name: 'Detailed',
    description: 'Comprehensive layout with additional sections for projects and certifications',
    mode: 'word',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{{name|Your Full Name}}' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{location|Location}} | {{phone|+1 (555) 123-4567}} | {{email|email@example.com}} | {{linkedin|linkedin.com/in/profile}} | {{website|github.com/profile}}',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Executive Summary' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '{{summary|Experienced professional with strong background in [field]. Demonstrated expertise in [key areas]. Passionate about [interest]. Looking to contribute value as [target role].}}',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Core Competencies' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Competency 1' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Competency 2' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Competency 3' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Competency 4' }] }],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Professional Experience' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Senior Title | Company Name', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'Month Year – Present | City, State' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Impact-driven accomplishment with metrics' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Team leadership and mentorship' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Notable Projects' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Project Name', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Brief description of project scope and outcome' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Certifications' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Certification Name | Issuing Organization | Year' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Education' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Master of Science in [Field]', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'University Name | Graduation Year' },
          ],
        },
      ],
    },
  },
  {
    id: 'word-ats',
    name: 'ATS-safe',
    description:
      'One column, standard section names, no tables. The layout parsers read most reliably.',
    mode: 'word',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{{name|Your Name}}' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '{{location|City, Country}} | {{email|email@example.com}} | {{phone|+63 900 000 0000}} | {{linkedin|linkedin.com/in/you}}' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Summary' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '{{summary|One or two sentences naming your role, your years of experience, and the work you want next. This is the densest place for the keywords a screener searches on.}}' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Skills' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Languages: | Frameworks: | Tools: | Databases:' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Experience' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Job Title, Company - City (Month Year - Month Year)' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Did X, which produced Y. Lead with the outcome and name the number.' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Owned Z end to end, from A to B.' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Education' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Degree, Institution - City (Year)' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Keep every heading on its own line, and avoid columns, text boxes and tables: those are the three things that most often make a parser read a CV out of order.' }],
        },
      ],
    },
  },
  {
    id: 'word-entry',
    name: 'Entry level',
    description:
      'Education and projects first, for a first job or a career change.',
    mode: 'word',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{{name|Your Name}}' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '{{email|email@example.com}} | {{phone|+63 900 000 0000}} | {{website|github.com/you}}' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Summary' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '{{summary|Recent graduate in [field] looking for a [role]. Strongest in [skill] and [skill], with project work in [domain].}}' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Education' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Degree, Institution - City (Year - Year)' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Relevant coursework: | Thesis: | Honours:' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Projects' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Project Name - one line on what it does and who it is for' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Built with [stack]. Say what you personally wrote.' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Name the result: users, load handled, time saved, grade.' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Experience' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Internship or part-time role, Company (Month Year - Month Year). Include coursework-adjacent work; a screener reads it as evidence you have shipped something.' }],
        },
      ],
    },
  },
  {
    id: 'word-technical',
    name: 'Technical',
    description:
      'Stack up front, projects with impact bullets. For engineering roles.',
    mode: 'word',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{{name|Your Name}}' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '{{headline|Software Engineer}} | {{email|email@example.com}} | {{website|github.com/you}} | {{linkedin|linkedin.com/in/you}}' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Stack' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Languages: TypeScript, Python | Frontend: React, Next.js | Backend: Node, PostgreSQL | Infra: Docker, CI' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Experience' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Job Title, Company (Month Year - Present)' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Shipped [feature] to [n] users and cut [metric] by [n] percent.' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Reduced [cost or latency] from A to B by [what you changed].' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Owned [system]: design, rollout, and the on-call for it.' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Selected projects' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Project - stack - what it does, and the one number that shows it worked' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Education' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Degree, Institution (Year)' }],
        },
      ],
    },
  },
]

/**
 * COVER LETTERS, WHICH ARE NOT CV VARIANTS.
 *
 * A CV is a structured record and a letter is a letter: sender block, date,
 * recipient block, salutation, three or four paragraphs, sign-off. The first
 * draft of these reused the CV shape with the sections renamed, and it read
 * like a form -- so they are written as correspondence instead, and the five
 * differ in REGISTER and STRUCTURE rather than in typography. A concise letter
 * has no address block at all; a referral letter spends its first sentence on
 * the person who made the introduction; a speculative one has to explain why it
 * exists before it can ask for anything.
 *
 * THE SQUARE BRACKETS ARE DELIBERATE AND ARE NOT `{{tokens}}`. `[Company]` and
 * `[the result, with a number]` are the things only the writer knows, and no
 * profile can fill them; they are prompts, matching the CV templates above and
 * visible enough that nobody sends the letter without reading it. `{{tokens}}`
 * are the things the profile DOES know, and they are gone by the time a draft
 * is created.
 *
 * WHY THEY ARE PROSE AND NOT SCAFFOLDING. Whatever ships here is the first
 * thing a user reads, and a cover letter template that says "Paragraph 2:
 * evidence" gets deleted rather than edited. These can be sent after filling
 * the brackets, which is the bar.
 */
export const COVER_LETTER_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'cover-standard',
    name: 'Standard',
    description: 'Formal block layout with sender, date and recipient. The default for an advertised role.',
    mode: 'cover_letter',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '{{name|Your Name}}', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: '{{location|City, Country}}' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{email|email@example.com}} | {{phone|+63 900 000 0000}}' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{linkedin|linkedin.com/in/you}}' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '{{today}}' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hiring Manager' },
            { type: 'hardBreak' },
            { type: 'text', text: '[Company Name]' },
            { type: 'hardBreak' },
            { type: 'text', text: '[Company address, or the city they hire into]' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dear [name, if the posting or the company page gives one, otherwise Hiring Manager],' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The [role] advertised on [where you found it] describes the work I already do rather than the work I would like to move into. I have spent the past [number] years in {{industry|[your field]}}, and the responsibilities [Company] lists are the ones I am accountable for now.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'In my current role as {{headline|[your job title]}} at [current employer], I own [the thing you are responsible for end to end]. The clearest result of that was [the outcome, with the number attached]. Before that I [the earlier work that is relevant here], which is where I learned [the skill the advert names first].',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '[Company] interests me specifically because [a reason a reader can check: a product you use, a problem you have followed, something the team has written]. I would rather do this work somewhere the outcome matters to me, and from the outside that appears to be the case here.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'My CV is attached. I would welcome the chance to talk about the role and can make myself available at short notice. Thank you for your time and for considering my application.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Yours sincerely,' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{name|Your Name}}' },
          ],
        },
      ],
    },
  },
  {
    id: 'cover-concise',
    name: 'Concise',
    description: 'Three short paragraphs, no address block. For a fast process or an online form.',
    mode: 'cover_letter',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '{{name|Your Name}}', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            {
              type: 'text',
              text: '{{email|email@example.com}} | {{phone|+63 900 000 0000}} | {{linkedin|linkedin.com/in/you}}',
            },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '{{today}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dear [name, if you have it, otherwise Hiring Manager],' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The three things your [role] advert leads with are three things I do most weeks. I have [number] years in {{industry|[your field]}}, all of it on the kind of work [Company] is hiring for, and I would rather point at one piece of it than describe all of it.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The clearest example: at [employer] I [what you built, fixed or ran], which [the result, with a number]. I am happy to walk through how it worked, and what I would do differently a second time.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'My CV is attached and has the rest of it: [the other thing worth a line, in six words]. The short version is that this is the job I would pick out of the ones I am looking at, and I can talk whenever suits you.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Best regards,' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{name|Your Name}}' },
          ],
        },
      ],
    },
  },
  {
    id: 'cover-career-change',
    name: 'Career change',
    description: 'Names the move in the first line, then spends the letter on transferable evidence.',
    mode: 'cover_letter',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '{{name|Your Name}}', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: '{{location|City, Country}}' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{email|email@example.com}} | {{phone|+63 900 000 0000}}' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '{{today}}' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hiring Manager' },
            { type: 'hardBreak' },
            { type: 'text', text: '[Company Name]' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dear [name, if the posting or the company page gives one, otherwise Hiring Manager],' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I am coming to the [role] at [Company] from {{industry|[the field you are leaving]}}, and I would rather say that in the first line than leave you to work it out from the dates on my CV. What carries over is [the skill the two fields share], and I have been doing it for [number] years.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The move is smaller than it looks. [Name the overlap concretely: the same users, the same tooling, the same regulatory constraint, the same kind of problem.] At [current employer] I [the part of your current job that is already this job], and [what it produced]. That is the half of the role I would not be learning.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I have closed the rest of the gap on purpose rather than by hoping: [the course, qualification, shipped project or contribution], which [what it produced, or where it can be seen]. It is not [number] years of experience and I am not going to claim it is, but it is evidence rather than intention.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'What I bring that a straight-line candidate may not is [the perspective the old field gives you, stated as something useful to this team]. My CV is attached, and I would be glad to talk it through.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Yours sincerely,' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{name|Your Name}}' },
          ],
        },
      ],
    },
  },
  {
    id: 'cover-referral',
    name: 'Referral',
    description: 'Opens by naming who referred you, then gets out of their debt quickly.',
    mode: 'cover_letter',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '{{name|Your Name}}', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: '{{email|email@example.com}} | {{phone|+63 900 000 0000}}' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '{{today}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dear [hiring manager name],' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '[Referrer full name] suggested I write to you about the [role] at [Company]. We worked together at [where] for [how long], and they thought my background was close enough to what you are looking for to be worth an introduction.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The short version: I am {{headline|[your job title]}} with [number] years in {{industry|[your field]}}. Most recently, at [employer], I [what you did], which [the result]. My CV has the rest of it.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '[Referrer first name] can speak to [the specific thing they actually saw you do], which is the part I would rather have vouched for than described by me. Beyond that I would prefer the work to stand on its own: an introduction gets a letter read, and it should not be asked to do more than that. My CV is attached, and I would be glad to talk it through whenever suits you.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I am happy to join your process at whatever point makes sense, and to talk whenever it is convenient. Thank you for reading.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Yours sincerely,' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{name|Your Name}}' },
          ],
        },
      ],
    },
  },
  {
    id: 'cover-speculative',
    name: 'Speculative',
    description: 'Cold outreach with no advertised role. Explains why it exists before it asks for anything.',
    mode: 'cover_letter',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '{{name|Your Name}}', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: '{{location|City, Country}}' },
            { type: 'hardBreak' },
            {
              type: 'text',
              text: '{{email|email@example.com}} | {{website|yoursite.dev}} | {{linkedin|linkedin.com/in/you}}',
            },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '{{today}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dear [name, or the team you are writing to],' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '[Company] is working on [the specific thing you have actually noticed], and I would like to work on it too. There is no advert in front of me — I am writing because of that, not in spite of it, and if nothing is open I would still rather be on your list than not on it.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I am {{headline|[your job title]}}, based in {{location|[your city]}}, with [number] years in {{industry|[your field]}}. What I am best at is [the narrow thing, not the broad one], which I suspect matters to you because [the reason you can point at from the outside].',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'One example rather than a summary: at [employer] I [what you built or fixed], and [what changed as a result]. [Where it can be seen, if any of it is public.]',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'If there is nothing now, I would be glad to be kept in mind for later, and happy to have a short conversation whenever one is useful. My CV is attached either way.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Kind regards,' },
            { type: 'hardBreak' },
            { type: 'text', text: '{{name|Your Name}}' },
          ],
        },
      ],
    },
  },
]

/**
 * The templates that start a document of this kind.
 *
 * Kept (rather than deleted with the LaTeX half) because the Documents gallery
 * now has two sets to choose between and needs one place that knows which is
 * which -- the alternative is every caller writing the same ternary over two
 * imported arrays.
 */
export function getTemplatesForMode(mode: ResumeMode): ResumeTemplate[] {
  return mode === 'cover_letter' ? COVER_LETTER_TEMPLATES : WORD_TEMPLATES
}

/** One template by id, across both sets. Ids are unique across the two. */
export function getTemplateById(templateId: string): ResumeTemplate | undefined {
  return [...WORD_TEMPLATES, ...COVER_LETTER_TEMPLATES].find((t) => t.id === templateId)
}
