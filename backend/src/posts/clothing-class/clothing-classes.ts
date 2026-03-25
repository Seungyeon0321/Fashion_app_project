// src/posts/clothing-classes.ts
// HuggingFace MobileNetV4 (0-indexed, 1000 classes) 기준 정확한 매핑

export const CLOTHING_CLASS_INDICES = new Set([
  // ===== 상의 =====
  841,  // sweatshirt
  610,  // jersey (운동복 상의)
  638,  // maillot (타이트한 상의/수영복)
  639,  // maillot_tank_suit
  652,  // military_uniform
  617,  // lab_coat
  
  // ===== 하의 =====
  608,  // jean
  655,  // miniskirt
  945,  // swimming_trunks (수영 트렁크)
  
  // ===== 원피스/전신 =====
  578,  // gown
  911,  // gown (cowboy_boot 다음 gown — 중복 확인용)
  601,  // hoopskirt (크리놀린)
  775,  // sarong
  
  // ===== 아우터 =====
  869,  // trench_coat
  568,  // fur_coat
  474,  // cardigan
  501,  // cloak
  
  // ===== 수영복/운동복 =====
  445,  // bikini
  985,  // (제외)

  // ===== 모자류 =====
  515,  // cowboy_hat
  796,  // ski_mask
  433,  // bathing_cap
  452,  // bonnet
  667,  // mortarboard (학사모)
  
  // ===== 신발류 =====
  770,  // running_shoe
  774,  // sandal
  502,  // clog
  630,  // Loafer (로퍼)
  514,  // cowboy_boot

  // ===== 기타 액세서리 =====
  459,  // brassiere
  529,  // diaper
  748,  // purse
  887,  // vestment (제복류)
  903,  // wig
  824,  // stole
  834,  // suit
  457,  // bow_tie
  906,  // Windsor_tie
  552,  // feather_boa
  643,  // mask
  806,  // sock (986)
  689,  // overskirt
  400,  // academic_gown
  865,  // cuirass (갑옷류)
  490,  // chain_mail
  411,  // apron
  414,  // backpack (가방류 포함 여부 선택)
]);

// MVP용 핵심 클래스만 — 오탐 최소화
export const CLOTHING_CLASS_INDICES_CLEAN = new Set([
  841,  // sweatshirt  ← 핵심! 기존에 없던 것
  610,  // jersey
  608,  // jean
  638,  // maillot
  639,  // maillot_tank_suit
  578,  // gown
  869,  // trench_coat
  568,  // fur_coat
  474,  // cardigan
  655,  // miniskirt
  652,  // military_uniform
  445,  // bikini
  834,  // suit
  824,  // stole
  887,  // vestment
  770,  // running_shoe
  806,  // sock
  459,  // brassiere
  529,  // diaper
  411,  // apron
]);