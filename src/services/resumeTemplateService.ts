import type { JSONContent } from '@tiptap/core'

export type ResumeTemplate = {
  id: string
  name: string
  description: string
  mode: 'word' | 'latex'
  content: JSONContent | { type: 'latex'; source: string }
}

// Word mode templates
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
          content: [{ type: 'text', text: 'Your Name' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'email@example.com | (555) 123-4567 | linkedin.com/in/yourprofile',
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
              text: 'Results-driven professional with experience in [your field]. Proven track record of [key achievement]. Seeking [position type] role to leverage [key skills].',
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
          content: [{ type: 'text', text: 'Full Name', marks: [{ type: 'bold' }] }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'City, State | email@example.com | (555) 123-4567 | portfolio.com',
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
              text: 'Dynamic professional passionate about [field]. Specialized in [area]. Driven by impact and continuous improvement.',
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
          content: [{ type: 'text', text: 'Your Full Name' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Location | +1 (555) 123-4567 | email@example.com | linkedin.com/in/profile | github.com/profile',
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
              text: 'Experienced professional with strong background in [field]. Demonstrated expertise in [key areas]. Passionate about [interest]. Looking to contribute value as [target role].',
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
          content: [{ type: 'text', text: 'Your Name' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'City, Country | email@example.com | +63 900 000 0000 | linkedin.com/in/you' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Summary' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'One or two sentences naming your role, your years of experience, and the work you want next. This is the densest place for the keywords a screener searches on.' }],
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
          content: [{ type: 'text', text: 'Your Name' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'email@example.com | +63 900 000 0000 | github.com/you' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Summary' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Recent graduate in [field] looking for a [role]. Strongest in [skill] and [skill], with project work in [domain].' }],
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
          content: [{ type: 'text', text: 'Your Name' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Software Engineer | email@example.com | github.com/you | yoursite.dev' }],
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

// LaTeX mode templates
export const LATEX_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'latex-modern',
    name: 'Modern',
    description: 'Clean and professional LaTeX CV with modern formatting',
    mode: 'latex',
    content: {
      type: 'latex',
      source: `\\documentclass[10pt,a4paper]{article}
\\usepackage[ignoreheadfoot,top=1 cm,bottom=0.75 cm,left=1 cm,right=1 cm,footskip=1cm]{geometry}
\\usepackage{titlesec}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage[dvipsnames]{xcolor}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{paracol}
\\usepackage{needspace}
\\usepackage{iftex}
\\usepackage{multicol}
\\ifPDFTeX
  \\input{glyphtounicode}
  \\pdfgentounicode=1
  \\usepackage[T1]{fontenc}
  \\usepackage[utf8]{inputenc}
  \\usepackage{lmodern}
\\fi
\\usepackage{charter}
\\raggedright
\\pagestyle{empty}
\\setcounter{secnumdepth}{0}
\\setlength{\\parindent}{0pt}
\\pagenumbering{gobble}
\\titleformat{\\section}{\\needspace{4\\baselineskip}\\bfseries\\large}{}{0pt}{}[\\vspace{1pt}\\titlerule]

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{Your Name}}\\\\
City, State $|$ (555) 123-4567 $|$ email@example.com $|$ portfolio.com
\\end{center}

\\section{Professional Summary}
Accomplished professional with expertise in [field]. Proven ability to [key achievement]. Seeking [target role] to drive [business objective].

\\section{Experience}

\\textbf{Position Title} \\hfill 2024 -- Present\\\\
Company Name
\\begin{itemize}
  \\item Accomplished [specific achievement] resulting in [measurable outcome]
  \\item Led [project/initiative] involving [scope]
  \\item Improved [process] by [percentage/metric]
\\end{itemize}

\\textbf{Previous Position} \\hfill 2022 -- 2024\\\\
Previous Company
\\begin{itemize}
  \\item Completed [project] with [result]
  \\item Managed [responsibility] across [scope]
\\end{itemize}

\\section{Skills}

\\textbf{Programming:} Languages, Frameworks\\\\
\\textbf{Tools \\& Platforms:} Tools, Services\\\\
\\textbf{Other:} Skills

\\section{Education}

\\textbf{Bachelor of Science in [Major]} \\hfill [Year]\\\\
University Name, City, State

\\end{document}`,
    },
  },
  {
    id: 'latex-compact',
    name: 'Compact',
    description: 'Space-efficient LaTeX CV for keeping it to one page',
    mode: 'latex',
    content: {
      type: 'latex',
      source: `\\documentclass[10pt,a4paper]{article}
\\usepackage[ignoreheadfoot,top=0.75cm,bottom=0.5cm,left=0.75cm,right=0.75cm,footskip=0.5cm]{geometry}
\\usepackage{titlesec}
\\usepackage[dvipsnames]{xcolor}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\ifPDFTeX
  \\input{glyphtounicode}
  \\pdfgentounicode=1
  \\usepackage[T1]{fontenc}
  \\usepackage[utf8]{inputenc}
  \\usepackage{lmodern}
\\fi
\\usepackage{charter}
\\raggedright
\\pagestyle{empty}
\\setcounter{secnumdepth}{0}
\\setlength{\\parindent}{0pt}
\\pagenumbering{gobble}
\\setlist{nolistsep}
\\titleformat{\\section}{\\bfseries\\normalsize}{}{0pt}{}[\\vspace{2pt}]

\\begin{document}

{\\Large \\textbf{Name}}\\\\
email@example.com $|$ (555) 123-4567 $|$ linkedin.com/in/profile

\\section{Experience}

\\textbf{Role} $|$ Company \\hfill Year--Present
\\begin{itemize}[itemsep=2pt]
  \\item Achievement with impact
  \\item Project contribution
\\end{itemize}

\\textbf{Previous Role} $|$ Past Company \\hfill Year--Year
\\begin{itemize}[itemsep=2pt]
  \\item Accomplishment
\\end{itemize}

\\section{Skills}
\\textbf{Tech:} Language, Framework, Tool \\quad \\textbf{Other:} Skill1, Skill2

\\section{Education}
\\textbf{Degree} in Major, University \\hfill Year

\\end{document}`,
    },
  },
  {
    id: 'latex-academic',
    name: 'Academic',
    description: 'LaTeX CV with research and publications sections',
    mode: 'latex',
    content: {
      type: 'latex',
      source: `\\documentclass[11pt,a4paper]{article}
\\usepackage[ignoreheadfoot,top=1cm,bottom=1cm,left=1cm,right=1cm]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{charter}
\\raggedright
\\pagestyle{empty}
\\setcounter{secnumdepth}{0}
\\setlength{\\parindent}{0pt}
\\titleformat{\\section}{\\bfseries\\large}{}{0pt}{}[\\vspace{0.5ex}]

\\begin{document}

{\\Large\\textbf{Your Name}}\\\\
email@example.com \\quad (555) 123-4567 \\quad City, State

\\section{Summary}
Brief academic or professional background with research interests in [field].

\\section{Education}

\\textbf{Ph.D. in [Field]} \\hfill [Year]\\\\
University Name, Advisor: Professor Name

\\textbf{Bachelor of Science in [Major]} \\hfill [Year]\\\\
University Name

\\section{Research \\& Projects}

\\textbf{Research Title}, [Lab/Institution] \\hfill [Year]\\\\
Brief description of research focus and findings.

\\textbf{Project Name} \\hfill [Year]\\\\
Key contribution and outcome.

\\section{Publications}

\\begin{enumerate}[label=[\\arabic*]]
  \\item Author, et al. \`\`Paper Title.'' \\textit{Journal Name}, Year.
\\end{enumerate}

\\section{Experience}

\\textbf{Position} \\hfill [Year]--[Year]\\\\
Organization
\\begin{itemize}
  \\item Responsibility and achievement
\\end{itemize}

\\section{Skills}

\\textbf{Research:} Methodology, Techniques\\\\
\\textbf{Technical:} Languages, Tools\\\\
\\textbf{Languages:} English, [Language]

\\end{document}`,
    },
  },
  {
    id: 'latex-ats',
    name: 'ATS-safe',
    description:
      'Plain article class, no exotic packages. Compiles anywhere and copies out as clean text.',
    mode: 'latex',
    content: {
      type: 'latex',
      source: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=2cm]{geometry}
\\usepackage[hidelinks]{hyperref}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

% Deliberately no multicol, no tikz, no custom fonts. A CV that a converter
% can turn into plain text in the right order beats one that looks better and
% comes out scrambled.

\\begin{document}

{\\LARGE\\bfseries Your Name}\\\\[2pt]
City, Country \\textbar{} email@example.com \\textbar{} +63 900 000 0000

\\section*{Summary}
One or two sentences naming your role, your years of experience, and the work
you want next.

\\section*{Skills}
Languages: \\textbar{} Frameworks: \\textbar{} Tools: \\textbar{} Databases:

\\section*{Experience}
\\textbf{Job Title}, Company --- City \\hfill Month Year -- Month Year
\\begin{itemize}
  \\item Did X, which produced Y. Lead with the outcome and name the number.
  \\item Owned Z end to end, from A to B.
\\end{itemize}

\\section*{Education}
\\textbf{Degree}, Institution \\hfill Year

\\end{document}`,
    },
  },
  {
    id: 'latex-technical',
    name: 'Technical',
    description: 'Stack table and project entries, for engineering roles.',
    mode: 'latex',
    content: {
      type: 'latex',
      source: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1.8cm]{geometry}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\titleformat{\\section}{\\large\\bfseries}{}{0pt}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{10pt}{6pt}
\\setlist[itemize]{leftmargin=*,itemsep=1pt,topsep=2pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

{\\LARGE\\bfseries Your Name}\\\\[2pt]
Software Engineer \\textbar{} email@example.com \\textbar{} github.com/you

\\section{Stack}
\\textbf{Languages} TypeScript, Python \\\\
\\textbf{Frontend} React, Next.js \\\\
\\textbf{Backend} Node, PostgreSQL \\\\
\\textbf{Infra} Docker, CI

\\section{Experience}
\\textbf{Job Title}, Company \\hfill Month Year -- Present
\\begin{itemize}
  \\item Shipped [feature] to [n] users and cut [metric] by [n] percent.
  \\item Reduced [cost or latency] from A to B by [what you changed].
  \\item Owned [system]: design, rollout, and the on-call for it.
\\end{itemize}

\\section{Selected projects}
\\textbf{Project} --- stack
\\begin{itemize}
  \\item What it does, and the one number that shows it worked.
\\end{itemize}

\\section{Education}
\\textbf{Degree}, Institution \\hfill Year

\\end{document}`,
    },
  },
]

/**
 * Get all available templates for a mode
 */
export function getTemplatesForMode(mode: 'word' | 'latex'): ResumeTemplate[] {
  return mode === 'latex' ? LATEX_TEMPLATES : WORD_TEMPLATES
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(templateId: string): ResumeTemplate | undefined {
  const allTemplates = [...WORD_TEMPLATES, ...LATEX_TEMPLATES]
  return allTemplates.find((t) => t.id === templateId)
}
