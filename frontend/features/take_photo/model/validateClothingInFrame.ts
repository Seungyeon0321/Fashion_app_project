export type ValidateResult = { valid: boolean; message?: string };

/**
 * 프레임 안에 옷이 제대로 들어갔는지 검사합니다.
 *
 * 실제 구현 시: 이미지(uri 또는 base64)를 백엔드로 보내고,
 * 백엔드에서 YOLO(또는 의류 전용 분류기)로 "의류 감지 여부"를 판단한 뒤
 * { valid: true/false } 를 반환하는 API를 호출하면 됩니다.
 *
 * - YOLO: 객체 검출로 "의류" 클래스가 프레임 안에 있는지 확인 (의류 데이터셋 학습 모델 권장)
 * - 기본 COCO yolov8n에는 shirt/dress 등이 없으므로, 의류 전용 모델 또는 백엔드에서
 *   Lambda 분석 결과를 "옷 있음/없음"으로 변환해 주는 게 좋습니다.
 */
export async function validateClothingInFrame(uri: string): Promise<ValidateResult> {
  // 플레이스홀더: 항상 통과. 백엔드 API 연동 시 아래를 교체하세요.
  // 예: const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  //     const res = await fetch(API_URL + '/api/ai/validate', { method: 'POST', body: JSON.stringify({ image: base64 }) });
  //     const data = await res.json(); return { valid: data.valid, message: data.message };
  return { valid: true };
}
