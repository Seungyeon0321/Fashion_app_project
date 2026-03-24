// src/posts/clothing-classes.ts
export const CLOTHING_CLASS_INDICES = new Set([
    403,  // apron
    406,  // bulletproof vest
    411,  // cardigan
    431,  // 
    443,  // bonnet
    452,  // diaper
    459,  // brassiere
    514,  // gown
    518,  // Cowboy hat
    532,  // hair slide
    542,  // holster
    568,  // jean
    569,  // jersey
    571,  // joystick (제외 대상 — 나중에 튜닝)
    614,  // kimono
    619,  // lab coat
    620,  // ladle (제외)
    638,  // maillot (수영복)
    639,  // maillot tank suit
    645,  // mask
    652,  // military uniform
    665,  // miniskirt
    703,  // pajama
    723,  // poncho
    731,  // Protectors
    736,  // purse
    756,  // rugby ball (제외)
    770,  // Running shoe
    800,  // ski mask
    810,  // sock
    833,  // stole
    838,  // suit
    845,  // wig
    906,  // trench coat
    907,  // trimaran (제외)
    910,  // umbrella
    911,  // unicycle (제외)
    914,  // vestment
    930,  // wedding gown
  ]);
  
  // 정제된 버전
  export const CLOTHING_CLASS_INDICES_CLEAN = new Set([
    411,  // cardigan
    514,  // gown
    568,  // jean
    569,  // jersey
    614,  // kimono
    619,  // lab coat
    638,  // maillot
    639,  // maillot tank suit
    652,  // military uniform
    665,  // miniskirt
    723,  // poncho
    736,  // purse
    800,  // ski mask
    810,  // sock
    833,  // stole
    838,  // suit
    906,  // trench coat
    914,  // vestment
    930,  // wedding gown
  ]);