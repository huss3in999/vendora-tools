import re

files = [
    'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-01.txt',
    'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-02.txt'
]

for file in files:
    print(f"\n=== Key sections in {file} ===")
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pages = content.split('--- PAGE ')
    print("Total pages:", len(pages) - 1)
    
    for page in pages:
        if not page.strip():
            continue
        header = page.split('\n')[0]
        # Look for pages with keyword tables, search volumes, or lists
        page_text_lower = page.lower()
        keywords_match = re.findall(r'(keyword|query|search|intent|volume|cpc|الكلمات|دليل|حجم|بحث|استهداف)', page_text_lower)
        if len(keywords_match) > 5:
            print(f"Page {header}: matches count = {len(keywords_match)}")
            # print first 300 chars of the page
            lines = page.split('\n')
            for line in lines[1:10]:
                if line.strip():
                    print("  ", line.strip()[:100])
