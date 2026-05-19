// backend/src/style-reference/style-reference.module.ts

import { Module } from '@nestjs/common'
import { StyleReferenceController } from './style-reference.controller.js'
import { StyleReferenceService } from './providers/style-reference.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { S3Module } from '../s3/s3.module.js'

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [StyleReferenceController],
  providers: [StyleReferenceService],
  exports: [StyleReferenceService], // LangGraph 연결 시 필요
})
export class StyleReferenceModule {}