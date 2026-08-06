export const SMETA_QUEUE = 'smeta-parser';

export enum SmetaJobStatus {
  QUEUED = 'QUEUED',
  PARSING = 'PARSING',
  PARSED = 'PARSED',
  STORING = 'STORING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type SmetaImportSummary = {
  sectionsCount: number;
  workRowsCount: number;
  resourceRowsCount: number;
  subtotalRowsCount: number;
  totalRowsCount: number;
  warningsCount: number;
  warnings: string[];
};

export type SmetaStagedLine = {
  id: string;
  estimateId: string;
  code: string;
  name: string;
  category: string | null;
  sourceSerialRaw: string | null;
  sourceSheet: string;
  sourceRowNumber: number;
  rowType: string;
  parentLineId: string | null;
  sortOrder: number;
  resourceCodeRaw: string | null;
  unitLabelRaw: string | null;
  normCodeRaw: string | null;
  formulaRaw: string | null;
  plannedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  plannedUnitPrice: number | null;
  plannedTotalPrice: number | null;
  notes: string | null;
  itemType: string | null;
};

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
  summary?: SmetaImportSummary;
  stagedLines?: SmetaStagedLine[];
  stagedTotal?: number;
  error?: string;
};
