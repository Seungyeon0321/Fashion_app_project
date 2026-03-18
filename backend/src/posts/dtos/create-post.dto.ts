import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMyItemDto {
    @ApiProperty({description: 'this is api'})
    @IsString()
    @IsNotEmpty()
    title: string;
}