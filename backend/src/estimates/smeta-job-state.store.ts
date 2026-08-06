import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { SmetaJobResult } from './smeta-queue.constants';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

@Injectable()
export class SmetaJobStateStore implements OnModuleDestroy {
  private redis: IORedis;

  constructor() {
    this.redis = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async save(jobId: string, state: SmetaJobResult, ttlSeconds = 3600) {
    await this.redis.set(this.key(jobId), JSON.stringify(state), 'EX', ttlSeconds);
  }

  async get(jobId: string): Promise<SmetaJobResult | null> {
    const raw = await this.redis.get(this.key(jobId));
    if (!raw) return null;
    return JSON.parse(raw) as SmetaJobResult;
  }

  async delete(jobId: string) {
    await this.redis.del(this.key(jobId));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  private key(jobId: string) {
    return `smeta:job-state:${jobId}`;
  }
}
