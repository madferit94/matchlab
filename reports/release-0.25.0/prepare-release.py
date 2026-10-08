"""Create the 0.25.0 release metadata and preserved viewer snapshot once."""
from pathlib import Path
import json,re,subprocess
p=Path(__file__).resolve().parents[2]
assert (p/'VERSION').read_text().strip()=='0.24.1','Run once from 0.24.1'
archive=p/'archive/visualizations/visualization-design-2026-10-08-v50'
assert not archive.exists();archive.mkdir()
for name in ['index.html','index.en.html']:
    html=(p/name).read_text(encoding='utf8');old=subprocess.check_output(['git','show','HEAD:'+name],cwd=p).decode('utf8')
    def data_blocks(s):return re.findall(r'<script id="([^"]+)" type="application/json">(.*?)</script>',s,re.S)
    assert data_blocks(html)==data_blocks(old),'Original data or forecast changed'
    for tag,ident in [('style','matchlab-shared-theme'),('script','matchlab-shared-search')]:
        html=re.sub('<'+tag+' id="'+ident+'">[\\s\\S]*?</'+tag+'>','',html)
    html=html.replace(' data-design="matchlab-2026"','',1)
    (archive/name).write_text(html,encoding='utf8')
assert subprocess.check_output(['git','diff','HEAD','--','f1','modeling/odds-0.24.0'],cwd=p)==b''
(p/'VERSION').write_text('0.25.0\n',encoding='utf8')
f=p/'package.json';obj=json.loads(f.read_text(encoding='utf8'));obj['version']='0.25.0';obj['scripts']['test:report']='node reports/release-0.25.0/check.cjs';f.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
f=p/'README.md';s=f.read_text(encoding='utf8').replace('**0.24.1**','**0.25.0**').replace('경기 프리뷰, 승무패 예측','경기 프리뷰, 승무패 예측·자동 분석 보고서');f.write_text(s,encoding='utf8')
f=p/'CHANGELOG.md';s=f.read_text(encoding='utf8').replace('## 0.24.1','## 0.25.0\n- 축구 경기 페이지에서 최종 예측·지표 근거·출처와 발행일을 확인한 부상 소식을 자동 보고서로 표시. AI 실패 시 저장 지표 유지, 한영 대응.\n\n## 0.24.1',1);f.write_text(s,encoding='utf8')
f=p/'docs/README.md';s=f.read_text(encoding='utf8');s=s.replace('- [배당 입력 목적 정정]','- [경기 자동 분석 보고서](SPEC-0.25.0.md)\n- [배당 입력 목적 정정]',1);f.write_text(s,encoding='utf8')
f=p/'tools/check_release.py';s=f.read_text(encoding='utf8').replace('2026-10-08-v49','2026-10-08-v50').replace('adopted v49','adopted v50')
marker="assert not re.search('[가-힣]',english_labels.replace('한국어',''))"
insert='''report_ui=(p/'reports/release-0.25.0/report-ui.js').read_text(encoding='utf8')
report_css=(p/'reports/release-0.25.0/report.css').read_text(encoding='utf8')
for entry in ['index.html','index.en.html']:
    html=(p/entry).read_text(encoding='utf8')
    assert report_ui in html and report_css in html, 'Automatic report module drift: '+entry
english_labels=english_labels.replace(report_ui,'')
'''
assert marker in s;s=s.replace(marker,insert+marker).replace("else '0.24.1'","else '0.25.0'").replace("version='0.24.1'","version='0.25.0'");f.write_text(s,encoding='utf8')
f=p/'docs/SPEC-0.25.0.md';s=f.read_text(encoding='utf8')+'''

## 실행 결과 (2026-10-08)
- report.cjs: 서버의 기존 확률 최댓값으로 최종 예측 고정, AI는 근거 ID 선택만 수행. 원문 발행일 검사를 통과한 검색 요약을 별도 표시. 새로운 배당 수집이나 승부예측 모델 교체 없음.
- checks.json: 실제 로컬 HTTP와 모의 제공자로 14항목 PASS. 클라이언트 수치 변조, 부정확한 경기 ID, 출처 없는 뉴스, 오래된 기사, 내부망 URL/리다이렉트, 키 없음/할당량/시간초과, 중복·캐시 검사 포함.
- live-check.json: 기존 .env로 실제 Gemini 근거 선택·Google Search 성공, 약21.3초, Arsenal–Leeds 홈승60.857%/무22.077%/원정17.065%는 저장 모델과 동일. 부상 검색 요약4건의 원문 기사 발행일 대조 PASS(live-sources-check.json). 부상 상태 자체를 독립 검증한 것은 아님.
- browser-checks.json: 한영×390/1440, 자동 생성·세션캐시·늦은 응답 혼입 방지·실패 후 재시도·키보드·가로 넘침 PASS, JS오류0. 한국어 캡처는 이전 실호출 응답 재생, 기타 동작검사는 API 모의 응답. 실제 사용자 확인 전.
- 첫 비밀값 검사 실패: 검사 키와 테스트용 출처 URL 문자열이 겹친 오탐 → 구분되는 키로 수정 후 PASS. 중간 PowerShell 프로세스 메모리 부족 종료 → 파일 저장 여부 확인 후 가벼운 cmd 셸·Node192MB 상한·단일 브라우저 순차 검증으로 복구.
- F1/기존 축구 JSON/641예정확률/배당모델 패키지 변경 없음. v50화면 보존. 기존 AI서버17검사 PASS. 독립 에이전트 검토 및 참가자 확인 전.
- 부상 정보 검색 원문은 private/에만 보존. 발표·포트폴리오에서 AI 자동 생성과 사실 검증 범위를 구분할 것.
''';f.write_text(s,encoding='utf8')
print('Prepared 0.25.0; original forecasts/data/F1/odds package preserved')
