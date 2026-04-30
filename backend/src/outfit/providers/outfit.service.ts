// backend/src/outfit/outfit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateOutfitDto } from '../dto/create-outfit.dto.js';

@Injectable()
export class OutfitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateOutfitDto) {
    return this.prisma.outfit.create({
      data: {
        userId,
        source: 'AI_SUGGEST',
        recordedTemp:    dto.recordedTemp,
        recordedWeather: dto.recordedWeather,
        items: {
          create: dto.items.map((item) => ({
            closetItemId: item.closetItemId,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.outfit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            closetItem: {
              select: {
                id: true,
                imageUrl: true,
                category: true,
              },
            },
          },
        },
      },
    });
  }
}