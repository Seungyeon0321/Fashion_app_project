import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { S3Service } from '../../s3/s3.service.js';
import { RegisterClosetItemDto, UpdateClosetItemDto } from '../dto/closet.dto.js';
import { FitType } from '../../generated/prisma/client.js';

@Injectable()
export class ClosetService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
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

        return Promise.all(
            items.map(async (item) => ({
                ...item,
                imageUrl: item.cropS3Key
                    ? await this.s3.getPresignedUrl(item.cropS3Key)
                    : null,
            }))
        );
    }

    // GET /closet/:id
    async findOneById(userId: number, closetItemId: number) {
        const item = await this.prisma.closetItem.findUnique({
            where: { id: closetItemId, userId },
        });
        if (!item || item.userId !== userId) {
            throw new NotFoundException('Closet item not found');
        }
        return {
            ...item,
            imageUrl: item.cropS3Key
                ? await this.s3.getPresignedUrl(item.cropS3Key)
                : null,
        };
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

    // PATCH /closet/:id
    async update(userId: number, id: number, dto: UpdateClosetItemDto) {
        const item = await this.prisma.closetItem.findUnique({
            where: { id },
        });
        if (!item || item.userId !== userId) {
            throw new NotFoundException('Closet item not found');
        }

        // material 또는 fit이 업데이트되면 name 자동 재생성
        // 왜 여기서 생성하는가?
        //   ClothingDetailPopup에서 material/fit을 입력하는 시점이
        //   name을 가장 정확하게 만들 수 있는 첫 번째 시점이기 때문.
        //   이후 다시 material/fit을 수정해도 name이 자동 갱신됨.
        const shouldUpdateName = dto.material !== undefined || dto.fit !== undefined;

        let name: string | undefined;
        if (shouldUpdateName) {
            // 기존 값 + 새로 들어온 값 병합해서 name 생성
            // dto에 없는 필드는 기존 item 값 사용
            name = generateName({
                colors:      dto.colors      ?? item.colors,
                brand:       dto.brand       ?? item.brand,
                material:    dto.material    ?? item.material,
                fit:         dto.fit         ?? item.fit,
                subCategory: dto.subCategory ?? item.subCategory,
            });
        }

        return this.prisma.closetItem.update({
            where: { id },
            data: {
                ...dto,
                // name이 생성됐으면 같이 업데이트, 아니면 건드리지 않음
                ...(name !== undefined && { name }),
            },
        });
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// generateName()
//
// 역할:
//   colors + brand + material + fit + subCategory를 조합해서
//   사람이 읽기 좋은 아이템 이름을 자동 생성.
//
// 예시:
//   colors=["navy"], brand="Zara", material="wool", fit=SLIM, subCategory=JACKET
//   → "Navy Wool Zara Slim Jacket"
//
// 왜 LLM 안 쓰는가?
//   name은 LLM의 자연어 코디 설명에서 참조하는 용도.
//   핵심 로직(벡터 검색, 랭킹)은 embedding + category + tags 기반이므로
//   name 품질이 추천 정확도에 영향 없음.
//   → 간단한 문자열 조합으로 충분, LLM 비용 낭비 불필요.
//
// 없는 필드는 건너뜀 → 부분적인 정보만 있어도 동작.
// ──────────────────────────────────────────────────────────────────────────────

export function generateName(params: {
    colors?:      string[] | null;
    brand?:       string | null;
    material?:    string | null;
    fit?:         FitType | string | null;
    subCategory?: string | null;
}): string {
    const parts: string[] = [];

    // 첫 번째 색상만 사용 (대문자로 시작)
    // 예: ["navy", "white"] → "Navy"
    if (params.colors && params.colors.length > 0) {
        const color = params.colors[0];
        parts.push(color.charAt(0).toUpperCase() + color.slice(1).toLowerCase());
    }

    // 재질 (capitalize)
    // 예: "wool" → "Wool"
    if (params.material) {
        const material = params.material.trim();
        parts.push(material.charAt(0).toUpperCase() + material.slice(1).toLowerCase());
    }

    // 브랜드 (원본 대소문자 유지)
    // 예: "Zara", "UNIQLO"
    if (params.brand) {
        parts.push(params.brand.trim());
    }

    // 핏 (FitType enum → 사람이 읽기 좋은 텍스트)
    // 예: FitType.SLIM → "Slim"
    if (params.fit) {
        const fitLabel: Record<string, string> = {
            SLIM:      'Slim',
            REGULAR:   'Regular',
            OVERSIZED: 'Oversized',
            RELAXED:   'Relaxed',
        };
        const fitStr = typeof params.fit === 'string' ? params.fit : String(params.fit);
        const label  = fitLabel[fitStr.toUpperCase()];
        if (label) parts.push(label);
    }

    // subCategory (snake_case → Title Case)
    // 예: "T_SHIRT_SHORT" → "T Shirt Short"
    //     "SLACKS"        → "Slacks"
    if (params.subCategory) {
        const subCat = params.subCategory
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        parts.push(subCat);
    }

    // 조합된 부분이 하나도 없으면 기본값 반환
    if (parts.length === 0) {
        return 'Clothing Item';
    }

    return parts.join(' ');
}