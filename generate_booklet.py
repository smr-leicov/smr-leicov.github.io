#!/usr/bin/env python3
"""Regenerate TitlesAbstractSMRLEICOV.tex (and optionally the PDF) from program.json.

program.json is the single source of truth for speaker names, affiliations,
emails, talk titles and abstracts (used to render the website). This script
turns that same data into the LaTeX abstract booklet, so the two never drift
apart by hand-editing one and forgetting the other.

Usage:
    python generate_booklet.py            # writes TitlesAbstractSMRLEICOV.tex
    python generate_booklet.py --pdf      # also compiles it to SMR-LEICOV_abstracts.pdf (needs pdflatex)
"""
import json
import re
import subprocess
import sys
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent
PROGRAM_JSON = ROOT / "program.json"
TEX_OUT = ROOT / "TitlesAbstractSMRLEICOV.tex"
PDF_OUT = ROOT / "SMR-LEICOV_abstracts.pdf"

MATH_SPLIT_RE = re.compile(r"(\$\$.*?\$\$|\$[^$]*\$)", re.DOTALL)

TEX_ESCAPES = [
    ("\\", r"\textbackslash{}"),
    ("&", r"\&"),
    ("%", r"\%"),
    ("#", r"\#"),
    ("_", r"\_"),
    ("{", r"\{"),
    ("}", r"\}"),
    ("~", r"\textasciitilde{}"),
    ("^", r"\textasciicircum{}"),
]


def escape_tex(text):
    """Escape LaTeX special characters, but leave $...$ / $$...$$ math untouched."""
    parts = MATH_SPLIT_RE.split(text)
    out = []
    for part in parts:
        if part.startswith("$"):
            out.append(part)
            continue
        for char, repl in TEX_ESCAPES:
            part = part.replace(char, repl)
        out.append(part)
    return "".join(out)


PREAMBLE = r"""\documentclass[a4paper,11pt]{article}

\usepackage{latexsym}
\usepackage{amssymb}
\usepackage{amsthm}
\usepackage{amsmath}
\usepackage{amsrefs}
\usepackage[colorlinks=true,urlcolor=blue,citecolor=blue,linkcolor=blue,linktocpage,pdfpagelabels,bookmarksnumbered,bookmarksopen]{hyperref}
\usepackage{indentfirst}
\usepackage{moreverb}
\usepackage{url}
\pagestyle{myheadings}

\begin{document}


\begin{center}\LARGE\bf
	SMR: LEICOV. Shapes, Materials and Regularity: Lecce Encounters In Calculus Of Variations

\end{center}

\

\begin{center}
	{\bf\large Organizers:}
	Paolo Acampora (Universit\`a del Molise),
	Alessandro Carbotti, Simone Cito, Luigi Negro and Francesco Solombrino (Universit\`a del Salento)
\end{center}

\

\noindent
SMR:LEICOV is a series of three meetings to bring together young researchers and experts in the field of Calculus of Variations and Partial Differential Equations. We want to give value to the intersections between shape optimization, materials science and regularity theory.

\

{\bf List of confirmed speakers (%(count)d)}

\begin{enumerate}
%(speaker_list)s\end{enumerate}

\vspace{0.2 cm}

\textbf{See next pages for titles and abstracts}

\bigskip

\section*{\centering Titles and Abstracts}

\noindent\rule{\textwidth}{0.4pt}
"""


def build_speaker_list_item(speaker):
    name = escape_tex(speaker["name"])
    affiliation = escape_tex(speaker["affiliation"])
    return f"\t\\item {name}, {affiliation}\n"


def build_speaker_section(speaker, first):
    title = escape_tex(speaker.get("title") or "Title to be announced")
    name = escape_tex(speaker["name"])
    affiliation = escape_tex(speaker["affiliation"])
    email = speaker.get("email")

    lines = []
    if not first:
        lines.append("\\newpage\n")
        lines.append("\\noindent\\rule{\\textwidth}{0.4pt}\n")
    lines.append("\\begin{center}")
    lines.append(f"\\subsection*{{{title}}}")
    lines.append("")
    lines.append(f"\\textbf{{{name}}} \\\\")
    lines.append(f"\\textit{{{affiliation}}} \\\\")
    if email:
        lines.append(f"\\url{{{email}}}")
    lines.append("\\")
    lines.append("\\end{center}")
    lines.append("\\medskip")

    # Accept either a list of paragraphs or a single string (a common hand-edit slip).
    abstract = speaker.get("abstract")
    if isinstance(abstract, str):
        abstract = [abstract]
    if abstract:
        lines.append("\n\n".join(escape_tex(p) for p in abstract))
    else:
        lines.append("Abstract to be announced.")

    if speaker.get("joint"):
        lines.append("")
        lines.append("\\smallskip")
        lines.append(escape_tex(speaker["joint"]))

    references = speaker.get("references")
    if isinstance(references, str):
        references = [references]
    if references:
        lines.append("")
        lines.append("\\medskip")
        lines.append("")
        lines.append("\\begin{center} {\\bf References} \\end{center}")
        lines.append("")
        ref_lines = [f"\\noindent{{{escape_tex(ref)}}}" for ref in references]
        lines.append("\\\\\n".join(ref_lines))

    return "\n".join(lines) + "\n"


def build_tex(program):
    speakers = program["speakers"]
    speaker_list = "".join(build_speaker_list_item(s) for s in speakers)
    body = PREAMBLE % {"count": len(speakers), "speaker_list": speaker_list}
    sections = [build_speaker_section(s, i == 0) for i, s in enumerate(speakers)]
    body += "\n".join(sections)
    body += "\n\\end{document}\n"
    return body


def compile_pdf(tex_path):
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        work_tex = tmp / tex_path.name
        shutil.copy(tex_path, work_tex)
        for _ in range(2):
            result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", work_tex.name],
                cwd=tmp, capture_output=True, text=True
            )
            if result.returncode != 0:
                print(result.stdout[-3000:])
                raise SystemExit("pdflatex failed — see log above")
        produced = tmp / (work_tex.stem + ".pdf")
        shutil.copy(produced, PDF_OUT)


def main():
    program = json.loads(PROGRAM_JSON.read_text(encoding="utf-8"))
    tex = build_tex(program)
    TEX_OUT.write_text(tex, encoding="utf-8")
    print(f"Wrote {TEX_OUT}")

    if "--pdf" in sys.argv:
        compile_pdf(TEX_OUT)
        print(f"Wrote {PDF_OUT}")


if __name__ == "__main__":
    main()
