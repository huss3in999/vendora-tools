"""Generate vector review assets from the exact review URL; requires Python qrcode."""
from pathlib import Path
import json
import shutil
import qrcode
import qrcode.image.svg

root = Path(__file__).resolve().parents[1]
out = root / 'docs' / 'tripadvisor'
out.mkdir(parents=True, exist_ok=True)
review = 'https://www.tripadvisor.com/UserReviewEdit-d34715134'
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4, box_size=10)
qr.add_data(review)
qr.make(fit=True)
qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(out / 'review-qr.svg')
matrix = qr.get_matrix()
size = len(matrix)
paths = ' '.join(f'M{x} {y}h1v1h-1z' for y, row in enumerate(matrix) for x, dark in enumerate(row) if dark)
logo = (root / 'public/bahrain-saudi-gcc-transport/assets/brand/vendora-transport-logo-light.svg').read_text(encoding='utf-8')
logo = logo.replace('<svg ', '<svg x="60" y="12" ', 1).replace('width="840" height="180"', 'width="280" height="60"')
card = f'''<svg xmlns="http://www.w3.org/2000/svg" width="4in" height="6in" viewBox="0 0 400 600">
<rect width="400" height="600" fill="#102b25"/>
{logo}
<text x="200" y="112" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="25" font-weight="bold">How was your journey?</text>
<text x="200" y="145" text-anchor="middle" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="14">Share your honest experience on Tripadvisor.</text>
<svg x="65" y="180" width="270" height="270" viewBox="0 0 {size} {size}" shape-rendering="crispEdges"><rect width="{size}" height="{size}" fill="white"/><path d="{paths}" fill="black"/></svg>
<text x="200" y="490" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="16">Scan to review your driver and vehicle.</text>
<text x="200" y="523" text-anchor="middle" fill="#a7f3d0" font-family="Arial,sans-serif" font-size="14">Thank you for travelling with Vendora.</text>
<text x="200" y="544" text-anchor="middle" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="9">Bahrain · Saudi Arabia · Kuwait · Qatar · UAE · Oman</text>
<text x="200" y="563" text-anchor="middle" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="13">getvendora.net · +973 3322 5954</text></svg>'''
(out / 'seatback-card-4x6.svg').write_text(card, encoding='utf-8')
sources = [
 'assets/brand/vendora-transport-logo-light.svg',
 'assets/brand/vendora-transport-app-icon.svg',
 'assets/brand/vendora-transport-app-icon-512.png',
 'assets/images/hero-vendora-vip-gmc-airport.webp',
 'assets/images/gmc-xl-interior-comfort.webp',
 'assets/images/gcc-family-luggage-transport.webp',
 'assets/images/business-vip-gcc-transfer.webp',
 'assets/images/transport/service-airport-transfer-bahrain.webp',
 'assets/images/transport/service-bahrain-saudi-transfer.webp',
 'assets/images/transport/service-business-chauffeur-bahrain.webp',
 'assets/images/transport/service-family-transport-bahrain.webp',
]
asset_dir = out / 'website-assets'
asset_dir.mkdir(exist_ok=True)
manifest = []
for source in sources:
    file = root / 'public' / 'bahrain-saudi-gcc-transport' / source
    if file.exists():
        shutil.copy2(file, asset_dir / file.name)
        manifest.append({'file':file.name,'website_url':'https://getvendora.net/bahrain-saudi-gcc-transport/'+source,'status':'Existing website asset; confirm real fleet provenance before Tripadvisor upload' if '/images/' in source else 'Existing Vendora brand asset'})
(out / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f'Prepared QR, 4x6 vector card and {len(manifest)} website assets in {out}')
