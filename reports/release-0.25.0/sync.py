"""Embed the reviewed report source in both viewers; preserve the adopted v50 snapshot."""
from pathlib import Path
import re,hashlib
p=Path(__file__).resolve().parents[2]
js=(p/'reports/release-0.25.0/report-ui.js').read_text(encoding='utf8')
css=(p/'reports/release-0.25.0/report.css').read_text(encoding='utf8')
for name in ['index.html','index.en.html']:
    f=p/name;s=f.read_text(encoding='utf8')
    for tag,ident in [('style','match-report-style'),('script','match-report-module')]:
        s=re.sub('<'+tag+' id="'+ident+'"[^>]*>[\\s\\S]*?</'+tag+'>','',s)
    revision=hashlib.sha256((s+js+css).encode()).hexdigest()[:16]
    s=s.replace('</body>','<style id="match-report-style">'+css+'</style><script id="match-report-module" data-revision="'+revision+'">'+js+'</script></body>')
    f.write_text(s,encoding='utf8')
print('Embedded report CSS and JS with per-release/data cache fingerprint')
