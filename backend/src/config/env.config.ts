// import { z } from 'zod';

// /**
//  * 환경 변수 검증 스키마
//  * System Architecture 문서에 따라 모든 환경 변수는 이 스키마를 통해 검증됩니다.
//  */
// const envSchema = z.object({
//   // General
//   NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  
//   // NestJS Backend
//   PORT: z.coerce.number().default(3000),
//   DATABASE_URL: z.string().url(),
//   JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
//   JWT_EXPIRES_IN: z.string().default('7d'),
//   CORS_ORIGIN: z.string().default('http://localhost:19006,http://localhost:3000'),
  
//   // Infrastructure (Redis)
//   REDIS_HOST: z.string().default('localhost'),
//   REDIS_PORT: z.coerce.number().default(6379),
//   REDIS_PASSWORD: z.string().optional(),
  
//   // Storage (AWS S3)
//   AWS_REGION: z.string().default('ca-central-1'),
//   AWS_ACCESS_KEY_ID: z.string(),
//   AWS_SECRET_ACCESS_KEY: z.string(),
//   AWS_S3_BUCKET_NAME: z.string(),
  
//   // AI Worker (Python)
//   AI_WORKER_URL: z.string().url().default('http://localhost:8000'),
//   AI_WORKER_TIMEOUT: z.coerce.number().default(30000),
//   AI_MODEL_PATH: z.string().default('./models/v1/'),
// });

// export type EnvConfig = z.infer<typeof envSchema>;

// /**
//  * 환경 변수 검증 및 반환
//  * 필수 변수가 없으면 애플리케이션이 시작되지 않습니다.
//  */
// export function validateEnv(): EnvConfig {
//   try {
//     return envSchema.parse(process.env);
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       console.error('❌ 환경 변수 검증 실패:');
//       error.errors.forEach((err) => {
//         console.error(`  - ${err.path.join('.')}: ${err.message}`);
//       });
//       throw new Error('환경 변수 검증에 실패했습니다. .env 파일을 확인하세요.');
//     }
//     throw error;
//   }
// }
