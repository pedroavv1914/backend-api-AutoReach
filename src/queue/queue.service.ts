import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, JobsOptions, Job } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAME = 'publish-posts';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  readonly queue: Queue;
  private worker?: Worker;

  constructor() {
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
        // No futuro: publicar por provedor. Por ora, apenas loga.
        // eslint-disable-next-line no-console
        console.log('Processing job', job.id, job.name, job.data);
      },
      { connection: this.connection },
    );
  }

  async add(name: string, data: any, opts?: JobsOptions) {
    return this.queue.add(name, data, opts);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit();
  }
}
