from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape, letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[3]
FIXTURE_DIR = ROOT / "tools" / "pdf-converter-lab" / "auditor" / "fixtures"
IMAGE_DIR = FIXTURE_DIR / "_images"
FONT_DIR = Path("C:/Windows/Fonts")


def register_fonts() -> None:
    candidates = {
        "AuditSans": FONT_DIR / "NotoSans-Regular.ttf",
        "AuditSansBold": FONT_DIR / "NotoSans-Bold.ttf",
        "AuditSerif": FONT_DIR / "NotoSerif-Regular.ttf",
        "AuditNirmala": FONT_DIR / "Nirmala.ttf",
        "AuditArabic": FONT_DIR / "arial.ttf",
        "AuditCJK": FONT_DIR / "simsunb.ttf",
        "AuditKorean": FONT_DIR / "malgun.ttf",
    }
    for name, path in candidates.items():
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))


def ensure_dirs() -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)


def draw_logo(c: canvas.Canvas, x: float, y: float, label: str = "VENDORA") -> None:
    c.setFillColor(colors.HexColor("#0B5FFF"))
    c.roundRect(x, y, 92, 32, 6, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("AuditSansBold", 11)
    c.drawString(x + 10, y + 10, label)


def draw_header(c: canvas.Canvas, title: str, subtitle: str = "") -> None:
    width, height = c._pagesize
    draw_logo(c, 42, height - 62)
    c.setFillColor(colors.HexColor("#111827"))
    c.setFont("AuditSansBold", 22)
    c.drawString(150, height - 52, title)
    if subtitle:
        c.setFillColor(colors.HexColor("#4B5563"))
        c.setFont("AuditSans", 10)
        c.drawString(150, height - 70, subtitle)


def draw_table(c: canvas.Canvas, x: float, y: float, rows: list[list[str]], col_widths: list[float]) -> None:
    row_h = 24
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(0.8)
    for r, row in enumerate(rows):
        current_y = y - r * row_h
        if r == 0:
            c.setFillColor(colors.HexColor("#E2E8F0"))
            c.rect(x, current_y - row_h + 4, sum(col_widths), row_h, fill=1, stroke=0)
            c.setFont("AuditSansBold", 9)
        else:
            c.setFillColor(colors.black)
            c.setFont("AuditSans", 9)
        cx = x
        for i, cell in enumerate(row):
            c.rect(cx, current_y - row_h + 4, col_widths[i], row_h, fill=0, stroke=1)
            c.drawString(cx + 5, current_y - 13, str(cell))
            cx += col_widths[i]


def create_photo(path: Path, text: str, color: str = "#22C55E", transparent: bool = False) -> Path:
    mode = "RGBA" if transparent else "RGB"
    bg = (255, 255, 255, 0) if transparent else (245, 247, 251)
    img = Image.new(mode, (520, 320), bg)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((25, 25, 495, 295), radius=28, fill=color)
    draw.ellipse((60, 75, 190, 205), fill="#FFFFFF")
    draw.rectangle((220, 90, 445, 122), fill="#FFFFFF")
    draw.rectangle((220, 145, 420, 172), fill="#FFFFFF")
    draw.text((75, 230), text, fill="#111827")
    img.save(path)
    return path


def save_pdf(name: str, draw_func, pagesize=A4) -> Path:
    path = FIXTURE_DIR / name
    c = canvas.Canvas(str(path), pagesize=pagesize)
    draw_func(c)
    c.save()
    return path


def simple_text(c: canvas.Canvas) -> None:
    draw_header(c, "Simple English PDF", "Selectable text, headings, and paragraphs")
    y = 720
    c.setFont("AuditSansBold", 16)
    c.drawString(42, y, "Executive Summary")
    c.setFont("AuditSans", 11)
    for line in [
        "This fixture checks editable text extraction, paragraph order, page size, and clean reading order.",
        "A professional converter should preserve headings, body text, spacing, and document structure.",
        "Numbers: 1250, 45.5%, and 980 should remain machine-readable where relevant."
    ]:
        y -= 28
        c.drawString(42, y, line)


def invoice(c: canvas.Canvas) -> None:
    draw_header(c, "Invoice INV-2026-042", "Logo, totals, currency text, and table cells")
    c.setFont("AuditSans", 10)
    c.drawString(42, 690, "Bill To: Gulf Horizon Trading")
    c.drawString(42, 672, "Date: 2026-05-24")
    rows = [
        ["Item", "Qty", "Unit", "Amount"],
        ["Airport Transfer", "2", "35.00", "70.00"],
        ["Waiting Time", "1", "12.50", "12.50"],
        ["VAT", "10%", "", "8.25"],
        ["Total BHD", "", "", "90.75"],
    ]
    draw_table(c, 42, 620, rows, [210, 60, 90, 100])


def table_doc(c: canvas.Canvas) -> None:
    draw_header(c, "Quarterly Table Report", "Dense rows and numeric cells")
    rows = [["Region", "Q1", "Q2", "Growth", "Score"]]
    for region, q1, q2, growth, score in [
        ("Bahrain", 1200, 1450, "20.8%", 91),
        ("Saudi", 2400, 3100, "29.2%", 88),
        ("Qatar", 900, 990, "10.0%", 84),
        ("UAE", 1800, 2220, "23.3%", 93),
        ("Oman", 640, 700, "9.4%", 79),
    ]:
        rows.append([region, str(q1), str(q2), growth, str(score)])
    draw_table(c, 42, 690, rows, [150, 85, 85, 90, 80])


def menu(c: canvas.Canvas) -> None:
    draw_header(c, "Premium Cafe Menu", "Two-column menu with prices")
    c.setFont("AuditSerif", 18)
    c.drawString(42, 675, "Breakfast")
    c.drawString(310, 675, "Signature Drinks")
    c.setFont("AuditSans", 11)
    left = [("Saffron Omelette", "4.900 BHD"), ("Date Pancakes", "3.750 BHD"), ("Halloumi Plate", "4.200 BHD")]
    right = [("Arabic Coffee", "1.900 BHD"), ("Rose Latte", "2.400 BHD"), ("Mint Lemonade", "2.200 BHD")]
    y = 640
    for item, price in left:
        c.drawString(42, y, item)
        c.drawRightString(245, y, price)
        y -= 34
    y = 640
    for item, price in right:
        c.drawString(310, y, item)
        c.drawRightString(525, y, price)
        y -= 34


def brochure(c: canvas.Canvas) -> None:
    width, height = c._pagesize
    img = create_photo(IMAGE_DIR / "brochure-photo.png", "Luxury Transport", "#38BDF8")
    c.setFillColor(colors.HexColor("#0F172A"))
    c.rect(0, height - 210, width, 210, fill=1, stroke=0)
    draw_logo(c, 42, height - 70)
    c.setFillColor(colors.white)
    c.setFont("AuditSansBold", 28)
    c.drawString(42, height - 120, "GCC Private Mobility")
    c.setFont("AuditSans", 12)
    c.drawString(42, height - 150, "Premium door-to-door transport with documents, luggage, and border timing clarity.")
    c.drawImage(ImageReader(str(img)), 42, 300, width=250, height=154)
    c.setFillColor(colors.HexColor("#111827"))
    c.setFont("AuditSansBold", 15)
    c.drawString(330, 420, "What must be preserved")
    c.setFont("AuditSans", 10)
    for i, text in enumerate(["Hero section", "Logo", "Image", "Two-column spacing", "Brand colors"]):
        c.drawString(330, 390 - i * 24, f"- {text}")


def catalog(c: canvas.Canvas) -> None:
    draw_header(c, "Product Catalog", "Cards, images, prices, and repeated layout")
    for idx, (x, y) in enumerate([(42, 560), (310, 560), (42, 300), (310, 300)], start=1):
        img = create_photo(IMAGE_DIR / f"product-{idx}.png", f"Item {idx}", "#F59E0B")
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        c.roundRect(x, y, 220, 190, 8, stroke=1, fill=0)
        c.drawImage(ImageReader(str(img)), x + 12, y + 72, width=196, height=90)
        c.setFont("AuditSansBold", 12)
        c.drawString(x + 12, y + 48, f"Premium Product {idx}")
        c.setFont("AuditSans", 10)
        c.drawString(x + 12, y + 28, f"SKU-{idx:03d}  Price: {idx * 12}.500 BHD")


def form_doc(c: canvas.Canvas) -> None:
    draw_header(c, "Customer Intake Form", "Form fields and labels")
    fields = ["Full Name", "Email", "Phone", "Pickup Address", "Destination", "Signature"]
    y = 670
    c.setFont("AuditSans", 10)
    for field in fields:
        c.drawString(42, y, field)
        c.rect(180, y - 6, 320, 22, fill=0, stroke=1)
        y -= 52
    c.acroForm.textfield(name="customer_name", x=180, y=664, width=320, height=22, borderWidth=1)


def logo_image_heavy(c: canvas.Canvas) -> None:
    draw_header(c, "Logo and Image Heavy PDF", "Raster and transparent image preservation")
    img = create_photo(IMAGE_DIR / "image-heavy.png", "Image Block", "#A855F7")
    transparent = create_photo(IMAGE_DIR / "transparent-logo.png", "Transparent", "#10B981", transparent=True)
    c.drawImage(ImageReader(str(img)), 42, 420, width=240, height=148)
    c.drawImage(ImageReader(str(transparent)), 320, 420, width=200, height=123, mask="auto")
    c.setFont("AuditSans", 11)
    c.drawString(42, 370, "Images and transparent logos should remain sharp and correctly layered.")


def chart_doc(c: canvas.Canvas) -> None:
    draw_header(c, "Chart PDF", "Bars, labels, colors, and numbers")
    labels = ["Jan", "Feb", "Mar", "Apr"]
    values = [110, 160, 130, 210]
    colors_list = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626"]
    x = 70
    for label, value, color in zip(labels, values, colors_list):
        c.setFillColor(colors.HexColor(color))
        c.rect(x, 330, 55, value, fill=1, stroke=0)
        c.setFillColor(colors.black)
        c.setFont("AuditSans", 10)
        c.drawCentredString(x + 28, 310, label)
        c.drawCentredString(x + 28, 340 + value, str(value))
        x += 95


def mixed_fonts(c: canvas.Canvas) -> None:
    draw_header(c, "Mixed Fonts PDF", "Serif, sans, bold, color, and size changes")
    y = 690
    styles = [
        ("AuditSansBold", 20, colors.HexColor("#111827"), "Large Bold Heading"),
        ("AuditSerif", 14, colors.HexColor("#334155"), "Serif paragraph text with careful spacing."),
        ("AuditSans", 11, colors.HexColor("#0F766E"), "Colored sans-serif note: preserve color when possible."),
        ("AuditSansBold", 10, colors.HexColor("#991B1B"), "Small bold warning text."),
    ]
    for font, size, color, text in styles:
        c.setFont(font, size)
        c.setFillColor(color)
        c.drawString(42, y, text)
        y -= 46


def language_doc(name: str, title: str, lines: list[str], font: str = "AuditSans") -> Path:
    def draw(c: canvas.Canvas) -> None:
        draw_header(c, title, "Global language fixture")
        y = 680
        c.setFont(font, 13)
        for line in lines:
            c.drawString(42, y, line)
            y -= 38
    return save_pdf(name, draw)


def multipage(c: canvas.Canvas) -> None:
    for page in range(1, 6):
        draw_header(c, f"Multi-page Document - Page {page}", "Page order, headers, and footers")
        c.setFont("AuditSans", 11)
        for i in range(12):
            c.drawString(42, 680 - i * 32, f"Page {page}, paragraph line {i + 1}: reading order should remain stable.")
        c.drawString(42, 40, f"Footer page {page} of 5")
        if page < 5:
            c.showPage()


def large_doc(c: canvas.Canvas) -> None:
    for page in range(1, 31):
        draw_header(c, f"Large PDF Stress Page {page}", "Browser memory and multi-page performance")
        rows = [["Row", "Value", "Percent"]]
        for i in range(10):
            rows.append([str(i + 1), str(page * 100 + i), f"{i + 1}%"])
        draw_table(c, 42, 650, rows, [100, 150, 120])
        if page < 30:
            c.showPage()


def scanned_doc(c: canvas.Canvas) -> None:
    img = Image.new("RGB", (1000, 1300), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    draw.rectangle((60, 60, 940, 1240), outline="#111827", width=4)
    draw.text((100, 120), "SCANNED RECEIPT IMAGE", fill="#111827")
    draw.text((100, 200), "No selectable text should be present.", fill="#111827")
    draw.text((100, 280), "OCR is required before editable conversion.", fill="#111827")
    path = IMAGE_DIR / "scanned-page.png"
    img.save(path)
    c.drawImage(ImageReader(str(path)), 40, 60, width=520, height=676)


def encrypt_pdf(source: Path, target: Path, password: str) -> None:
    reader = PdfReader(str(source))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(password)
    with target.open("wb") as f:
        writer.write(f)


def main() -> None:
    ensure_dirs()
    register_fonts()

    save_pdf("simple-english.pdf", simple_text)
    save_pdf("invoice.pdf", invoice)
    save_pdf("table.pdf", table_doc)
    save_pdf("menu.pdf", menu)
    save_pdf("brochure.pdf", brochure)
    save_pdf("catalog.pdf", catalog)
    save_pdf("form.pdf", form_doc)
    save_pdf("logo-image-heavy.pdf", logo_image_heavy)
    save_pdf("chart.pdf", chart_doc)
    save_pdf("mixed-fonts.pdf", mixed_fonts)
    save_pdf("scanned.pdf", scanned_doc)
    save_pdf("multi-page.pdf", multipage)
    save_pdf("large.pdf", large_doc)

    language_doc("english.pdf", "English Document", ["Hello world", "Editable English text", "Layout should remain readable."])
    language_doc("arabic.pdf", "Arabic Document", ["مرحبا بالعالم", "اختبار النص العربي", "اتجاه الكتابة من اليمين إلى اليسار"], "AuditArabic")
    language_doc("urdu.pdf", "Urdu Document", ["سلام دنیا", "اردو متن کی جانچ", "دائیں سے بائیں عبارت"], "AuditNirmala")
    language_doc("hindi.pdf", "Hindi Document", ["नमस्ते दुनिया", "हिंदी पाठ परीक्षण", "संपादन योग्य पाठ"], "AuditNirmala")
    language_doc("bengali.pdf", "Bengali Document", ["হ্যালো বিশ্ব", "বাংলা পাঠ পরীক্ষা", "সম্পাদনাযোগ্য লেখা"], "AuditNirmala")
    language_doc("chinese.pdf", "Chinese Document", ["你好世界", "中文文本测试", "保持阅读顺序"], "AuditCJK")
    language_doc("japanese.pdf", "Japanese Document", ["こんにちは世界", "日本語テキストのテスト", "編集可能な文字"], "AuditCJK")
    language_doc("korean.pdf", "Korean Document", ["안녕하세요 세계", "한국어 텍스트 테스트", "편집 가능한 텍스트"], "AuditKorean")
    language_doc("russian.pdf", "Russian Document", ["Привет мир", "Проверка русского текста", "Редактируемый текст"])
    language_doc("french.pdf", "French Document", ["Bonjour le monde", "Texte français modifiable", "Préserver les accents"])
    language_doc("spanish.pdf", "Spanish Document", ["Hola mundo", "Texto español editable", "Preservar acentos y signos"])
    language_doc("turkish.pdf", "Turkish Document", ["Merhaba dünya", "Düzenlenebilir Türkçe metin", "Ş, ğ, ı ve ö korunmalı"])
    language_doc("mixed-rtl-ltr.pdf", "Mixed RTL/LTR Document", ["Invoice رقم 2026", "Bahrain إلى Riyadh", "Total 125.50 BHD المجموع"], "AuditArabic")

    encrypt_pdf(FIXTURE_DIR / "invoice.pdf", FIXTURE_DIR / "password-protected.pdf", "vendora")
    (FIXTURE_DIR / "corrupted.pdf").write_bytes(b"%PDF-1.4\n% corrupted fixture intentionally truncated\n1 0 obj << /Type /Catalog >>\n")

    print(f"Generated fixtures in {FIXTURE_DIR}")


if __name__ == "__main__":
    main()
