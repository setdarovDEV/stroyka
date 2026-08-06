import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  SMETA_QUEUE,
  SmetaJobData,
  SmetaJobResult,
  SmetaJobStatus,
} from './smeta-queue.constants';
import { SmetaJobStateStore } from './smeta-job-state.store';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

@Injectable()
export class SmetaQueueService implements OnModuleDestroy {
  private connection: IORedis;
  private queue: Queue<SmetaJobData, SmetaJobResult>;
  private stateStore: SmetaJobStateStore;

  constructor() {
    this.connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.queue = new Queue<SmetaJobData, SmetaJobResult>(SMETA_QUEUE, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 500 },
      },
    });
    this.stateStore = new SmetaJobStateStore();
  }

  async enqueue(data: SmetaJobData) {
    const job = await this.queue.add('parse-workbook', data, {
      jobId: data.estimateId,
    });
    await this.stateStore.save(String(job.id), {
      status: SmetaJobStatus.QUEUED,
      progress: 0,
      estimateId: data.estimateId,
    });
    return job.id!;
  }

  async getStatus(jobId: string): Promise<SmetaJobResult> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return { status: SmetaJobStatus.FAILED, progress: 0, error: 'Job not found' };
    }

    const state = await job.getState();
    const progress = job.progress as number ?? 0;
    const result = job.returnvalue as SmetaJobResult | undefined;
    const failedReason = job.failedReason;
    const stagedState = await this.stateStore.get(jobId);

    if (state === 'completed' && result) {
      return { ...result, progress: 100 };
    }
    if (state === 'failed') {
      return stagedState ?? { status: SmetaJobStatus.FAILED, progress, error: failedReason || 'Unknown error' };
    }
    if (stagedState) return stagedState;

    const statusMap: Record<string, SmetaJobStatus> = {
      waiting: SmetaJobStatus.QUEUED,
      active: SmetaJobStatus.PARSING,
      delayed: SmetaJobStatus.QUEUED,
    };

    return {
      status: statusMap[state] ?? SmetaJobStatus.PARSING,
      progress,
    };
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
    await this.stateStore.onModuleDestroy();
  }
}
