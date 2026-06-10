// backend/src/outfit/outfit.service.ts  ← 기존 파일 수정

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { S3Service } from '../../s3/s3.service.js';
import { CreateOutfitDto } from '../dto/create-outfit.dto.js';
import { Category } from '../../generated/prisma/client.js';

@Injectable()
export class OutfitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3:     S3Service,
  ) {}

  async create(userId: number, dto: CreateOutfitDto) {
    // 외부 아이템 먼저 upsert → externalItemId 확보
    // upsert 이유: 같은 아이템을 여러 코디에 저장할 수 있음
    //              매번 새로 만들면 중복 데이터 발생
    const resolvedItems = await Promise.all(
      dto.items.map(async (item) => {
        if (item.isExternal && item.externalId) {
         const external = await this.prisma.externalItem.upsert({
            where: {
              userId_externalId: { userId, externalId: item.externalId },
            },
            update: {},  // 이미 있으면 업데이트 없이 그냥 가져옴
            create: {
              userId,
              externalId:  item.externalId,
              name:        item.name        ?? '외부 아이템',
              imageUrl:    item.imageUrl    ?? '',
              purchaseUrl: item.purchaseUrl ?? '',
              category:    (item.category?.toUpperCase() as Category) ?? 'TOP',
              source:      'naver_shopping',
              styleKeywords: [],
            },
          });
          return { externalItemId: external.id };
        }
        return { closetItemId: item.closetItemId };
      }),
    );

    return this.prisma.outfit.create({
      data: {
        userId,
        source:          'AI_SUGGEST',
        recordedTemp:    dto.recordedTemp,
        recordedWeather: dto.recordedWeather,
        items: {
          create: resolvedItems,
        },
      },
      include: { items: true },
    });
  }

  async findAllByUser(userId: number) {
    const outfits = await this.prisma.outfit.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            closetItem: {
              select: {
                id:          true,
                cropS3Key:   true,
                category:    true,
                subCategory: true,
                brand:       true,
                colors:      true,
              },
            },
            // 외부 아이템도 함께 로드
            externalItem: {
              select: {
                id:          true,
                name:        true,
                imageUrl:    true,
                purchaseUrl: true,
                category:    true,
              },
            },
          },
        },
      },
    });

    return Promise.all(
      outfits.map(async (outfit) => ({
        ...outfit,
        items: await Promise.all(
          outfit.items.map(async (item) => ({
            ...item,
            closetItem: item.closetItem
              ? {
                  ...item.closetItem,
                  imageUrl: item.closetItem.cropS3Key
                    ? await this.s3.getPresignedUrl(item.closetItem.cropS3Key)
                    : null,
                }
              : null,
            externalItem: item.externalItem ?? null,
          })),
        ),
      })),
);
  }
}