import os
import re

dir_path = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport'

def search_in_files():
    patterns = {
        'gtag': re.compile(r'gtag|analytics|google-analytics|UA-', re.I),
        'fbq': re.compile(r'fbq|fbevents|facebook', re.I),
        'admin': re.compile(r'admin|reporting|dashboard|stats|db_stats', re.I),
        'tracking': re.compile(r'track|click|event|send_event', re.I)
    }
    
    matches = {k: [] for k in patterns}
    
    # We will search in index.html in the root, site.js, site.css, functions/ if it exists, and subdirectories
    for root, dirs, files in os.walk(dir_path):
        # Exclude node_modules or .git or test-results
        if any(x in root for x in ['node_modules', '.git', 'test-results', '.agents', 'references', 'scratch']):
            continue
            
        for file in files:
            if not file.endswith(('.html', '.js', '.json')):
                continue
                
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception as e:
                continue
                
            for name, pattern in patterns.items():
                if pattern.search(content):
                    rel_path = os.path.relpath(file_path, dir_path)
                    matches[name].append(rel_path)
                    
    for name, files in matches.items():
        print(f"\nPattern '{name}' matches in {len(files)} files:")
        for f in files[:20]: # show first 20
            print(f"  {f}")
        if len(files) > 20:
            print(f"  ... and {len(files)-20} more files")

if __name__ == '__main__':
    search_in_files()
