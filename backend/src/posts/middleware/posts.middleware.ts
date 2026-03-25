import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class FileCheckMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
    // get the file size form req.headers
    const fileSize = parseInt(req.headers['content-length'] as string, 10);
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    if (fileSize > maxFileSize) {
        return res.status(400).json({ message: 'File size exceeds the limit of 10MB.' });
    }

    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.startsWith('multipart/form-data')) {
        return res.status(400).json({ message: 'Invalid content type. Expected multipart/form-data.' });
    }

    next(); // Continue processing the request if file size is within limit
    }
}