/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';

@Injectable()
// Return items created by the YOLO model
// Do I need to do preprocessing?
export class PostsService {
    public postMyitems() {
        return { message: "My items posted successfully!" }
    }
    
}
