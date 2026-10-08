from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
s=(root/'f1/index.html').read_text(encoding='utf-8')
prefix=(root/'f1/release-0.8.6/natural-analysis.js').read_text(encoding='utf-8').strip()[:100]
start=s.index(prefix); end=s.index('</script>',start)
(root/'f1/release-0.9.1/natural-analysis.js').write_text(s[start:end].strip()+'\n',encoding='utf-8')
p=root/'tools/check_release.py'; t=p.read_text(encoding='utf-8').replace('f1/release-0.8.6/natural-analysis.js','f1/release-0.9.1/natural-analysis.js').replace("else '0.22.0'","else '0.22.1'").replace("manifest=dict(version='0.22.0'","manifest=dict(version='0.22.1'")
p.write_text(t,encoding='utf-8')
for name in ['VERSION','package.json','README.md','README.ko.md','CHANGELOG.md','tools/check_release.py','publication_manifest.json']:
 p=root/name; backup=root/'f1/release-0.9.1'/('before-'+name.replace('/','-'))
 if not backup.exists(): backup.write_bytes(p.read_bytes())
(root/'VERSION').write_text('0.22.1\n',encoding='utf-8')
p=root/'package.json'; data=json.loads(p.read_text());data['version']='0.22.1';p.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
for name,note in [('README.md','F1 GP names now use consistent English event titles in both views. A prominent question shortcut opens a larger, higher-contrast natural-language input.'),('README.ko.md','F1 대회 이름의 영문 표기를 통일하고, 경기 상세의 질문 바로가기와 크고 선명한 자연어 입력창을 추가했습니다.')]:
 p=root/name;t=p.read_text(encoding='utf-8');t=t.replace('# MatchLab\n','# MatchLab\n\n**0.22.1** · '+note+'\n',1);p.write_text(t,encoding='utf-8')
p=root/'CHANGELOG.md';p.write_text('## 0.22.1 / F1 0.9.1 — GP titles and visible analysis input\n\n- Consistent English GP titles; prominent question entry, focus shortcut and higher-contrast input.\n- 대회명 표기 통일·자연어 질문 진입·입력창 가독성 개선.\n- [Specification / 명세](docs/SPEC-0.22.1.md) · KO/EN, 390/768/1440px checks passed.\n\n'+p.read_text(encoding='utf-8'),encoding='utf-8')
print('Version 0.22.1 / F1 0.9.1 recorded; previous files preserved.')
