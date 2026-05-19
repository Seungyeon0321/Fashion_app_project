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

    public async registerMyClothes(userId: number, file: Express.Multer.File, validation: {valid: boolean, confidence: number, reason?: string}, category: 'TOP' | 'BOTTOM' | 'FULL') {
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
            category: category
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 3000, // 5초
            },
            }
    );     

        return { success: true, jobId: jobId };
    }

    public async getRegisterStatus(jobId: string) {
    const items = await this.prisma.clothingItem.findMany({
        where: { jobId: jobId }
    })

    if (items.length > 0) {
        const itemsWithUrl = await Promise.all(
            items.map(async (item) => ({
                ...item,
                imageUrl: item.cropS3Key
                    ? await this.s3Service.getPresignedUrl(item.cropS3Key)
                    : null,
            }))
        )
        return { status: 'completed', items: itemsWithUrl }
    }

    const job = await this.clothingQueue.getJob(jobId)
    
    if (!job) {
        return { status: 'not_found' }
    }

    // ← 이 부분 추가
    const state = await job.getState()
    if (state === 'failed') {
        return { status: 'failed' }
    }

    return { status: 'processing' }
}
}