export const SMETA_QUEUE = 'smeta-parser';

export enum SmetaJobStatus {
  QUEUED = 'QUEUED',
  PARSING = 'PARSING',
  STORING = 'STORING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type SmetaJobData = {
  estimateId: string;
  projectId: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  bufferKey: string;
  role: string;
};

export type SmetaJobResult = {
  status: SmetaJobStatus;
  progress: number;
  estimateId?: string;
  summary?: {
    sectionsCount: number;
    workRowsCount: number;
    resourceRowsCount: number;
    subtotalRowsCount: number;
    totalRowsCount: number;
    warningsCount: number;
    warnings: string[];
  };
  error?: string;
};
