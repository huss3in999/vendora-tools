import re
from pathlib import Path

html = Path("index.html").read_text(encoding="utf-8")
pat = re.compile(
    r'<tr><td>(?P<title>[^<]+)</td><td><code>(?P<slug>[^<]+)</code></td><td><span class="status-pill (?P<st>[^"]+)">'
)
items = [m.groupdict() for m in pat.finditer(html)]
pend = [x for x in items if x["st"] == "status-pending"]
done = [x for x in items if x["st"] == "status-done"]
print("total", len(items), "pending", len(pend), "done", len(done))
for x in pend:
    print(x["slug"])
