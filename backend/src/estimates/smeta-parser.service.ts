import { BadRequestException, Injectable } from '@nestjs/common';
import { EstimateLineItemType, EstimateLineRowType } from '@prisma/client';
import * as ExcelJS from 'exceljs';

type EstimateLineRowTypeValue = EstimateLineRowType;

type WorkbookPreviewCellStyle = {
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

type ParsedLine = {
  sourceSerialRaw?: string | null;
  code: string;
  name: string;
  category?: string;
  plannedQuantity: number;
  plannedUnitPrice?: number | null;
  plannedTotalPrice?: number | null;
  itemType: EstimateLineItemType;
  notes?: string;
  sourceSheet: string;
  sourceRowNumber: number;
  rowType: EstimateLineRowTypeValue;
  parentSortOrder?: number | null;
  sortOrder: number;
  resourceCodeRaw?: string | null;
  unitLabelRaw?: string | null;
  normCodeRaw?: string | null;
  formulaRaw?: string | null;
};

export type ParsedSmetaWorkbook = {
  lines: ParsedLine[];
  preview: WorkbookPreview;
  warnings: string[];
  summary: {
    sectionsCount: number;
    workRowsCount: number;
    resourceRowsCount: number;
    subtotalRowsCount: number;
    totalRowsCount: number;
    warningsCount: number;
  };
};

type FormulaCell = {
  formula?: string;
  result?: unknown;
};

@Injectable()
export class SmetaParserService {
  async parseWorkbook(buffer: Buffer): Promise<ParsedSmetaWorkbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const warnings: string[] = [];
    const sheet = workbook.getWorksheet('_ЛРВ');
    if (!sheet) throw new BadRequestException('Workbook must contain _ЛРВ sheet');
    if (!workbook.getWorksheet('_РС')) warnings.push('_РС sheet is missing');

    const dataStartRow = this.findDataStartRow(sheet);
    if (!dataStartRow) throw new BadRequestException('Expected _ЛРВ header band was not found');

    const lines: ParsedLine[] = [];
    let currentSection: string | undefined;
    let currentWorkSortOrder: number | null = null;
    let sawSection = false;
    let sawWork = false;
    let sortOrder = 0;

    for (let rowNumber = dataStartRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const serial = this.getText(row.getCell(4));
      const codeCell = this.getText(row.getCell(5));
      const nameCell = this.getText(row.getCell(6));
      const unitCell = this.getText(row.getCell(7));
      const qtyNorm = this.getNumber(row.getCell(8), warnings, rowNumber, 'H');
      const qtyProject = this.getNumber(row.getCell(9), warnings, rowNumber, 'I');
      const unitPrice = this.getNumber(row.getCell(10), warnings, rowNumber, 'J');
      const totalPrice = this.getNumber(row.getCell(11), warnings, rowNumber, 'K');

      const rowText = [serial, codeCell, nameCell, unitCell].filter(Boolean).join(' ');
      if (!rowText && qtyNorm == null && qtyProject == null && unitPrice == null && totalPrice == null) continue;

      const sectionTitle = serial?.includes('РАЗДЕЛ') ? serial : undefined;
      if (sectionTitle) {
        sawSection = true;
        currentSection = sectionTitle;
        currentWorkSortOrder = null;
        sortOrder += 1;
        lines.push({
          sourceSerialRaw: serial || null,
          code: `SECTION-${rowNumber}`,
          name: sectionTitle,
          category: currentSection,
          plannedQuantity: 0,
          plannedUnitPrice: null,
          plannedTotalPrice: null,
          itemType: EstimateLineItemType.OTHER,
          sourceSheet: sheet.name,
          sourceRowNumber: rowNumber,
          rowType: 'SECTION',
          sortOrder,
          normCodeRaw: null,
          resourceCodeRaw: null,
          unitLabelRaw: null,
          formulaRaw: this.extractFormulaRaw(row),
        });
        continue;
      }

      if (this.isSubtotalRow(nameCell, unitCell)) {
        sortOrder += 1;
        lines.push({
          sourceSerialRaw: serial || null,
          code: `SUBTOTAL-${rowNumber}`,
          name: nameCell || 'ВСЕГО ПО РАЗДЕЛУ',
          category: currentSection,
          plannedQuantity: 0,
          plannedUnitPrice: unitPrice,
          plannedTotalPrice: totalPrice,
          itemType: EstimateLineItemType.OTHER,
          sourceSheet: sheet.name,
          sourceRowNumber: rowNumber,
          rowType: 'SUBTOTAL',
          parentSortOrder: null,
          sortOrder,
          resourceCodeRaw: null,
          unitLabelRaw: unitCell || null,
          normCodeRaw: null,
          formulaRaw: this.extractFormulaRaw(row),
        });
        currentWorkSortOrder = null;
        continue;
      }

      if (this.isTotalRow(nameCell, unitCell)) {
        sortOrder += 1;
        lines.push({
          sourceSerialRaw: serial || null,
          code: `TOTAL-${rowNumber}`,
          name: nameCell || 'ИТОГО',
          category: currentSection,
          plannedQuantity: 0,
          plannedUnitPrice: unitPrice,
          plannedTotalPrice: totalPrice,
          itemType: EstimateLineItemType.OTHER,
          sourceSheet: sheet.name,
          sourceRowNumber: rowNumber,
          rowType: 'TOTAL',
          parentSortOrder: null,
          sortOrder,
          resourceCodeRaw: null,
          unitLabelRaw: unitCell || null,
          normCodeRaw: null,
          formulaRaw: this.extractFormulaRaw(row),
        });
        currentWorkSortOrder = null;
        continue;
      }

      if (this.isWorkRow(serial, codeCell, nameCell, unitCell, qtyNorm, qtyProject)) {
        sawWork = true;
        sortOrder += 1;
        currentWorkSortOrder = sortOrder;
        lines.push({
          sourceSerialRaw: serial || null,
          code: codeCell || `WORK-${rowNumber}`,
          name: nameCell || codeCell || `WORK-${rowNumber}`,
          category: currentSection,
          plannedQuantity: qtyProject ?? qtyNorm ?? 0,
          plannedUnitPrice: unitPrice,
          plannedTotalPrice: totalPrice,
          itemType: EstimateLineItemType.SERVICE,
          notes: undefined,
          sourceSheet: sheet.name,
          sourceRowNumber: rowNumber,
          rowType: 'WORK',
          sortOrder,
          resourceCodeRaw: null,
          unitLabelRaw: unitCell || null,
          normCodeRaw: codeCell || null,
          formulaRaw: this.extractFormulaRaw(row),
        });
        continue;
      }

      if (this.isResourceRow(serial, codeCell, nameCell, unitCell, qtyNorm, qtyProject, unitPrice)) {
        if (currentWorkSortOrder == null) warnings.push(`Row ${rowNumber}: resource row found without parent work row`);
        sortOrder += 1;
        lines.push({
          sourceSerialRaw: serial || null,
          code: codeCell || `RESOURCE-${rowNumber}`,
          name: nameCell || codeCell || `RESOURCE-${rowNumber}`,
          category: currentSection,
          plannedQuantity: qtyProject ?? qtyNorm ?? 0,
          plannedUnitPrice: unitPrice,
          plannedTotalPrice: totalPrice,
          itemType: this.classifyResourceItemType(nameCell, unitCell),
          sourceSheet: sheet.name,
          sourceRowNumber: rowNumber,
          rowType: 'RESOURCE',
          parentSortOrder: currentWorkSortOrder,
          sortOrder,
          resourceCodeRaw: codeCell || null,
          unitLabelRaw: unitCell || null,
          normCodeRaw: null,
          formulaRaw: this.extractFormulaRaw(row),
        });
      }
    }

    if (!sawSection && !sawWork) {
      throw new BadRequestException('No section or work rows were detected in _ЛРВ');
    }

    return {
      lines,
      preview: this.buildWorkbookPreview(sheet),
      warnings,
      summary: {
        sectionsCount: lines.filter((line) => line.rowType === 'SECTION').length,
        workRowsCount: lines.filter((line) => line.rowType === 'WORK').length,
        resourceRowsCount: lines.filter((line) => line.rowType === 'RESOURCE').length,
        subtotalRowsCount: lines.filter((line) => line.rowType === 'SUBTOTAL').length,
        totalRowsCount: lines.filter((line) => line.rowType === 'TOTAL').length,
        warningsCount: warnings.length,
      },
    };
  }

  private findDataStartRow(sheet: ExcelJS.Worksheet) {
    let headerRow: number | null = null;
    for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 80); rowNumber += 1) {
      const d = this.getText(sheet.getRow(rowNumber).getCell(4)).toUpperCase();
      const e = this.getText(sheet.getRow(rowNumber).getCell(5)).toUpperCase();
      const f = this.getText(sheet.getRow(rowNumber).getCell(6)).toUpperCase();
      if (d.includes('N П.П.') && e.includes('ШИФР') && f.includes('НАИМЕНОВАНИЕ')) {
        headerRow = rowNumber;
        break;
      }
    }
    if (!headerRow) return null;
    for (let rowNumber = headerRow; rowNumber <= Math.min(headerRow + 8, sheet.rowCount); rowNumber += 1) {
      const d = this.getText(sheet.getRow(rowNumber).getCell(4));
      const e = this.getText(sheet.getRow(rowNumber).getCell(5));
      const f = this.getText(sheet.getRow(rowNumber).getCell(6));
      if (d === '1' && e === '2' && f === '3') return rowNumber + 1;
    }
    return headerRow + 4;
  }

  private isWorkRow(serial: string, codeCell: string, nameCell: string, unitCell: string, qtyNorm: number | null, qtyProject: number | null) {
    return /^\d+$/.test(serial) && Boolean(codeCell) && Boolean(nameCell) && Boolean(unitCell) && qtyNorm != null && qtyProject == null;
  }

  private isResourceRow(
    serial: string,
    codeCell: string,
    nameCell: string,
    unitCell: string,
    qtyNorm: number | null,
    qtyProject: number | null,
    unitPrice: number | null,
  ) {
    return /^\d+\.\d+$/.test(serial) && Boolean(codeCell) && Boolean(nameCell) && Boolean(unitCell) && qtyNorm != null && (qtyProject != null || unitPrice != null);
  }

  private isSubtotalRow(nameCell: string, unitCell: string) {
    return nameCell.toUpperCase().includes('ВСЕГО ПО РАЗДЕЛУ') && unitCell.toUpperCase().includes('СУМ');
  }

  private isTotalRow(nameCell: string, unitCell: string) {
    return nameCell.trim().toUpperCase() === 'ИТОГО' && unitCell.toUpperCase().includes('СУМ');
  }

  private classifyResourceItemType(nameCell: string, unitCell: string) {
    const upperName = nameCell.toUpperCase();
    const upperUnit = unitCell.toUpperCase();
    if (upperUnit.includes('ЧЕЛ.-Ч') || upperName.includes('ЗАТРАТЫ ТРУДА')) return EstimateLineItemType.LABOR;
    if (upperUnit.includes('МАШ.-Ч') || upperName.includes('МАШИН') || upperName.includes('АВТОМОБИЛ')) return EstimateLineItemType.MACHINE;
    return EstimateLineItemType.MATERIAL;
  }

  private getText(cell: ExcelJS.Cell) {
    const value = this.unwrapCellValue(cell);
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
    if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') return value.text.trim();
    return String(value).trim();
  }

  private getNumber(cell: ExcelJS.Cell, warnings: string[], rowNumber: number, columnLabel: string) {
    const value = this.unwrapCellValue(cell);
    if (value == null || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const normalized = Number(value.replace(/\s+/g, '').replace(',', '.'));
      return Number.isFinite(normalized) ? normalized : null;
    }
    if (typeof value === 'object' && 'formula' in value) {
      const result = (value as FormulaCell).result;
      if (typeof result === 'number') return result;
      warnings.push(`Row ${rowNumber} column ${columnLabel}: formula has no cached numeric result`);
      return null;
    }
    return null;
  }

  private extractFormulaRaw(row: ExcelJS.Row) {
    const formulas: Record<string, string> = {};
    for (const column of [8, 9, 10, 11, 12]) {
      const cell = row.getCell(column);
      const value = this.unwrapCellValue(cell);
      if (value && typeof value === 'object' && 'formula' in value && typeof (value as FormulaCell).formula === 'string') {
        formulas[cell.address] = (value as FormulaCell).formula!;
      }
    }
    return Object.keys(formulas).length ? JSON.stringify(formulas) : null;
  }

  private unwrapCellValue(cell: ExcelJS.Cell) {
    const actualCell = cell.isMerged ? cell.master : cell;
    return actualCell.value;
  }

  private buildWorkbookPreview(sheet: ExcelJS.Worksheet): WorkbookPreview {
    const startColumn = 4;
    const endColumn = this.findPreviewEndColumn(sheet, startColumn);
    const mergeRanges = this.parseMergeRanges(sheet.model?.merges ?? [], startColumn, endColumn);
    const skippedCells = new Set<string>();

    for (const merge of mergeRanges) {
      for (let row = merge.startRow; row <= merge.endRow; row += 1) {
        for (let column = merge.startColumn; column <= merge.endColumn; column += 1) {
          if (row === merge.startRow && column === merge.startColumn) continue;
          skippedCells.add(`${row}:${column}`);
        }
      }
    }

    const rows: WorkbookPreviewRow[] = [];
    for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const cells: WorkbookPreviewCell[] = [];
      for (let column = startColumn; column <= endColumn; column += 1) {
        if (skippedCells.has(`${rowNumber}:${column}`)) continue;
        const cell = row.getCell(column);
        const merge = mergeRanges.find((item) => item.startRow === rowNumber && item.startColumn === column);
        cells.push({
          column,
          value: this.getDisplayText(cell),
          colSpan: merge ? merge.endColumn - merge.startColumn + 1 : 1,
          rowSpan: merge ? merge.endRow - merge.startRow + 1 : 1,
          style: this.extractCellStyle(cell),
        });
      }
      rows.push({
        rowNumber,
        height: row.height ?? null,
        cells,
      });
    }

    return {
      sheetName: sheet.name,
      startColumn,
      endColumn,
      columns: Array.from({ length: endColumn - startColumn + 1 }, (_, index) => {
        const columnNumber = startColumn + index;
        const column = sheet.getColumn(columnNumber);
        return {
          column: columnNumber,
          label: this.columnNumberToLabel(columnNumber),
          width: typeof column.width === 'number' ? column.width : null,
        };
      }),
      rows,
    };
  }

  private findPreviewEndColumn(sheet: ExcelJS.Worksheet, startColumn: number) {
    const candidate = Math.max(sheet.columnCount, sheet.actualColumnCount ?? 0, 12);
    return Math.max(startColumn, candidate);
  }

  private parseMergeRanges(mergeRefs: string[], startColumn: number, endColumn: number) {
    return mergeRefs
      .map((ref) => {
        const [startRef, endRef] = ref.split(':');
        const start = this.parseCellRef(startRef);
        const end = this.parseCellRef(endRef ?? startRef);
        if (!start || !end) return null;
        if (end.column < startColumn || start.column > endColumn) return null;
        return {
          startRow: start.row,
          endRow: end.row,
          startColumn: Math.max(start.column, startColumn),
          endColumn: Math.min(end.column, endColumn),
        };
      })
      .filter((item): item is { startRow: number; endRow: number; startColumn: number; endColumn: number } => Boolean(item));
  }

  private parseCellRef(ref: string) {
    const match = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
    if (!match) return null;
    return {
      column: this.columnLabelToNumber(match[1]),
      row: Number(match[2]),
    };
  }

  private columnLabelToNumber(label: string) {
    let value = 0;
    for (const char of label.toUpperCase()) {
      value = value * 26 + (char.charCodeAt(0) - 64);
    }
    return value;
  }

  private columnNumberToLabel(value: number) {
    let current = value;
    let label = '';
    while (current > 0) {
      const remainder = (current - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      current = Math.floor((current - 1) / 26);
    }
    return label;
  }

  private getDisplayText(cell: ExcelJS.Cell) {
    const actualCell = cell.isMerged ? cell.master : cell;
    const text = actualCell.text ?? this.getText(actualCell);
    return String(text ?? '').trim();
  }

  private extractCellStyle(cell: ExcelJS.Cell): WorkbookPreviewCellStyle {
    const actualCell = cell.isMerged ? cell.master : cell;
    const font = actualCell.font;
    const fill = actualCell.fill as { fgColor?: { argb?: string } } | undefined;
    const alignment = actualCell.alignment;
    const border = actualCell.border;

    return {
      bold: font?.bold ?? false,
      italic: font?.italic ?? false,
      fontSize: typeof font?.size === 'number' ? font.size : undefined,
      color: font?.color?.argb ?? null,
      backgroundColor: fill?.fgColor?.argb ?? null,
      horizontalAlign: alignment?.horizontal ?? null,
      verticalAlign: alignment?.vertical ?? null,
      wrapText: alignment?.wrapText ?? false,
      borderTop: Boolean(border?.top?.style),
      borderRight: Boolean(border?.right?.style),
      borderBottom: Boolean(border?.bottom?.style),
      borderLeft: Boolean(border?.left?.style),
    };
  }
}
