/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { Multer } from 'multer';
@Injectable()
// Return items created by the YOLO model
// Do I need to do preprocessing?
export class PostsService {
    public registerMyClothes(file: Multer.File, validation: {valid: boolean, confidence: number, reason?: string}) {
        return { message: "My clothes registered successfully!" }
    }
}
