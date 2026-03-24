/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';

@Injectable()
// Return items created by the YOLO model
// Do I need to do preprocessing?
export class PostsService {
    public registerMyClothes(body: any) {
        return { message: "My clothes registered successfully!" }
    }
}
