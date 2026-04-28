import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class StylesService {
    constructor(private readonly httpService: HttpService) {}

    async recommend(body: {
        user_message: string;
        intent: string;
        excluded_items: number[];
    }) {
        const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';

        try {
            const response = await firstValueFrom(this.httpService.post(`${fastapiUrl}/recommend`, body));
            return response.data;
        } catch (error) {
            throw new HttpException(error.response?.data ?? 'Failed to recommend styles', HttpStatus.BAD_GATEWAY);
        }
    }
}