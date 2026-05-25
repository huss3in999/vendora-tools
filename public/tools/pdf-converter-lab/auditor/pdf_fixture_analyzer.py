from __future__ import annotations

import json
import sys
from pathlib import Path

from pypdf import PdfReader


def main() -> None:
    path = Path(sys.argv[1])
    result = {
        "path": str(path),
        "fileName": path.name,
        "exists": path.exists(),
        "size": path.stat().st_size if path.exists() else 0,
        "validPdf": False,
        "encrypted": False,
        "pageCount": 0,
        "textChars": 0,
        "hasSelectableText": False,
        "error": None,
    }
    try:
        reader = PdfReader(str(path))
        result["validPdf"] = True
        result["encrypted"] = bool(reader.is_encrypted)
        if reader.is_encrypted:
            try:
                reader.decrypt("vendora")
            except Exception:
                pass
        result["pageCount"] = len(reader.pages)
        text = []
        for page in reader.pages[:10]:
            try:
                text.append(page.extract_text() or "")
            except Exception:
                pass
        joined = "\n".join(text)
        result["textChars"] = len(joined.strip())
        result["hasSelectableText"] = result["textChars"] > 20
    except Exception as exc:
        result["error"] = str(exc)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
