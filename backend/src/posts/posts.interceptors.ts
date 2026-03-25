import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClothingValidationService } from './clothing-class/clothing-validation.service.js';

@Injectable()
export class PostsInterceptor implements NestInterceptor {

    constructor(private readonly clothingValidationService: ClothingValidationService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const file = request.file as Express.Multer.File;


        // check if file is uploaded
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const validationResult = await this.clothingValidationService.validate(file.buffer);
        
        if (!validationResult.valid) {
            throw new BadRequestException({
                valid: false,
                reason: validationResult.reason,
                message: 'Your item is not a categorized clothing item'
            })
        }

        request.clothingValidation = validationResult;

        return next.handle();
    }
}