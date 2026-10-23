import { loadExcelJS } from '@/lib/lazy/exportLibs';
import { PLATFORMS } from '@/types/investment';

/**
 * Plantilla de Excel para quien no tiene sus inversiones apuntadas en ningún
 * sitio. Sus títulos son los que reconoce importSheet.ts y las columnas de
 * tipo y frecuencia llevan desplegable con los valores que entiende importRows.ts.
 */

const HEADERS = [
  { header: 'Plataforma', width: 16 },
  { header: 'Proyecto', width: 30 },
  { header: 'Importe invertido (€)', width: 20 },
  { header: 'Fecha de inversión', width: 18 },
  { header: 'Fecha de vencimiento', width: 20 },
  { header: 'Rentabilidad anual (%)', width: 20 },
  { header: 'Tipo de rendimiento', width: 30 },
  { header: 'Frecuencia de cobro', width: 20 },
  { header: 'Notas', width: 30 },
];

const INCOME_MODELS = ['Pago único al vencimiento', 'Rendimiento periódico fijo', 'Amortización progresiva', 'Equity', 'Variable o desconocido'];
const FREQUENCIES = ['Mensual', 'Trimestral', 'Semestral', 'Anual'];

export async function downloadImportTemplate(): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inversiones');
  ws.columns = HEADERS.map(h => ({ header: h.header, width: h.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF253765' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Ejemplo (se puede borrar): número, fecha y porcentaje como celdas de verdad.
  ws.addRow(['Urbanitae', 'EJEMPLO · Residencial Ruzafa', 1000, new Date(Date.UTC(2025, 0, 15)), new Date(Date.UTC(2026, 6, 15)), 0.09, 'Pago único al vencimiento', '', 'Borra esta fila']);

  for (let r = 2; r <= 501; r++) {
    ws.getCell(`C${r}`).numFmt = '#,##0.00 "€"';
    ws.getCell(`D${r}`).numFmt = 'dd/mm/yyyy';
    ws.getCell(`E${r}`).numFmt = 'dd/mm/yyyy';
    ws.getCell(`F${r}`).numFmt = '0.00%';
    ws.getCell(`A${r}`).dataValidation = {
      type: 'list', allowBlank: true, showErrorMessage: false,
      formulae: [`"${PLATFORMS.filter(p => p.value !== 'other').map(p => p.label).join(',')}"`],
    };
    ws.getCell(`G${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${INCOME_MODELS.join(',')}"`] };
    ws.getCell(`H${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${FREQUENCIES.join(',')}"`] };
  }

  const help = wb.addWorksheet('Cómo rellenarla');
  help.getColumn(1).width = 110;
  [
    'Una fila por inversión. Si inviertes dos veces en el mismo proyecto, dos filas.',
    'Plataforma: elige del desplegable o escribe otra (Civislend, Mintos…).',
    'Importe en euros, sin el símbolo si quieres: 1.500 o 1.500,50.',
    'Fechas como dd/mm/aaaa.',
    'Rentabilidad anual: 9 % o 9. Si no la sabes, déjala vacía.',
    'Frecuencia de cobro: solo si cobras intereses periódicos o cuotas.',
    'Lo que dejes vacío no pasa nada: la inversión queda en «Pendientes de completar» y lo rellenas en la app.',
  ].forEach(line => help.addRow([line]));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-inversiones-crowdfolio.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
