import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterClosetItemDto } from './dtos/closet.dtos.js';

@Injectable()
export class ClosetService {
    constructor(private readonly prisma: PrismaService) {}

    // POST /closet/register
    async register(userId: number, dto: RegisterClosetItemDto) {
        // 1. clothing_items에서 원본 데이터 가져오기
        const source = await this.prisma.clothingItem.findUnique({
            where: {
                id: dto.clothingItemId,
            }
        })

        if (!source) {
            throw new NotFoundException('Clothing item not found');
        }

        const closetItem = await this.prisma.closetItem.create({
            data: {
                userId,
                clothingItemId: source.id,
                cropS3Key: source.cropS3Key,
                category: dto.category,
                subCategory: dto.subCategory,
                brand: dto.brand,
                colors: dto.colors,
                memo: dto.memo,
                isFavorite: false,
                wearCount: 0,
            }
        })
    }
      // GET /closet
    async findAllByUserId(userId: number) {
        return this.prisma.closetItem.findMany({
        where: { userId, isArchived: false },
        orderBy: { createdAt: 'desc' },
        });
    }
}
