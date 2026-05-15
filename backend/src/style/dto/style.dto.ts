// backend/src/style/dto/recommend.dto.ts
//
// 프론트엔드 → NestJS → FastAPI로 전달되는 추천 요청 payload
//
// 필드별 흐름:
//   intent              → LangGraph Planner (분위기 분류)
//   source              → LangGraph Retrieval (closet vs external 분기)
//   anchor_item_id      → LangGraph Style Analyzer (고정 아이템 벡터 추출)
//   style_reference_ids → LangGraph Style Analyzer (레퍼런스 벡터 추출)

import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  ArrayMaxSize,
  Min,
} from 'class-validator';

// ── source 허용값 ──────────────────────────────────────────────────
// "closet"  : 내 옷장 아이템으로만 코디
// "external": 외부 아이템(네이버 쇼핑 API) 포함 코디
export enum RecommendSource {
  CLOSET   = 'closet',
  EXTERNAL = 'external',
}

export class RecommendDto {
  // ── 필수 ─────────────────────────────────────────────────────────
  @IsString()
  intent!: string;
  // "formal" | "casual" | "sporty"
  // Source Picker에서 Intent 선택 시 전달

  @IsEnum(RecommendSource, {
    message: 'source must be either "closet" or "external"',
  })
  source!: RecommendSource;
  // Source Picker에서 소스 선택 시 전달
  // 기본값은 프론트에서 "closet"으로 설정

  // ── 선택 ─────────────────────────────────────────────────────────
  @IsOptional()
  @IsInt()
  @Min(1)
  anchor_item_id?: number;
  // Source Picker에서 앵커 아이템 선택 시 전달
  // NO ANCHOR 선택 시 undefined
  // Style Analyzer가 이 ID로 DB 조회 → CLIP 벡터 추출

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(20)
  // 유저가 저장한 StyleReference가 많아도 20개로 제한
  // (벡터 평균 계산 성능 보호)
  style_reference_ids?: number[];
  // 홈 진입 시 자동 fetch된 StyleReference PK 목록
  // CUSTOM 레퍼런스가 있으면 CUSTOM만 사용 (Style Analyzer에서 처리)
  // 빈 배열([]) 또는 undefined 모두 허용 → Style Analyzer가 fallback 처리
}