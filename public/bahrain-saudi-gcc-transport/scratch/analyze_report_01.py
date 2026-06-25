with open('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-01.txt', 'r', encoding='utf-8') as f:
    content = f.read()

pages = content.split('--- PAGE ')

# Write clean page-by-page text of report 01 to a file
with open('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-01-clean.txt', 'w', encoding='utf-8') as out:
    for idx, page in enumerate(pages):
        if not page.strip():
            continue
        out.write(f"\n=========================================\n")
        out.write(f"PAGE {idx}\n")
        out.write(f"=========================================\n")
        out.write(page)
        
print("Report 01 Cleaned and Written.")
