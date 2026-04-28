import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StyleController } from './style.controller.js';
import { StylesService } from './providers/style.service.js';

@Module({
  imports: [HttpModule],
  controllers: [StyleController],
  providers: [StylesService],
})
export class StyleModule {}