import os
from pypdf import PdfReader

files = [
    {
        'pdf': 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/research/incoming/deep-research-report-01.md',
        'txt': 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-01.txt'
    },
    {
        'pdf': 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/research/incoming/deep-research-report-02.md',
        'txt': 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-02.txt'
    }
]

for item in files:
    pdf_path = item['pdf']
    txt_path = item['txt']
    print(f"\nProcessing {pdf_path}...")
    
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        continue
        
    reader = PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    
    full_text = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        full_text.append(f"--- PAGE {idx+1} ---")
        full_text.append(text)
        
    extracted_text = "\n".join(full_text)
    
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(extracted_text)
        
    print(f"Extracted {len(extracted_text)} characters and wrote to {txt_path}")
