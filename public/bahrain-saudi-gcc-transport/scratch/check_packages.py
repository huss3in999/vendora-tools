import sys

packages = ['pypdf', 'pdfplumber', 'fitz', 'pdfminer', 'reportlab']
for pkg in packages:
    try:
        __import__(pkg)
        print(f"Package '{pkg}' is INSTALLED")
    except ImportError:
        print(f"Package '{pkg}' is MISSING")
