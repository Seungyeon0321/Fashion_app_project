// shared/lib/tokens.ts
// DESIGN.md 기반 디자인 토큰 — 색상, 폰트, 간격

export const colors = {
    // ── Backgrounds ──────────────────────────────
    background:   '#faf9f6', // Base layer
    surface:      '#f4f4f0', // Secondary tier
    surfaceHigh:  '#ffffff', // Elevated / Cards
  
    // ── Card backgrounds (tonal) ──────────────────
    card1: '#ede9e3',
    card2: '#e6e2dc',
    card3: '#dedad4',
    card4: '#e9e5df',
  
    // ── Text ──────────────────────────────────────
    primary:      '#1a1a1a', // Main text / active
    primaryMuted: '#5f5e5e', // Secondary text
    hint:         '#aaaaaa', // Labels / hints
    label:        '#bbbbbb', // Subtle labels
  
    // ── Accent ────────────────────────────────────
    accentRed:    '#e24b4a', // Favorite underline
  
    // ── Components ────────────────────────────────
    fab:          '#2e2e2e', // FAB button
    tabInactive:  '#cccccc', // Inactive tab icons
    divider:      '#e0ddd8', // Tonal divider (no hard borders)
  } as const;
  
  export const fonts = {
    // Epilogue — headlines / brand names
    display:  { fontFamily: 'Epilogue_700Bold',   fontSize: 32, lineHeight: 37 },
    headline: { fontFamily: 'Epilogue_700Bold',   fontSize: 26, lineHeight: 30 },
    title:    { fontFamily: 'Epilogue_500Medium', fontSize: 18, lineHeight: 22 },
    brand:    { fontFamily: 'Epilogue_500Medium', fontSize: 15, lineHeight: 18 },
  
    // Manrope — body / labels
    body:     { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 22 },
    bodyMd:   { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 20 },
    label:    { fontFamily: 'Manrope_500Medium',  fontSize: 11, lineHeight: 14 },
    caption:  { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 14 },
    tab:      { fontFamily: 'Manrope_500Medium',  fontSize: 9,  lineHeight: 11 },
  } as const;
  
  export const spacing = {
    outerMargin: 24,  // 화면 좌우 여백
    cardGap:     12,  // 카드 사이 간격
    cardOffset:  52,  // 오른쪽 컬럼 아래로 내리는 offset
    sectionGap:  28,  // 카드 row 사이 간격
  } as const;
  
  export const radius = {
    fab:  14,  // FAB 버튼
    none: 0,   // 카드 이미지 — no radius (editorial)
  } as const;