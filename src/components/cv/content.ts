import type { JSONContent } from '@tiptap/core'
import type { ResumeContent } from '@/services/resumeService'

/**
 * The pure content helpers the two CV editors share: the starter documents a
 * new CV opens with, the normalizers that decide what a stored `content` blob
 * actually is, and the LaTeX preview document.
 *
 * Lifted out of `src/screens/ResumePage.tsx` unchanged when that file was
 * split into `/documents` and `/cv`. Deliberately unchanged: the LaTeX preview
 * builder in particular is a nest of escaping that is correct and very easy to
 * break, and the split was a move, not a rewrite. Both editors and the route
 * that creates drafts need these, so they live beside the editors rather than
 * inside one of them.
 */


export const DEFAULT_WORD_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Your name' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[email] · [phone] · [city] · [portfolio or GitHub]' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Summary' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[Two sentences: what you do, and the thing you are best at. Write it last.]' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Experience' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[Role] · [Company] · [Month Year – Month Year]' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[What you changed, and the number that shows it. Start with a verb.]' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[A problem you were handed, and what you did about it.]' }] }] },
    ] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Projects' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[Project] · [link]' }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[What it does, what you built it with, and who uses it.]' }] }] }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Skills' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[The tools you would be happy to be asked about in an interview.]' }] },
  ],
}

export const DEFAULT_LATEX_SOURCE = String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[ignoreheadfoot,top=1 cm,bottom=0.75 cm,left=1 cm,right=1 cm,footskip=1cm]{geometry}
\usepackage{titlesec}
\usepackage{tabularx}
\usepackage{array}
\usepackage[dvipsnames]{xcolor}
\usepackage{enumitem}
\usepackage{hyperref}
\usepackage{paracol}
\usepackage{needspace}
\usepackage{iftex}
\usepackage{multicol}
\ifPDFTeX
  \input{glyphtounicode}
  \pdfgentounicode=1
  \usepackage[T1]{fontenc}
  \usepackage[utf8]{inputenc}
  \usepackage{lmodern}
\fi
\usepackage{charter}
\raggedright
\pagestyle{empty}
\setcounter{secnumdepth}{0}
\setlength{\parindent}{0pt}
\pagenumbering{gobble}
\titleformat{\section}{\needspace{4\baselineskip}\bfseries\large}{}{0pt}{}[\vspace{1pt}\titlerule]
\begin{document}
\begin{center}
{\LARGE \textbf{Your name}}\\
[email] \textbar{} [phone] \textbar{} [city] \textbar{} [portfolio or GitHub]
\end{center}
\section{Summary}
[Two sentences: what you do, and the thing you are best at. Write it last.]
\section{Experience}
\textbf{[Role]} \hfill [Month Year -- Month Year]\\
[Company]
\begin{itemize}
  \item [What you changed, and the number that shows it. Start with a verb.]
  \item [A problem you were handed, and what you did about it.]
\end{itemize}
\section{Projects}
\textbf{[Project]} \hfill [link]
\begin{itemize}
  \item [What it does, what you built it with, and who uses it.]
\end{itemize}
\section{Skills}
[The tools you would be happy to be asked about in an interview.]
\end{document}`


export function normalizeWordContent(content: ResumeContent | null | undefined): JSONContent {
  if (content && typeof content === 'object' && (content as { type?: string }).type === 'doc') {
    return content as JSONContent
  }
  return DEFAULT_WORD_CONTENT
}


export function formatSaveTime(timestamp: string | null): string {
  if (!timestamp) return 'Not saved yet'
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? 'Not saved yet' : `Saved ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}




