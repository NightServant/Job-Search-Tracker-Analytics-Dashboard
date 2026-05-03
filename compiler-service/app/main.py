import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field


MAX_LATEX_LENGTH = 100_000
DEFAULT_TIMEOUT_MS = 60_000
MAX_TIMEOUT_MS = 120_000
MAX_PDF_BYTES = 10 * 1024 * 1024


class CompileRequest(BaseModel):
    latex: str = Field(min_length=1, max_length=MAX_LATEX_LENGTH)
    timeoutMs: int | None = Field(default=DEFAULT_TIMEOUT_MS, ge=1, le=MAX_TIMEOUT_MS)


def get_compiler_secret() -> str:
    secret = os.getenv("COMPILER_SERVICE_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="Missing COMPILER_SERVICE_SECRET")
    return secret


def require_bearer_token(authorization: str | None = Header(default=None)) -> None:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = parts[1].strip()
    if token != get_compiler_secret():
        raise HTTPException(status_code=403, detail="Invalid compiler service secret")


def safe_error_excerpt(log_path: Path, max_lines: int = 20) -> str:
    if not log_path.exists():
        return "LaTeX compilation failed"

    try:
        lines = log_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return "LaTeX compilation failed"

    interesting = [
        line.strip()
        for line in lines
        if line.strip().startswith("!") or "error" in line.lower()
    ]
    snippet = interesting[:max_lines] if interesting else lines[-max_lines:]
    text = "\n".join(s for s in snippet if s.strip())
    return text[:2000] if text else "LaTeX compilation failed"


def compile_latex_to_pdf(latex: str, timeout_ms: int) -> bytes:
    pdflatex_bin = shutil.which("pdflatex")
    if not pdflatex_bin:
        raise HTTPException(status_code=500, detail="Compiler runtime not available")

    with tempfile.TemporaryDirectory(prefix="latex-compile-") as tmp_dir:
        work_dir = Path(tmp_dir)
        tex_path = work_dir / "document.tex"
        pdf_path = work_dir / "document.pdf"
        log_path = work_dir / "document.log"

        tex_path.write_text(latex, encoding="utf-8")

        command = [
            pdflatex_bin,
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            "-no-shell-escape",
            "document.tex",
        ]

        timeout_seconds = timeout_ms / 1000

        try:
            subprocess.run(
                command,
                cwd=work_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout_seconds,
                check=True,
                text=True,
            )
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(status_code=504, detail="Compilation timed out") from exc
        except subprocess.CalledProcessError as exc:
            error_text = safe_error_excerpt(log_path)
            stderr_excerpt = (exc.stderr or "")[:1000]
            detail = error_text if error_text else stderr_excerpt or "Compilation failed"
            raise HTTPException(status_code=422, detail=detail) from exc

        if not pdf_path.exists():
            raise HTTPException(status_code=422, detail="Compiler did not produce a PDF")

        pdf_bytes = pdf_path.read_bytes()
        if not pdf_bytes:
            raise HTTPException(status_code=422, detail="Compiler returned an empty PDF")
        if len(pdf_bytes) > MAX_PDF_BYTES:
            raise HTTPException(status_code=413, detail="Generated PDF exceeds max size")

        return pdf_bytes


app = FastAPI(title="LaTeX Compiler Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    if not os.getenv("COMPILER_SERVICE_SECRET", "").strip():
        raise HTTPException(status_code=500, detail="Missing COMPILER_SERVICE_SECRET")

    if not shutil.which("pdflatex"):
        raise HTTPException(status_code=500, detail="pdflatex not available")

    return {"status": "ok"}


@app.post("/compile", dependencies=[Depends(require_bearer_token)])
def compile_pdf(payload: CompileRequest) -> Response:
    timeout_ms = payload.timeoutMs or DEFAULT_TIMEOUT_MS
    pdf_bytes = compile_latex_to_pdf(payload.latex, timeout_ms)
    return Response(content=pdf_bytes, media_type="application/pdf")