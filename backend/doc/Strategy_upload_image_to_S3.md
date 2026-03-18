고려대상 - 
s3 accelerated upload
lambda 병렬처리

1. 전체 프로세스 흐름 (Sequence)
Client: 로그인 토큰(JWT 등)과 함께 "이미지 올릴 건데 URL 좀 줘"라고 백엔드에 요청합니다.

Backend (Middleware): 토큰을 검사해서 유효한 유저인지 체크합니다.

Backend (Logic): 유저가 확인되면 boto3(Python)나 @aws-sdk/client-s3(JS)를 사용해 S3에 "이 유저가 이 파일명으로 업로드할 수 있게 허락해줘"라고 요청합니다.

S3: 특정 시간 동안만 유효한 Presigned URL을 생성해서 백엔드에 줍니다.

Backend: 이 URL을 클라이언트에 응답으로 보냅니다.

Client: 받은 URL로 직접 이미지를 업로드합니다.