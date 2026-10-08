# MatchLab 0.22.3 / F1 0.9.3

Click tyre names for concise characteristics and typical uses in Korean or English. Applies to tyre stint records, the selected-driver replay inspector, and recorded replay rows. Five compounds: soft, medium, hard, intermediate and wet. Missing compounds remain unavailable; raw records and model outputs are unchanged. Slick labels are relative to the GP selection, not fixed C numbers.

Accessible interaction: Enter/click to open; close button, Escape, repeat click or outside click to dismiss. Close/Escape returns focus. Minimum 44px targets, 16px body copy, viewport-aware placement. Popovers survive same-driver/same-compound redraws; absent/changed anchors dismiss them.

Official sources checked 2026-10-08:
- https://www.formula1.com/en/latest/article/the-beginners-guide-to-f1-tyres.61SvF0Kfg29UR2SPhakDqd
- https://www.pirelli.com/tyres/en-ww/motorsport/car/formula-1

Validation PASS: five controlled compound cases plus real recorded stints and selected-driver replay, Korean/English at 390/768/1440px, viewport bounds, keyboard/focus/outside close, replay redraw, all embedded JSON unchanged. Existing analysis/name regression PASS. User visual confirmation pending.
