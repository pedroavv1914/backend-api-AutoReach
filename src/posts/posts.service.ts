import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import dayjs from 'dayjs';

interface ListParams {
  status?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService, private queue: QueueService) {}

  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(email: string, dto: any) {
    const user = await this.getUserByEmail(email);
    const scheduledAt = new Date(dto.scheduledAt);
    const post = await this.prisma.post.create({
      data: {
        userId: user.id,
        content: dto.content ?? null,
        mediaUrls: dto.mediaUrls ?? [],
        networks: dto.networks,
        scheduledAt,
        status: 'pending',
      },
    });

    // Agendar job por rede
    for (const provider of dto.networks) {
      await this.prisma.postPublish.create({
        data: { postId: post.id, provider, status: 'pending' },
      });
      await this.queue.add(
        'publish',
        { postId: post.id, provider },
        { delay: Math.max(0, scheduledAt.getTime() - Date.now()) },
      );
    }

    return post;
  }

  async list(email: string, params: ListParams) {
    const user = await this.getUserByEmail(email);
    const where: any = { userId: user.id };
    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.scheduledAt = {};
      if (params.from) (where.scheduledAt as any).gte = dayjs(params.from).toDate();
      if (params.to) (where.scheduledAt as any).lte = dayjs(params.to).toDate();
    }
    const skip = (params.page - 1) * params.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({ where, orderBy: { scheduledAt: 'desc' }, skip, take: params.pageSize }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async get(email: string, id: string) {
    const user = await this.getUserByEmail(email);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    return post;
  }

  async update(email: string, id: string, dto: any) {
    const user = await this.getUserByEmail(email);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.status !== 'pending') throw new ForbiddenException('Somente posts pendentes podem ser editados');

    return this.prisma.post.update({
      where: { id },
      data: {
        content: dto.content ?? post.content,
        mediaUrls: dto.mediaUrls ?? post.mediaUrls,
        networks: dto.networks ?? post.networks,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : post.scheduledAt,
      },
    });
  }

  async remove(email: string, id: string) {
    const user = await this.getUserByEmail(email);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.status !== 'pending') throw new ForbiddenException('Somente posts pendentes podem ser removidos');

    await this.prisma.postPublish.deleteMany({ where: { postId: id } });
    await this.prisma.post.delete({ where: { id } });
    return { deleted: true };
  }
}
