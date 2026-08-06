import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

@Injectable()
export class SmetaBufferStore implements OnModuleDestroy {
  private redis: IORedis;

  constructor() {
    this.redis = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async save(key: string, buffer: Buffer, ttlSeconds = 300): Promise<void> {
    const stored = Buffer.from(buffer);
    await this.redis.set(`smeta:buffer:${key}`, stored, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<Buffer | null> {
    return this.redis.getBuffer(`smeta:buffer:${key}`);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(`smeta:buffer:${key}`);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
