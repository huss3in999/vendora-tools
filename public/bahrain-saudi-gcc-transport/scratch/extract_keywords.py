import re
import sys

# Reconfigure stdout to use utf-8 to avoid encoding errors when printing to console
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

files = [
    'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-01.txt',
    'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-02.txt'
]

output_file = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/all_extracted_keywords.txt'

with open(output_file, 'w', encoding='utf-8') as out:
    for file in files:
        out.write(f"\n=========================================\n")
        out.write(f"FILE: {file}\n")
        out.write(f"=========================================\n")
        
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        pages = content.split('--- PAGE ')
        for page in pages:
            if not page.strip():
                continue
            lines = page.split('\n')
            header = lines[0]
            
            # Print page text if it contains keywords, volumes, search queries
            page_text = "\n".join(lines[1:])
            
            # Let's extract any lines containing keyword or search volume tables
            keyword_lines = []
            for line in lines[1:]:
                # If the line contains a search term, city name, numbers, or is part of a table
                if re.search(r'(cpc|volume|keyword|search|intent|الكلمات|حجم|بحث|توصيل|تاكسي|سائق|سيارة|مطار|جسر)', line, re.I):
                    keyword_lines.append(line.strip())
            
            if len(keyword_lines) > 5:
                out.write(f"\n--- Page {header} (Keyword related lines) ---\n")
                for kl in keyword_lines[:40]: # limit to first 40 lines per page for analysis
                    out.write(kl + "\n")
                    
print("Done extracting. Check scratch/all_extracted_keywords.txt")
