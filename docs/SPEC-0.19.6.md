# 0.19.6 / F1 0.7.3 — Recorded rank motion

Recorded comparison rows previously stayed in driver-number order. Rows now follow current recorded rank, using a 480ms vertical transition while playback advances. Horizontal progress remains unchanged. Missing ranks sort last; ties are stable by driver number. Seek/reset use immediate placement. Reduced-motion users get immediate ordering. Interrupted transitions begin from the current on-screen position.

No forecast calculations, rank records, embedded data or map GPS/reconstruction functions changed. Prior code is retained in Git; current comparison module is exported in f1/release-0.7.3/comparison.js. Source explains that row movement is rank visualization, not a measured overtaking path.

검증: 순위 교환·동률·결측·탐색·움직임 줄이기 및 기존 데이터 보존 검사. 참가자 확인 전.
