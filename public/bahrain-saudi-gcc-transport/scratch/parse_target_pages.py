import re
import os

ar_page = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html'
en_page = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html'

def parse_html(path):
    if not os.path.exists(path):
        return None
        
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
        
    # Extract title
    title = re.findall(r'<title[^>]*>(.*?)</title>', html, re.S)
    
    # Extract headings
    h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    h2 = re.findall(r'<h2[^>]*>(.*?)</h2>', html, re.S)
    h3 = re.findall(r'<h3[^>]*>(.*?)</h3>', html, re.S)
    
    # Extract alt texts
    alts = re.findall(r'<img[^>]+alt="([^"]*)"', html)
    
    # Extract scripts
    ld_json = re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S)
    
    # Extract FAQs
    faqs = []
    faq_matches = re.findall(r'<details[^>]*>\s*<summary[^>]*>(.*?)</summary>\s*(.*?)</details>', html, re.S)
    for q, a in faq_matches:
        faqs.append((q.strip(), re.sub('<[^<]+?>', '', a).strip()))
        
    # Extract links
    links = re.findall(r'<a[^>]+href="([^"]*)"[^>]*>(.*?)</a>', html, re.S)
    
    return {
        'title': title[0].strip() if title else '',
        'h1': [h.strip() for h in h1],
        'h2': [h.strip() for h in h2],
        'h3': [h.strip() for h in h3],
        'alts': alts,
        'ld_json': ld_json,
        'faqs': faqs,
        'links': [(href.strip(), re.sub('<[^<]+?>', '', text).strip()) for href, text in links]
    }

ar_data = parse_html(ar_page)
en_data = parse_html(en_page)

out_path = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/parsed_pages_details.txt'

with open(out_path, 'w', encoding='utf-8') as out:
    if ar_data:
        out.write("=========================================\n")
        out.write("ARABIC PAGE DETAILS\n")
        out.write("=========================================\n")
        out.write(f"Title: {ar_data['title']}\n")
        out.write(f"H1: {ar_data['h1']}\n")
        out.write(f"H2 count: {len(ar_data['h2'])}\n")
        for h in ar_data['h2']:
            out.write(f"  H2: {h}\n")
        out.write(f"H3 count: {len(ar_data['h3'])}\n")
        for h in ar_data['h3']:
            out.write(f"  H3: {h}\n")
        out.write(f"Alts: {ar_data['alts']}\n")
        out.write(f"FAQs count: {len(ar_data['faqs'])}\n")
        for q, a in ar_data['faqs']:
            out.write(f"  Q: {q}\n  A: {a}\n\n")
        out.write(f"Links count: {len(ar_data['links'])}\n")
        for href, text in ar_data['links']:
            out.write(f"  Link: {href} -> {text}\n")
            
    if en_data:
        out.write("\n=========================================\n")
        out.write("ENGLISH PAGE DETAILS\n")
        out.write("=========================================\n")
        out.write(f"Title: {en_data['title']}\n")
        out.write(f"H1: {en_data['h1']}\n")
        out.write(f"H2 count: {len(en_data['h2'])}\n")
        for h in en_data['h2']:
            out.write(f"  H2: {h}\n")
        out.write(f"H3 count: {len(en_data['h3'])}\n")
        for h in en_data['h3']:
            out.write(f"  H3: {h}\n")
        out.write(f"Alts: {en_data['alts']}\n")
        out.write(f"FAQs count: {len(en_data['faqs'])}\n")
        for q, a in en_data['faqs']:
            out.write(f"  Q: {q}\n  A: {a}\n\n")
        out.write(f"Links count: {len(en_data['links'])}\n")
        for href, text in en_data['links']:
            out.write(f"  Link: {href} -> {text}\n")

print("Parsed pages written to scratch/parsed_pages_details.txt")
