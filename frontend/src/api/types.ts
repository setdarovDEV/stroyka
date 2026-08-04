import type { BadgeProps } from '@/components/ui/badge';

export type Role = 'ADMIN' | 'PROAB';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type BadgeVariant = BadgeProps['variant'];

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type AuthUser = {
  id: string;
  tenantId?: string;
  tenantName?: string;
  fullName?: string;
  username?: string;
  role: Role;
  status?: UserStatus;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Project = {
  id: string;
  name: string;
  address?: string | null;
  clientName?: string | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  status?: ProjectStatus;
  _count?: {
    estimates?: number;
  };
};

export type Material = {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  defaultUnit?: { code?: string | null } | null;
};

export type WarehouseItem = {
  id: string;
  materialId: string;
  material?: Material | null;
  currentBalance: number;
  reservedQuantity?: number | null;
  availableQuantity?: number | null;
  plannedTotal?: number | null;
  usedQuantity?: number | null;
  status?: string | null;
};

export type WarehouseTransaction = {
  id: string;
  materialId: string;
  type: string;
  status: string;
  quantity: number;
  transactionDate: string;
};

export type WorkbookPreviewCellStyle = {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  color?: string | null;
  backgroundColor?: string | null;
  horizontalAlign?: string | null;
  verticalAlign?: string | null;
  wrapText?: boolean;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
};

export type WorkbookPreviewCell = {
  column: number;
  value: string;
  colSpan: number;
  rowSpan: number;
  style?: WorkbookPreviewCellStyle;
};

export type WorkbookPreviewRow = {
  rowNumber: number;
  height: number | null;
  cells: WorkbookPreviewCell[];
};

export type WorkbookPreviewColumn = {
  column: number;
  label: string;
  width: number | null;
};

export type WorkbookPreview = {
  sheetName: string;
  startColumn: number;
  endColumn: number;
  columns: WorkbookPreviewColumn[];
  rows: WorkbookPreviewRow[];
};

export type Estimate = {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  workbookPreview?: WorkbookPreview | null;
  importedAt?: string;
  createdAt: string;
  _count?: {
    lines?: number;
  };
};

export type EstimateImportSummary = {
  sectionsCount: number;
  workRowsCount: number;
  resourceRowsCount: number;
  subtotalRowsCount: number;
  totalRowsCount: number;
  warningsCount: number;
  warnings: string[];
};

export type EstimateWorkbookImportResult = {
  estimate: Estimate;
  summary: EstimateImportSummary;
};
