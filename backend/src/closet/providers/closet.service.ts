import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { S3Service } from '../../s3/s3.service.js';
import { RegisterClosetItemDto, UpdateClosetItemDto } from '../dtos/closet.dtos.js';

@Injectable()
export class ClosetService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,  // ← 추가
    ) {}

    // POST /closet/register
    async register(userId: number, dto: RegisterClosetItemDto) {
        const source = await this.prisma.clothingItem.findUnique({
            where: { id: dto.clothingItemId }
        });

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
        });

        return {
            ...closetItem,
            imageUrl: closetItem.cropS3Key
                ? await this.s3.getPresignedUrl(closetItem.cropS3Key)
                : null,
        };
    }

    // GET /closet
    async findAllByUserId(userId: number) {
        const items = await this.prisma.closetItem.findMany({
            where: { userId, isArchived: false },
            orderBy: { createdAt: 'desc' },
        });

        // Presigned URL을 병렬로 발급 (Promise.all — 순차 X, 동시 처리)
        return Promise.all(
            items.map(async (item) => ({
                ...item,
                imageUrl: item.cropS3Key
                    ? await this.s3.getPresignedUrl(item.cropS3Key)
                    : null,
            }))
        );
    }

    async archive(userId: number, closetItemId: number) {
        const item = await this.prisma.closetItem.findUnique({
            where: { id: closetItemId, userId },
        });
        if (!item || item.userId !== userId) {
            throw new NotFoundException('Closet item not found');
        }
        return this.prisma.closetItem.update({
            where: { id: item.id },
            data: { isArchived: true },
        });
    }

    async remove(userId: number, closetItemId: number) {
        const item = await this.prisma.closetItem.findUnique({
            where: { id: closetItemId, userId },
        });
        if (!item || item.userId !== userId) {
            throw new NotFoundException('Closet item not found');
        }
        return this.prisma.closetItem.delete({
            where: { id: item.id },
        });
    }

    async update(userId: number, id: number, dto: UpdateClosetItemDto) {
        const item = await this.prisma.closetItem.findUnique({
            where: { id },
        });
        if (!item || item.userId !== userId) {
            throw new NotFoundException('Closet item not found');
        }
        return this.prisma.closetItem.update({
            where: { id },
            data: { ...dto },
        });
    }
}