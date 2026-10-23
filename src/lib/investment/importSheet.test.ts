import { describe, it, expect } from 'vitest';
import { decodeCsvBytes, detectHeaderRow, gridToRows, guessMapping, parseCsvGrid } from './importSheet';
import { buildImportCandidates } from './importRows';
import { excelCellToString, pickBestSheet, readXlsxBuffer } from './readSpreadsheet';
import ExcelJS from 'exceljs';

describe('guessMapping', () => {
  it('reconoce títulos habituales', () => {
    expect(guessMapping([
      'Plataforma', 'Proyecto', 'Importe invertido (€)', 'Fecha de inversión', 'Fecha de vencimiento',
      'Rentabilidad anual (%)', 'Tipo', 'Frecuencia de cobro', 'Observaciones', 'Estado',
    ])).toEqual([
      'platform', 'projectName', 'amount', 'investmentDate', 'expectedEndDate',
      'expectedReturn', 'incomeModel', 'paymentFrequency', 'notes', 'status',
    ]);
  });

  it('reconoce todas las columnas de nuestra plantilla', () => {
    expect(guessMapping([
      'Plataforma', 'Proyecto', 'Importe invertido (€)', 'Fecha de inversión', 'Fecha de vencimiento',
      'Rentabilidad anual (%)', 'Tipo de rendimiento', 'Frecuencia de cobro', 'Notas',
    ]).every(Boolean)).toBe(true);
  });

  it('no confunde columnas parecidas', () => {
    expect(guessMapping(['Capital pendiente', 'Intereses cobrados', 'Fecha de cobro', 'Rentabilidad total', 'Tipo de interés']))
      .toEqual([null, null, null, null, 'expectedReturn']);
  });

  it('lee el CSV que exporta Crowdfolio', () => {
    expect(guessMapping([
      'Plataforma', 'Nombre Proyecto', 'Monto', 'Fecha Inversión', 'Fecha Vencimiento', 'Rendimiento Esperado',
      'Estado', 'Notas', 'Modelo de Rendimiento', 'Frecuencia de Pago', 'Tipo Devolución Principal', 'Vencimiento Prometido',
    ])).toEqual([
      'platform', 'projectName', 'amount', 'investmentDate', 'expectedEndDate', 'expectedReturn',
      'status', 'notes', 'incomeModel', 'paymentFrequency', 'principalReturnType', 'originalEndDate',
    ]);
  });

  it('un dato solo va a una columna', () => {
    expect(guessMapping(['Fecha', 'Fecha de inversión'])).toEqual([null, 'investmentDate']);
  });
});

describe('detectHeaderRow y gridToRows', () => {
  it('salta el título de encima de la tabla y la fila de totales', () => {
    const grid = [
      ['Mis inversiones 2024'],
      [],
      ['Proyecto', 'Importe', 'Fecha'],
      ['Piso Ruzafa', '1.000', '01/02/2024'],
      ['', '', ''],
      ['Local Gran Vía', '500', '03/04/2024'],
      ['Total', '1.500', ''],
    ];
    const header = detectHeaderRow(grid);
    expect(header).toBe(2);
    const rows = gridToRows(grid, header, guessMapping(grid[header]));
    expect(rows.map(r => r.rowNumber)).toEqual([4, 6]);
    expect(rows[0].raw).toEqual({ projectName: 'Piso Ruzafa', amount: '1.000', investmentDate: '01/02/2024' });
  });
});

describe('filas de totales', () => {
  it('«Total Living» es un proyecto, «Total» no', () => {
    const grid = [['Proyecto', 'Importe'], ['Total Living', '1.000'], ['Total', '1.000']];
    expect(gridToRows(grid, 0, guessMapping(grid[0])).map(r => r.raw.projectName)).toEqual(['Total Living']);
  });
});

describe('decodeCsvBytes', () => {
  it('CSV de Excel en español (Windows-1252) y en UTF-8', () => {
    const latin1 = new Uint8Array([0x49, 0x6e, 0x76, 0x65, 0x72, 0x73, 0x69, 0xf3, 0x6e]); // «Inversión»
    expect(decodeCsvBytes(latin1.buffer)).toBe('Inversión');
    expect(decodeCsvBytes(new TextEncoder().encode('Inversión').buffer as ArrayBuffer)).toBe('Inversión');
  });
});

describe('parseCsvGrid', () => {
  it('punto y coma (Excel en español), comillas y saltos de línea', () => {
    const grid = parseCsvGrid('\uFEFFProyecto;Importe;Notas\r\n"Piso; centro";"1.500,50";"línea 1\nlínea 2"\r\n');
    expect(grid).toEqual([['Proyecto', 'Importe', 'Notas'], ['Piso; centro', '1.500,50', 'línea 1\nlínea 2']]);
  });
  it('comas', () => {
    expect(parseCsvGrid('a,b\n"1,5",2')).toEqual([['a', 'b'], ['1,5', '2']]);
  });
});

describe('Excel (.xlsx)', () => {
  it('celdas: porcentaje, número, fecha y fórmula', () => {
    expect(excelCellToString(0.085, true)).toBe('8,5');
    expect(excelCellToString(1500.5)).toBe('1500,5');
    expect(excelCellToString(new Date(Date.UTC(2024, 0, 1)))).toBe('2024-01-01');
    expect(excelCellToString({ formula: 'A1*2', result: 3000 })).toBe('3000');
  });

  it('de principio a fin: elige la hoja buena y saca inversiones completas', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Portada').getCell('A1').value = 'Resumen';
    const ws = wb.addWorksheet('Inversiones');
    ws.addRow(['Cartera crowdfunding']);
    ws.addRow(['Plataforma', 'Proyecto', 'Importe', 'Fecha', 'Vencimiento', 'TIR', 'Tipo']);
    ws.addRow(['Urbanitae', 'Ático Ruzafa', 1500, new Date(Date.UTC(2024, 0, 15)), new Date(Date.UTC(2025, 6, 15)), 0.095, 'Al vencimiento']);
    ws.addRow(['Civislend', 'Nave Paterna', 2000, '15/03/2024', '', 0.11, '']);
    ws.getColumn(6).numFmt = '0.0%';
    const buffer = await wb.xlsx.writeBuffer();

    const sheets = await readXlsxBuffer(buffer as ArrayBuffer);
    const sheet = pickBestSheet(sheets)!;
    expect(sheet.name).toBe('Inversiones');
    const header = detectHeaderRow(sheet.grid);
    const rows = gridToRows(sheet.grid, header, guessMapping(sheet.grid[header]));
    const { candidates } = buildImportCandidates(rows, []);

    expect(candidates[0].complete).toBe(true);
    expect(candidates[0].investment).toMatchObject({
      platform: 'urbanitae', projectName: 'Ático Ruzafa', amount: 1500, investmentDate: '2024-01-15',
      expectedEndDate: '2025-07-15', expectedReturn: 9.5, incomeModel: 'bullet', status: 'active',
    });
    expect(candidates[1].complete).toBe(false);
    expect(candidates[0].missing).toEqual([]);
    expect(candidates[1].investment).toMatchObject({
      platform: 'other', customPlatformName: 'Civislend', amount: 2000, investmentDate: '2024-03-15',
      expectedReturn: 11, incomeModel: null, status: 'draft',
    });
    expect(candidates[1].missing).toEqual(['investments.field.incomeModel', 'investments.field.expectedEndDate']);
  });
});
