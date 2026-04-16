/*
https://docs.nestjs.com/providers#services
*/
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { S3Service } from '../../s3/s3.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { randomUUID } from 'crypto';

@Injectable()
// Return items created by the YOLO model
// Do I need to do preprocessing?
export class PostsService {
    constructor(@InjectQueue('clothing') private readonly clothingQueue: Queue, private readonly s3Service: S3Service, private readonly prisma: PrismaService) {}

    public async registerMyClothes(userId: number, file: Express.Multer.File, validation: {valid: boolean, confidence: number, reason?: string}) {
        // check if the image is valid
        if (!validation.valid) {
            throw new BadRequestException('Invalid clothing image');
        }

        const jobId = `job-${randomUUID()}`;

        // upload the image to S3
        const { key, url } = await this.s3Service.uploadClothingImage(file.buffer, userId.toString(), jobId);

        
        // add the image to the queue
        const job = await this.clothingQueue.add('analyze-clothing', {
            job_id: jobId,
            userId: userId,
            s3Key: key,
        });

        

        return { success: true, JobId: job.id };
    }

    public async getRegisterStatus(jobId: string) {
        const items = await this.prisma.clothingItem.findMany({
            where: { jobId: jobId }
        })
    
        if (items.length > 0) {
            return { status: 'completed', items }
        }
    
        // DB에 없으면 아직 처리 중
        const job = await this.clothingQueue.getJob(jobId)
        if (!job) {
            return { status: 'not_found' }
        }
    
        return { status: 'processing' }

    
    }
}