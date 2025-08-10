import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, JobsOptions, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService, ProviderName } from '../providers/providers.service';

const QUEUE_NAME = 'publish-posts';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  readonly queue: Queue;
  private worker?: Worker;

  constructor(private readonly prisma: PrismaService, private readonly providers: ProvidersService) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, {
      // BullMQ workers require disabling request retry logic
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    } as any);
    this.queue = new Queue(QUEUE_NAME, { connection: this.connection });

    // Worker de exemplo que apenas marca como "processado"
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const { postId, provider } = job.data as { postId: string; provider: string };
        // eslint-disable-next-line no-console
        console.log('Processing job', job.id, provider, postId);

        try {
          // Verificar se o post/publicação ainda está pendente
          const [post, publish] = await Promise.all([
            this.prisma.post.findUnique({ where: { id: postId } }),
            this.prisma.postPublish.findFirst({ where: { postId, provider } }),
          ]);
          if (!post || !publish) return;
          if (post.status !== 'pending') {
            // eslint-disable-next-line no-console
            console.log('Skipping job: post not pending', post.status);
            return;
          }
          if (publish.status !== 'pending') {
            // eslint-disable-next-line no-console
            console.log('Skipping job: publish not pending', publish.status);
            return;
          }

          // Verificar se existe conta vinculada para esse provider
          const account = await this.prisma.account.findFirst({ where: { userId: post.userId, provider } });
          if (!account) {
            await this.prisma.postPublish.updateMany({
              where: { postId, provider },
              data: { status: 'error', errorMessage: 'Conta não vinculada para o provedor' },
            });
            // Forçar roll-up para erro
            await this.prisma.post.update({ where: { id: postId }, data: { status: 'error', errorMessage: 'Conta não vinculada' } });
            return;
          }

          // Publicação real (abstraída pelo ProvidersService)
          const result = await this.providers.publish({
            provider: provider as ProviderName,
            accountId: account.id,
            content: post.content ?? '',
            mediaUrls: post.mediaUrls as any,
          });
          await this.prisma.postPublish.update({
            where: { id: publish.id },
            data: { status: 'published', publishedAt: new Date(), errorMessage: null, providerPostId: result.providerPostId },
          });

          // Se todas as publishes concluídas (sem pendentes), marcar post como 'published'
          const remaining = await this.prisma.postPublish.count({ where: { postId, status: 'pending' } });
          if (remaining === 0) {
            await this.prisma.post.update({ where: { id: postId }, data: { status: 'published', errorMessage: null } });
          }
        } catch (err: any) {
          const message = err?.message || 'Erro ao publicar';
          await this.prisma.postPublish.updateMany({
            where: { postId, provider },
            data: { status: 'error', errorMessage: message },
          });
          await this.prisma.post.update({ where: { id: postId }, data: { status: 'error', errorMessage: message } });
        }
      },
      { connection: this.connection },
    );
  }

  async add(name: string, data: any, opts?: JobsOptions) {
    const defaults: JobsOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    };
    return this.queue.add(name, data, { ...defaults, ...(opts || {}) });
  }

  async addPublishJob(postId: string, provider: string, delayMs = 0) {
    return this.add('publish', { postId, provider }, { delay: Math.max(0, delayMs) });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit();
  }
}
