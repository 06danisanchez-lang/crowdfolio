import { loadExcelJS } from '@/lib/lazy/exportLibs';
import { decodeCsvBytes, detectHeaderRow, guessMapping, Grid, parseCsvGrid } from './importSheet';

/**
 * Archivo subido (.xlsx o .csv) → celdas como texto, listas para importSheet.
 */

/** Celda de ExcelJS → texto. `isPercent`: la celda tiene formato % (Excel guarda 8 % como 0,08). */
export function excelCellToString(v: unknown, isPercent = false): string {
  if (v == null) return '';
  // ExcelJS devuelve las celdas de fecha como Date en UTC (Excel no guarda zona
  // horaria), así que aquí sí hay que leer el día en UTC.
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  }
  // Números: la celda ya es un número sin ambigüedad. Se pasa a texto con coma
  // decimal ("1500,125") para que parseImportNumber (formato español) no lo
  // confunda con un separador de miles.
  if (typeof v === 'number') {
    const n = isPercent ? Math.round(v * 100 * 1e8) / 1e8 : v;
    return String(n).replace('.', ',');
  }
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (Array.isArray(obj.richText))
      return (obj.richText as Array<{ text: string }>).map(r => r.text).join('');
    // Fórmula: su resultado (número, fecha o texto).
    if ('result' in obj) return excelCellToString(obj.result, isPercent);
    if (obj.text != null) return String(obj.text);
    if ('error' in obj) return '';
  }
  return String(v);
}

export interface SheetData {
  name: string;
  grid: Grid;
}

export async function readXlsxBuffer(buffer: ArrayBuffer): Promise<SheetData[]> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new Error('No se ha podido abrir el Excel. Si es un .xls antiguo, guárdalo como .xlsx o .csv y vuelve a subirlo.');
  }
  const sheets: SheetData[] = [];
  workbook.eachSheet(ws => {
    if (ws.state && ws.state !== 'visible') return;
    const grid: Grid = [];
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const fmt = cell.numFmt ?? '';
        cells[col - 1] = excelCellToString(cell.value, fmt.includes('%')).trim();
      });
      for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
      grid[rowNumber - 1] = cells;
    });
    for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = [];
    sheets.push({ name: ws.name, grid });
  });
  return sheets;
}

/**
 * Hoja con más pinta de ser la tabla de inversiones: la que tiene más
 * cabeceras reconocibles (un Excel puede tener una portada o un resumen delante).
 */
export function pickBestSheet(sheets: SheetData[]): SheetData | null {
  let best: SheetData | null = null;
  let bestScore = -1;
  for (const sheet of sheets) {
    if (!sheet.grid.some(r => r.some(c => c))) continue;
    const headerRow = detectHeaderRow(sheet.grid);
    const score = guessMapping(sheet.grid[headerRow] ?? []).filter(Boolean).length;
    if (score > bestScore) { best = sheet; bestScore = score; }
  }
  return best;
}

export async function readSpreadsheetFile(file: File): Promise<SheetData[]> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'xlsx' || ext === 'xlsm') return readXlsxBuffer(await file.arrayBuffer());
  if (ext === 'csv' || ext === 'txt') return [{ name: file.name, grid: parseCsvGrid(decodeCsvBytes(await file.arrayBuffer())) }];
  if (ext === 'xls' || ext === 'numbers' || ext === 'ods') {
    throw new Error('Este formato no se puede leer. Guárdalo como Excel (.xlsx) o CSV y vuelve a subirlo.');
  }
  throw new Error('Sube un archivo Excel (.xlsx) o CSV.');
}
