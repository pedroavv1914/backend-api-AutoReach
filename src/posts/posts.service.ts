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

  async getUserByEmail(email: string, tenantId: string) {
    const user = await (this.prisma as any).user.findFirst({ 
      where: { email, tenantId } 
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(email: string, dto: any, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
    const scheduledAt = new Date(dto.scheduledAt);
    const post = await (this.prisma as any).post.create({
      data: {
        userId: user.id,
        tenantId: tenantId,
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

  async list(email: string, params: ListParams, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
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

  async get(email: string, id: string, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    return post;
  }

  async update(email: string, id: string, dto: any, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
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

  async remove(email: string, id: string, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.status !== 'pending') throw new ForbiddenException('Somente posts pendentes podem ser removidos');

    await this.prisma.postPublish.deleteMany({ where: { postId: id } });
    await this.prisma.post.delete({ where: { id } });
    return { deleted: true };
  }

  async publishes(email: string, id: string, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');

    return this.prisma.postPublish.findMany({
      where: { postId: id },
      orderBy: { provider: 'asc' },
      select: {
        id: true,
        provider: true,
        status: true,
        publishedAt: true,
        providerPostId: true,
        errorMessage: true,
      },
    });
  }

  async cancel(email: string, id: string, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.status !== 'pending') throw new ForbiddenException('Somente posts pendentes podem ser cancelados');

    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id }, data: { status: 'canceled' } }),
      this.prisma.postPublish.updateMany({ where: { postId: id, status: 'pending' }, data: { status: 'canceled' } }),
    ]);
    return { canceled: true };
  }

  async publishNow(email: string, id: string, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.status !== 'pending') throw new ForbiddenException('Somente posts pendentes podem ser publicados agora');

    // Atualizar scheduledAt para agora (opcional)
    await this.prisma.post.update({ where: { id }, data: { scheduledAt: new Date() } });

    const publishes = await this.prisma.postPublish.findMany({ where: { postId: id, status: 'pending' } });
    for (const p of publishes) {
      await this.queue.addPublishJob(id, p.provider, 0);
    }
    return { enqueued: publishes.map((p) => p.provider) };
  }

  async retryPublish(email: string, id: string, publishId: string, tenantId: string) {
    const user = await this.getUserByEmail(email, tenantId);
    const post = await this.prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!post) throw new NotFoundException('Post não encontrado');

    const publish = await this.prisma.postPublish.findFirst({ where: { id: publishId, postId: id } });
    if (!publish) throw new NotFoundException('Publish não encontrado');
    if (!['error', 'pending'].includes(publish.status)) {
      throw new ForbiddenException('Somente publishes em erro ou pendentes podem ser reenviadas');
    }

    await this.prisma.post.update({ where: { id }, data: { status: 'pending', errorMessage: null } });
    await this.prisma.postPublish.update({ where: { id: publishId }, data: { status: 'pending', errorMessage: null } });
    await this.queue.addPublishJob(id, publish.provider, 0);
    return { retried: publishId };
  }
}
