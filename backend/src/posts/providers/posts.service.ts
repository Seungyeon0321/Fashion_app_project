/*
https://docs.nestjs.com/providers#services
*/
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { S3Service } from '../../s3/s3.service.js';

@Injectable()
// Return items created by the YOLO model
// Do I need to do preprocessing?
export class PostsService {
    constructor(@InjectQueue('clothing') private readonly clothingQueue: Queue, private readonly s3Service: S3Service) {}

    public async registerMyClothes(userId: string, file: Express.Multer.File, validation: {valid: boolean, confidence: number, reason?: string}) {
        // check if the image is valid
        if (!validation.valid) {
            throw new BadRequestException('Invalid clothing image');
        }

        // upload the image to S3
        const { key, url } = await this.s3Service.uploadClothingImage(file.buffer, userId);
        
        // add the image to the queue
        const job = await this.clothingQueue.add('analyze-clothing', {
            job_id: `job-${Date.now()}`,
            userId: userId,
            s3Key: key,
        });

        return { success: true, JobId: job.id };
    }

    public async getRegisterStatus(jobId: string) {
        const job = await this.clothingQueue.getJob(jobId)

        if (!job) {
            return { status: 'not found' }
        }

        const state = await job.getState()
        return { status: state }
    }
}