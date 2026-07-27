import type { BadgeProps } from '@/components/ui/badge';

export type Role = 'ADMIN' | 'PROAB';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
export type MaterialRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
export type ReportType =
  | 'GENERAL_SUMMARY'
  | 'ESTIMATE_VS_ACTUAL'
  | 'MATERIALS_USAGE'
  | 'WAREHOUSE_STATE'
  | 'STOCK_MOVEMENT'
  | 'BRIGADE_WORKERS'
  | 'MACHINE_HOURS'
  | 'CONSTRUCTION_PHASE'
  | 'FINANCIAL'
  | 'ALERT_RISK';
export type ReportPeriod = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'FULL_PROJECT';
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
    users?: number;
    estimates?: number;
    alerts?: number;
  };
};

export type UserListItem = {
  id: string;
  fullName: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  status: UserStatus;
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

export type Brigade = {
  id: string;
  name: string;
  type?: string | null;
  responsiblePerson?: string | null;
  numberOfWorkers?: number | null;
  status?: string | null;
  actualProgress?: number | null;
};

export type WorkLog = {
  id: string;
  brigadeId: string;
  brigade?: { id: string; name: string } | null;
  workDate: string;
  workerCount: number;
  hoursWorked: number;
  outputProgress?: number | null;
  workDescription?: string | null;
};

export type Machine = {
  id: string;
  name: string;
  type?: string | null;
  model?: string | null;
  status?: string | null;
  notes?: string | null;
};

export type MachineLog = {
  id: string;
  machineId: string;
  machine?: { id: string; name: string } | null;
  workDate: string;
  hoursWorked: number;
  operatorName?: string | null;
  description?: string | null;
};

export type EstimateLine = {
  id: string;
  estimateId?: string;
  code: string;
  name: string;
  category?: string | null;
  sourceSerialRaw?: string | null;
  sourceSheet?: string | null;
  sourceRowNumber?: number | null;
  rowType?: 'SECTION' | 'WORK' | 'RESOURCE' | 'SUBTOTAL' | 'TOTAL' | null;
  parentLineId?: string | null;
  sortOrder?: number | null;
  resourceCodeRaw?: string | null;
  unitLabelRaw?: string | null;
  normCodeRaw?: string | null;
  formulaRaw?: string | null;
  plannedQuantity: number;
  usedQuantity?: number | null;
  plannedUnitPrice?: number | null;
  plannedTotalPrice?: number | null;
  notes?: string | null;
  itemType?: string | null;
  createdAt?: string;
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

export type Alert = {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  createdAt: string;
};

export type MaterialRequest = {
  id: string;
  requestedBy: string;
  requestedByUser?: { fullName?: string | null } | null;
  approvedByUser?: { fullName?: string | null } | null;
  materialId: string;
  quantity: number;
  purpose?: string | null;
  status: MaterialRequestStatus;
};

export type ReportExport = {
  id: string;
  reportType: ReportType;
  period: ReportPeriod;
  format: string;
  filePath?: string | null;
  createdAt: string;
  generatedByUser?: { fullName?: string | null } | null;
};

export type ReportResult = {
  id: string;
  filePath: string;
  reportType: ReportType;
};

export type Zone = {
  id: string;
  name: string;
  floor?: string | null;
  section?: string | null;
  status: string;
  progressPercent?: number | null;
};

export type DashboardSummary = {
  overallProgress: number;
  totalEstimateLines: number;
  totalEstimateQuantity: number;
  totalUsedQuantity: number;
  totalPlannedCost?: number;
  warehouseItems: number;
  totalBalance: number;
  activeBrigades: number;
  machineHoursTotal: number;
  workerHoursTotal: number;
  alerts: { criticalCount: number; warningCount: number; infoCount: number };
  recentAlerts: Alert[];
  materialChartData: { name: string; used: number }[];
  progressByPhase: { phaseName: string; avgUsedQuantity: number }[];
};
