from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


def xml_text(xml: str) -> str:
    try:
        root = ET.fromstring(xml)
        return " ".join(t.strip() for t in root.itertext() if t and t.strip())
    except Exception:
        return re.sub(r"<[^>]+>", " ", xml)


def main() -> None:
    path = Path(sys.argv[1])
    kind = sys.argv[2]
    result = {
        "path": str(path),
        "fileName": path.name,
        "exists": path.exists(),
        "size": path.stat().st_size if path.exists() else 0,
        "validZip": False,
        "hasContentTypes": False,
        "hasExpectedFolder": False,
        "entryCount": 0,
        "textChars": 0,
        "textItemCount": 0,
        "imageCount": 0,
        "sheetCount": 0,
        "slideCount": 0,
        "numericCellCount": 0,
        "error": None,
    }
    try:
        with zipfile.ZipFile(path) as z:
            names = z.namelist()
            result["validZip"] = True
            result["entryCount"] = len(names)
            result["hasContentTypes"] = "[Content_Types].xml" in names
            result["hasExpectedFolder"] = any(n.startswith({"docx": "word/", "pptx": "ppt/", "xlsx": "xl/"}[kind]) for n in names)
            result["imageCount"] = sum(1 for n in names if "/media/" in n)
            result["sheetCount"] = sum(1 for n in names if n.startswith("xl/worksheets/sheet") and n.endswith(".xml"))
            result["slideCount"] = sum(1 for n in names if n.startswith("ppt/slides/slide") and n.endswith(".xml"))
            texts = []
            if kind == "docx":
                for n in names:
                    if n == "word/document.xml":
                        xml = z.read(n).decode("utf-8", errors="ignore")
                        texts.append(xml_text(xml))
            elif kind == "pptx":
                for n in names:
                    if n.startswith("ppt/slides/slide") and n.endswith(".xml"):
                        xml = z.read(n).decode("utf-8", errors="ignore")
                        texts.append(xml_text(xml))
            elif kind == "xlsx":
                for n in names:
                    if n == "xl/sharedStrings.xml" or (n.startswith("xl/worksheets/sheet") and n.endswith(".xml")):
                        xml = z.read(n).decode("utf-8", errors="ignore")
                        texts.append(xml_text(xml))
                        result["numericCellCount"] += len(re.findall(r'<c[^>]*(?:t="n")?[^>]*><v>[-+]?\d', xml))
            joined = " ".join(texts)
            result["textChars"] = len(joined.strip())
            result["textItemCount"] = len([x for x in re.split(r"\s+", joined.strip()) if x])
    except Exception as exc:
        result["error"] = str(exc)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
