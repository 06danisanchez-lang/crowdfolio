import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TaxSummary, TaxExpense, TAX_EXPENSE_CATEGORIES, EnrichedPayment, DefaultedInvestmentLoss } from '@/types/tax';
import { getTaxBreakdown, formatCurrency, formatPercentage } from '@/lib/tax/calculations';
import { toast } from '@/hooks/use-toast';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const EXPENSES_NOTE =
  'Nota: solo son deducibles los gastos de administración y custodia directamente vinculados ' +
  'a los rendimientos declarados y debidamente acreditados (Art. 26.1.a LIRPF). ' +
  'Consúltalo con tu asesor fiscal antes de incluirlos en tu declaración.';

interface ExtendedTaxExportButtonProps {
  summary: TaxSummary;
  expenses: TaxExpense[];
  enrichedPayments: EnrichedPayment[];
  defaultedInvestmentsWithLoss: DefaultedInvestmentLoss[];
  userEmail: string;
  onProRequired?: () => void;
  isPro?: boolean;
}

export function TaxExportButton({
  summary,
  expenses,
  enrichedPayments,
  defaultedInvestmentsWithLoss,
  userEmail,
  onProRequired,
  isPro = true,
}: ExtendedTaxExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = (exportFn: () => Promise<void>) => {
    if (!isPro) {
      onProRequired?.();
      return;
    }
    exportFn();
  };

  const getCategoryLabel = (category: string): string => {
    const cat = TAX_EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  // ─── Excel ──────────────────────────────────────────────────────────────────

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Crowdfolio';
      workbook.created = new Date();

      // ── Paleta y formatos ─────────────────────────────────────────────────
      const NAVY     = 'FF253765';
      const NAVY_MID = 'FF1e2d52';
      const CREAM    = 'FFe4ddcf';
      const WHITE    = 'FFFFFFFF';
      const GREY_LT  = 'FFf5f5f5';
      const GREY_TXT = 'FF666666';
      const GREEN    = 'FF1a6b3c';
      const RED_NEG  = 'FFa32d2d';
      const MONEY    = '#,##0.00 "€"';
      const PCT      = '0.00%';
      const BRANDING = `Generado por Crowdfolio · crowdfolio.es`;

      type XStyle = Partial<ExcelJS.Style>;

      const S: Record<string, XStyle> = {
        sheetTitle: {
          font: { bold: true, size: 13, color: { argb: WHITE } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
        },
        sheetTitleRed: {
          font: { bold: true, size: 13, color: { argb: WHITE } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_NEG } },
          alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
        },
        subtitle: {
          font: { size: 9, color: { argb: GREY_TXT } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } },
          alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
        },
        sectionHeader: {
          font: { bold: true, size: 10, color: { argb: WHITE } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MID } },
          alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
        },
        tableHeader: {
          font: { bold: true, size: 10, color: { argb: WHITE } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: { bottom: { style: 'thin', color: { argb: CREAM } } },
        },
        dataEven: {
          font: { size: 10 },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY_LT } },
        },
        dataOdd: {
          font: { size: 10 },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } },
        },
        totalRow: {
          font: { bold: true, size: 10, color: { argb: WHITE } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          alignment: { horizontal: 'right' },
        },
        label: {
          font: { size: 10, color: { argb: GREY_TXT } },
          alignment: { horizontal: 'left', indent: 2 },
        },
        valPos: {
          font: { bold: true, size: 10, color: { argb: GREEN } },
          alignment: { horizontal: 'right' },
          numFmt: MONEY,
        },
        valNeg: {
          font: { bold: true, size: 10, color: { argb: RED_NEG } },
          alignment: { horizontal: 'right' },
          numFmt: MONEY,
        },
        valBold: {
          font: { bold: true, size: 10 },
          alignment: { horizontal: 'right' },
          numFmt: MONEY,
        },
        legalNote: {
          font: { italic: true, size: 8, color: { argb: GREY_TXT } },
          alignment: { wrapText: true },
        },
        creamVal: {
          font: { bold: true, size: 10, color: { argb: GREY_TXT } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } },
          alignment: { horizontal: 'right' },
          numFmt: PCT,
        },
        creamLabel: {
          font: { size: 10, color: { argb: GREY_TXT } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } },
          alignment: { horizontal: 'left', indent: 2 },
        },
      };

      // ── Helpers ───────────────────────────────────────────────────────────
      const applyStyle = (cell: ExcelJS.Cell, style: XStyle) => {
        cell.style = style as ExcelJS.Style;
      };

      const styleRange = (ws: ExcelJS.Worksheet, rowNum: number, fromCol: number, toCol: number, style: XStyle) => {
        const row = ws.getRow(rowNum);
        for (let c = fromCol; c <= toCol; c++) applyStyle(row.getCell(c), style);
      };

      const addTitleRows = (ws: ExcelJS.Worksheet, title: string, subtitle: string, numCols: number, titleStyle = S.sheetTitle) => {
        const r1 = ws.addRow([title]);
        r1.height = 32;
        ws.mergeCells(r1.number, 1, r1.number, numCols);
        applyStyle(ws.getCell(r1.number, 1), titleStyle);

        const r2 = ws.addRow([subtitle]);
        r2.height = 18;
        ws.mergeCells(r2.number, 1, r2.number, numCols);
        applyStyle(ws.getCell(r2.number, 1), S.subtitle);

        const r3 = ws.addRow([]);
        r3.height = 6;
      };

      const addTableHeader = (ws: ExcelJS.Worksheet, headers: string[], numCols: number) => {
        const row = ws.addRow(headers);
        row.height = 24;
        for (let c = 1; c <= numCols; c++) applyStyle(row.getCell(c), S.tableHeader);
        return row.number;
      };

      const addDataRows = <T,>(
        ws: ExcelJS.Worksheet,
        items: T[],
        buildRow: (item: T) => (string | number | null)[],
        styleCell?: (cell: ExcelJS.Cell, colIdx: number, item: T) => void
      ) => {
        items.forEach((item, i) => {
          const row = ws.addRow(buildRow(item));
          row.height = 20;
          const base = i % 2 === 0 ? S.dataEven : S.dataOdd;
          for (let c = 1; c <= row.cellCount; c++) {
            applyStyle(row.getCell(c), base);
            styleCell?.(row.getCell(c), c, item);
          }
        });
      };

      const addTotalRow = (ws: ExcelJS.Worksheet, values: (string | number | null)[], numCols: number) => {
        const row = ws.addRow(values);
        row.height = 24;
        for (let c = 1; c <= numCols; c++) applyStyle(row.getCell(c), S.totalRow);
        return row.number;
      };

      // ── Sheet 1: Resumen ──────────────────────────────────────────────────
      const wsR = workbook.addWorksheet('Resumen');
      wsR.properties.tabColor = { argb: NAVY };
      wsR.columns = [{ width: 38 }, { width: 18 }];
      wsR.views = [{ state: 'frozen', ySplit: 1 }];

      addTitleRows(wsR, `RESUMEN FISCAL IRPF ${summary.year}`, BRANDING, 2);

      const addSummaryRow = (label: string, value: number, valStyle: XStyle) => {
        const row = wsR.addRow([label, value]);
        row.height = 20;
        applyStyle(row.getCell(1), S.label);
        const vc = row.getCell(2);
        applyStyle(vc, valStyle);
        vc.numFmt = MONEY;
      };

      const addSectionSep = (text: string) => {
        const row = wsR.addRow([text, '']);
        row.height = 22;
        wsR.mergeCells(row.number, 1, row.number, 2);
        applyStyle(wsR.getCell(row.number, 1), S.sectionHeader);
      };

      addSectionSep('── Rendimientos del Capital Mobiliario ──');
      addSummaryRow('Rendimientos Brutos del Ahorro', summary.grossIncome, S.valPos);
      const intRow = wsR.addRow(['  · Intereses', summary.interestIncome]);
      intRow.height = 20; applyStyle(intRow.getCell(1), { ...S.label, alignment: { horizontal: 'left', indent: 4 } } as XStyle); applyStyle(intRow.getCell(2), { ...S.dataOdd, alignment: { horizontal: 'right' }, numFmt: MONEY } as XStyle);
      const divRow = wsR.addRow(['  · Dividendos', summary.dividendIncome]);
      divRow.height = 20; applyStyle(divRow.getCell(1), { ...S.label, alignment: { horizontal: 'left', indent: 4 } } as XStyle); applyStyle(divRow.getCell(2), { ...S.dataOdd, alignment: { horizontal: 'right' }, numFmt: MONEY } as XStyle);
      addSummaryRow('Devoluciones de Principal (informativo)', summary.principalReturns, S.dataOdd as XStyle);
      addSummaryRow('Gastos Deducibles', -summary.deductibleExpenses, S.valNeg);

      addSectionSep('── Base Imponible ──');
      addSummaryRow('Base Imponible del Ahorro', summary.taxableBase, S.valBold);

      addSectionSep('── Cuota y Resultado ──');
      addSummaryRow('Cuota Íntegra Estimada', summary.estimatedTax, S.valBold);
      addSummaryRow('Retenciones Practicadas', -summary.withholdingsApplied, S.valNeg);
      const resultado = summary.estimatedTax - summary.withholdingsApplied;
      addSummaryRow('Resultado Declaración', resultado, resultado >= 0 ? S.valPos : S.valNeg);

      // Tipo efectivo — cream row
      const erRow = wsR.addRow(['Tipo Efectivo', summary.effectiveRate / 100]);
      erRow.height = 20;
      applyStyle(erRow.getCell(1), S.creamLabel);
      applyStyle(erRow.getCell(2), S.creamVal);

      // GPP section (conditional)
      if (summary.totalGPPLosses < 0) {
        addSectionSep('── Pérdidas Patrimoniales (GPP) ──');
        addSummaryRow('Pérdidas por impago elegibles (art. 14.2.k LIRPF)', summary.totalGPPLosses, S.valNeg);
        addSummaryRow('Compensación aplicada contra RCM (límite 25%)', -summary.compensacionGPPRCM, S.valNeg);
        addSummaryRow('Base imponible RCM ajustada', summary.baseImponibleRCMAjustada, S.valBold);
        addSummaryRow('Pérdidas GPP pendientes de arrastrar (4 años)', -summary.perdidasGPPPendientes, S.valNeg);
      }

      // ── Sheet 2: Tramos IRPF ─────────────────────────────────────────────
      const wsT = workbook.addWorksheet('Tramos IRPF');
      wsT.properties.tabColor = { argb: NAVY };
      wsT.columns = [{ width: 28 }, { width: 22 }, { width: 14 }, { width: 22 }];
      wsT.views = [{ state: 'frozen', ySplit: 4 }];

      addTitleRows(wsT, `CÁLCULO POR TRAMOS IRPF ${summary.year}`, 'Cálculo progresivo base imponible del ahorro', 4);
      addTableHeader(wsT, ['Tramo', 'Base Gravada (€)', 'Tipo (%)', 'Cuota (€)'], 4);

      const breakdown = getTaxBreakdown(summary.taxableBase);
      addDataRows(wsT, breakdown, item => [
        `${formatCurrency(item.bracket.min)} – ${item.bracket.max === Infinity ? '∞' : formatCurrency(item.bracket.max)}`,
        item.amount,
        item.bracket.rate,
        item.tax,
      ], (cell, col) => {
        if (col === 2 || col === 4) cell.numFmt = MONEY;
        if (col === 3) { cell.numFmt = PCT; applyStyle(cell, { ...cell.style, alignment: { horizontal: 'center' } } as XStyle); }
        if (col >= 2) applyStyle(cell, { ...cell.style, alignment: { horizontal: 'right' } } as XStyle);
      });

      addTotalRow(wsT, ['TOTAL', summary.taxableBase, '', summary.estimatedTax], 4);
      const trTot = wsT.lastRow!;
      trTot.getCell(2).numFmt = MONEY;
      trTot.getCell(4).numFmt = MONEY;

      // ── Sheet 3: Gastos Deducibles ────────────────────────────────────────
      const wsG = workbook.addWorksheet('Gastos Deducibles');
      wsG.properties.tabColor = { argb: NAVY };
      wsG.columns = [{ width: 14 }, { width: 22 }, { width: 40 }, { width: 18 }];
      wsG.views = [{ state: 'frozen', ySplit: 6 }];

      addTitleRows(wsG, `GASTOS DEDUCIBLES ${summary.year}`, BRANDING, 4);

      // Legal note row
      const noteRow = wsG.addRow([EXPENSES_NOTE, '', '', '']);
      noteRow.height = 48;
      wsG.mergeCells(noteRow.number, 1, noteRow.number, 4);
      applyStyle(wsG.getCell(noteRow.number, 1), S.legalNote);

      wsG.addRow([]).height = 6;
      addTableHeader(wsG, ['Fecha', 'Categoría', 'Descripción', 'Importe (€)'], 4);

      addDataRows(wsG, expenses, exp => [
        new Date(exp.date).toLocaleDateString('es-ES'),
        getCategoryLabel(exp.category),
        exp.description,
        exp.amount,
      ], (cell, col) => {
        if (col === 4) { cell.numFmt = MONEY; applyStyle(cell, { ...cell.style, alignment: { horizontal: 'right' } } as XStyle); }
      });

      addTotalRow(wsG, ['TOTAL', '', '', summary.deductibleExpenses], 4);
      wsG.lastRow!.getCell(4).numFmt = MONEY;

      // ── Sheet 4: Detalle de Pagos ─────────────────────────────────────────
      const wsP = workbook.addWorksheet('Detalle de Pagos');
      wsP.properties.tabColor = { argb: NAVY };
      wsP.columns = [{ width: 13 }, { width: 32 }, { width: 18 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }];
      wsP.views = [{ state: 'frozen', ySplit: 4 }];

      addTitleRows(wsP, `DETALLE DE PAGOS ${summary.year}`, 'Pagos de tipo interés y dividendo registrados en el ejercicio', 7);
      const pHdrRow = addTableHeader(wsP, ['Fecha', 'Inversión', 'Plataforma', 'Tipo', 'Bruto (€)', 'Retención (€)', 'Neto (€)'], 7);
      wsP.autoFilter = { from: { row: pHdrRow, column: 1 }, to: { row: pHdrRow, column: 7 } };

      const incomePayments = enrichedPayments.filter(p => p.type === 'interest' || p.type === 'dividend');
      let totalBruto = 0, totalRet = 0;
      incomePayments.forEach(p => { totalBruto += p.amount; totalRet += p.withholdingApplied; });

      addDataRows(wsP, incomePayments, p => [
        new Date(p.date).toLocaleDateString('es-ES'),
        p.investmentName,
        p.platform,
        p.type === 'interest' ? 'Interés' : 'Dividendo',
        p.amount,
        p.withholdingApplied,
        p.amount - p.withholdingApplied,
      ], (cell, col) => {
        if (col === 4) applyStyle(cell, { ...cell.style, alignment: { horizontal: 'center' } } as XStyle);
        if (col === 5) { cell.numFmt = MONEY; applyStyle(cell, { ...cell.style, alignment: { horizontal: 'right' } } as XStyle); }
        if (col === 6) { cell.numFmt = MONEY; applyStyle(cell, { ...cell.style, font: { size: 10, color: { argb: RED_NEG } }, alignment: { horizontal: 'right' } } as XStyle); }
        if (col === 7) { cell.numFmt = MONEY; applyStyle(cell, { ...cell.style, alignment: { horizontal: 'right' } } as XStyle); }
      });

      addTotalRow(wsP, ['', '', '', 'TOTAL', totalBruto, totalRet, totalBruto - totalRet], 7);
      [5, 6, 7].forEach(c => { wsP.lastRow!.getCell(c).numFmt = MONEY; });

      // ── Sheet 5: Por Inversión ────────────────────────────────────────────
      const wsI = workbook.addWorksheet('Por Inversión');
      wsI.properties.tabColor = { argb: NAVY };
      wsI.columns = [{ width: 38 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }];
      wsI.views = [{ state: 'frozen', ySplit: 4 }];

      addTitleRows(wsI, `DETALLE POR INVERSIÓN ${summary.year}`, 'Rendimientos agrupados por proyecto', 5);
      const iHdrRow = addTableHeader(wsI, ['Inversión', 'Plataforma', 'Bruto (€)', 'Retenciones (€)', 'Neto (€)'], 5);
      wsI.autoFilter = { from: { row: iHdrRow, column: 1 }, to: { row: iHdrRow, column: 5 } };

      const byInvMap = new Map<string, { name: string; platform: string; gross: number; ret: number }>();
      incomePayments.forEach(p => {
        const e = byInvMap.get(p.investmentId) ?? { name: p.investmentName, platform: p.platform, gross: 0, ret: 0 };
        byInvMap.set(p.investmentId, { ...e, gross: e.gross + p.amount, ret: e.ret + p.withholdingApplied });
      });
      const invRows = Array.from(byInvMap.values()).sort((a, b) => b.gross - a.gross);

      addDataRows(wsI, invRows, inv => [inv.name, inv.platform, inv.gross, inv.ret, inv.gross - inv.ret],
        (cell, col) => {
          if (col >= 3) { cell.numFmt = MONEY; applyStyle(cell, { ...cell.style, alignment: { horizontal: 'right' } } as XStyle); }
        }
      );

      const iTotBruto = invRows.reduce((s, r) => s + r.gross, 0);
      const iTotRet   = invRows.reduce((s, r) => s + r.ret, 0);
      addTotalRow(wsI, ['TOTAL', '', iTotBruto, iTotRet, iTotBruto - iTotRet], 5);
      [3, 4, 5].forEach(c => { wsI.lastRow!.getCell(c).numFmt = MONEY; });

      // ── Sheet 6: Pérdidas GPP (conditional) ──────────────────────────────
      if (summary.totalGPPLosses < 0 && defaultedInvestmentsWithLoss.length > 0) {
        const wsGPP = workbook.addWorksheet('Pérdidas GPP');
        wsGPP.properties.tabColor = { argb: RED_NEG };
        wsGPP.columns = [{ width: 38 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }];

        addTitleRows(wsGPP, `PÉRDIDAS POR IMPAGO (GPP) ${summary.year}`, 'Pérdidas patrimoniales por impago deducibles — art. 14.2.k Ley IRPF', 5, S.sheetTitleRed);
        addTableHeader(wsGPP, ['Inversión', 'Plataforma', 'Invertido (€)', 'Recuperado (€)', 'Pérdida (€)'], 5);

        addDataRows(wsGPP, defaultedInvestmentsWithLoss, inv => [
          inv.projectName, inv.platform, inv.amountInvested, inv.amountRecovered, inv.loss,
        ], (cell, col) => {
          if (col >= 3) { cell.numFmt = MONEY; applyStyle(cell, { ...cell.style, alignment: { horizontal: 'right' } } as XStyle); }
          if (col === 5) applyStyle(cell, { ...cell.style, font: { bold: true, size: 10, color: { argb: RED_NEG } } } as XStyle);
        });

        const gppTotRow = addTotalRow(wsGPP, ['TOTAL GPP', '', '', '', summary.totalGPPLosses], 5);
        wsGPP.getRow(gppTotRow).getCell(5).numFmt = MONEY;

        // Sección compensación — calculada dinámicamente
        const compSepRow = wsGPP.addRow(['Compensación cruzada GPP ↔ RCM (límite 25%)', '', '', '', '']);
        compSepRow.height = 22;
        wsGPP.mergeCells(compSepRow.number, 1, compSepRow.number, 5);
        applyStyle(wsGPP.getCell(compSepRow.number, 1), S.sectionHeader);

        const addCompRow = (label: string, value: number) => {
          const r = wsGPP.addRow([label, '', '', '', value]);
          r.height = 20;
          applyStyle(r.getCell(1), S.label);
          const vc = r.getCell(5);
          applyStyle(vc, S.valBold);
          vc.numFmt = MONEY;
        };
        addCompRow('RCM bruto', summary.grossIncome);
        addCompRow(`Límite compensable (25% × ${formatCurrency(summary.grossIncome)})`, summary.grossIncome * 0.25);
        addCompRow('Compensación aplicada este ejercicio', -summary.compensacionGPPRCM);
        addCompRow('Base imponible RCM ajustada', summary.baseImponibleRCMAjustada);
        addCompRow('Pérdidas pendientes de arrastrar (4 años)', -summary.perdidasGPPPendientes);
      }

      // ── Download ──────────────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resumen_IRPF_${summary.year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Excel generado', description: `Archivo Resumen_IRPF_${summary.year}.xlsx descargado correctamente.` });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({ title: 'Error', description: 'No se pudo generar el archivo Excel.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  // ─── PDF ─────────────────────────────────────────────────────────────────────

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // ── Header ──────────────────────────────────────────────────────────────
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`Resumen Fiscal IRPF ${summary.year}`, pageWidth / 2, yPos, { align: 'center' });

      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });
      doc.text('Datos listos para tu declaración o tu gestor', pageWidth / 2, yPos + 5, { align: 'center' });

      yPos += 10;
      doc.setFontSize(9);
      doc.text(`Usuario: ${userEmail}`, pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      yPos += 15;

      // ── Resumen General ──────────────────────────────────────────────────────
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen General', 14, yPos);
      yPos += 5;

      const resultadoDeclaracion = summary.estimatedTax - summary.withholdingsApplied;

      autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Importe']],
        body: [
          ['Rendimientos Brutos del Ahorro', formatCurrency(summary.grossIncome)],
          ['  - Intereses', formatCurrency(summary.interestIncome)],
          ['  - Dividendos', formatCurrency(summary.dividendIncome)],
          ['Devoluciones de Principal (informativo)', formatCurrency(summary.principalReturns)],
          ['Gastos Deducibles', formatCurrency(-summary.deductibleExpenses)],
          ['Base Imponible del Ahorro', formatCurrency(summary.taxableBase)],
          ['Cuota Íntegra Estimada', formatCurrency(summary.estimatedTax)],
          ['Retenciones Practicadas', formatCurrency(-summary.withholdingsApplied)],
          ['Resultado Declaración', formatCurrency(resultadoDeclaracion)],
          ['Tipo Efectivo', formatPercentage(summary.effectiveRate)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 50, halign: 'right' as const },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // ── Tramos IRPF ──────────────────────────────────────────────────────────
      const breakdown = getTaxBreakdown(summary.taxableBase);
      if (breakdown.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Cálculo por Tramos', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Tramo', 'Base Gravada', 'Tipo', 'Cuota']],
          body: [
            ...breakdown.map(item => [
              `${formatCurrency(item.bracket.min)} - ${item.bracket.max === Infinity ? '∞' : formatCurrency(item.bracket.max)}`,
              formatCurrency(item.amount),
              `${(item.bracket.rate * 100).toFixed(0)}%`,
              formatCurrency(item.tax),
            ]),
            ['Total', formatCurrency(summary.taxableBase), '', formatCurrency(summary.estimatedTax)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 10 },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // ── Pérdidas GPP (solo si existen pérdidas elegibles) ───────────────────
      if (summary.totalGPPLosses < 0 && defaultedInvestmentsWithLoss.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Pérdidas por Impago (GPP)', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Inversión', 'Plataforma', 'Invertido', 'Recuperado', 'Pérdida']],
          body: [
            ...defaultedInvestmentsWithLoss.map(inv => [
              inv.projectName,
              inv.platform,
              formatCurrency(inv.amountInvested),
              formatCurrency(inv.amountRecovered),
              formatCurrency(inv.loss),
            ]),
            ['', '', '', 'Total GPP', formatCurrency(summary.totalGPPLosses)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 30 },
            2: { cellWidth: 28, halign: 'right' as const },
            3: { cellWidth: 28, halign: 'right' as const },
            4: { cellWidth: 28, halign: 'right' as const },
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable.finalY + 8;

        // Compensation summary table
        autoTable(doc, {
          startY: yPos,
          head: [['Compensación cruzada GPP ↔ RCM (Ley 7/2024)', 'Importe']],
          body: [
            ['RCM bruto', formatCurrency(summary.grossIncome)],
            [`Límite compensable (25% × ${formatCurrency(summary.grossIncome)})`, formatCurrency(summary.grossIncome * 0.25)],
            ['Compensación aplicada este ejercicio', formatCurrency(-summary.compensacionGPPRCM)],
            ['Base imponible RCM ajustada', formatCurrency(summary.baseImponibleRCMAjustada)],
            ['Pérdidas pendientes de arrastrar (4 años)', formatCurrency(-summary.perdidasGPPPendientes)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [100, 100, 100] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 130 },
            1: { cellWidth: 40, halign: 'right' as const },
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // ── Detalle de Pagos ─────────────────────────────────────────────────────
      const incomePayments = enrichedPayments.filter(p => p.type === 'interest' || p.type === 'dividend');

      if (incomePayments.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalle de Pagos', 14, yPos);
        yPos += 5;

        const totalBruto = incomePayments.reduce((s, p) => s + p.amount, 0);
        const totalRetencion = incomePayments.reduce((s, p) => s + p.withholdingApplied, 0);

        autoTable(doc, {
          startY: yPos,
          head: [['Fecha', 'Inversión', 'Plataforma', 'Tipo', 'Bruto (€)', 'Retención (€)', 'Neto (€)']],
          body: [
            ...incomePayments.map(p => [
              new Date(p.date).toLocaleDateString('es-ES'),
              p.investmentName,
              p.platform,
              p.type === 'interest' ? 'Interés' : 'Dividendo',
              formatCurrency(p.amount),
              formatCurrency(p.withholdingApplied),
              formatCurrency(p.amount - p.withholdingApplied),
            ]),
            ['', '', '', 'TOTAL', formatCurrency(totalBruto), formatCurrency(totalRetencion), formatCurrency(totalBruto - totalRetencion)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 48 },
            2: { cellWidth: 28 },
            3: { cellWidth: 18 },
            4: { cellWidth: 22, halign: 'right' as const },
            5: { cellWidth: 22, halign: 'right' as const },
            6: { cellWidth: 22, halign: 'right' as const },
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // ── Detalle por Inversión ────────────────────────────────────────────────
      const byInvMap = new Map<string, { name: string; platform: string; gross: number; withholdings: number }>();
      incomePayments.forEach(p => {
        const e = byInvMap.get(p.investmentId) ?? { name: p.investmentName, platform: p.platform, gross: 0, withholdings: 0 };
        byInvMap.set(p.investmentId, { ...e, gross: e.gross + p.amount, withholdings: e.withholdings + p.withholdingApplied });
      });

      if (byInvMap.size > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalle por Inversión', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Inversión', 'Plataforma', 'Rendimientos Brutos (€)', 'Retenciones (€)', 'Rendimientos Netos (€)']],
          body: Array.from(byInvMap.values()).map(inv => [
            inv.name,
            inv.platform,
            formatCurrency(inv.gross),
            formatCurrency(inv.withholdings),
            formatCurrency(inv.gross - inv.withholdings),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 28 },
            2: { cellWidth: 30, halign: 'right' as const },
            3: { cellWidth: 30, halign: 'right' as const },
            4: { cellWidth: 32, halign: 'right' as const },
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // ── Gastos Deducibles ────────────────────────────────────────────────────
      if (expenses.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Gastos Deducibles', 14, yPos);
        yPos += 7;

        // Legal note before the table
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const noteLines = doc.splitTextToSize(EXPENSES_NOTE, pageWidth - 28);
        doc.text(noteLines, 14, yPos);
        yPos += noteLines.length * 4 + 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
          startY: yPos,
          head: [['Fecha', 'Categoría', 'Descripción', 'Importe']],
          body: [
            ...expenses.map(exp => [
              new Date(exp.date).toLocaleDateString('es-ES'),
              getCategoryLabel(exp.category),
              exp.description,
              formatCurrency(exp.amount),
            ]),
            ['', '', 'Total', formatCurrency(summary.deductibleExpenses)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 40 },
            2: { cellWidth: 80 },
            3: { cellWidth: 30, halign: 'right' as const },
          },
        });
      }

      // ── Footer disclaimer ────────────────────────────────────────────────────
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        '* Este documento es meramente informativo y no constituye asesoramiento fiscal.',
        pageWidth / 2, footerY, { align: 'center' }
      );
      doc.text(
        'Consulte con su asesor fiscal para su situación particular.',
        pageWidth / 2, footerY + 4, { align: 'center' }
      );

      doc.save(`Resumen_IRPF_${summary.year}.pdf`);

      toast({ title: 'PDF generado', description: `Archivo Resumen_IRPF_${summary.year}.pdf descargado correctamente.` });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: 'Error', description: 'No se pudo generar el archivo PDF.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting} className={!isPro ? 'border-dashed' : ''}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : !isPro ? (
            <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Exportar resumen IRPF
          {!isPro && (
            <span className="ml-2 rounded-sm bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
              Pro
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {!isPro ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Exportación disponible en Pro</p>
            <p className="mt-0.5">Exporta el informe en PDF y Excel, listo para tu gestor o declaración.</p>
          </div>
        ) : (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Datos listos para tu declaración o tu gestor
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExportClick(handleExportExcel)} disabled={isExporting}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Descargar Excel (.xlsx)
          {!isPro && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportClick(handleExportPDF)} disabled={isExporting}>
          <FileText className="mr-2 h-4 w-4" />
          Descargar PDF
          {!isPro && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
