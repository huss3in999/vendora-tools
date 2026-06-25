with open('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-02.txt', 'r', encoding='utf-8') as f:
    content = f.read()

pages = content.split('--- PAGE ')

# Let's inspect the pages in detail. We'll write them to a clean text file and print the page titles.
with open('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/deep-research-report-02-clean.txt', 'w', encoding='utf-8') as out:
    for idx, page in enumerate(pages):
        if not page.strip():
            continue
        out.write(f"\n=========================================\n")
        out.write(f"PAGE {idx}\n")
        out.write(f"=========================================\n")
        out.write(page)
        
print("Report 02 Cleaned and Written.")
