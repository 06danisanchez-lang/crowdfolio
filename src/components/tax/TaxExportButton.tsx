import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TaxSummary, TaxExpense, TAX_EXPENSE_CATEGORIES, EnrichedPayment } from '@/types/tax';
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
  userEmail: string;
  onProRequired?: () => void;
  isPro?: boolean;
}

export function TaxExportButton({
  summary,
  expenses,
  enrichedPayments,
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

      // ── Sheet 1: Resumen General ────────────────────────────────────────────
      const wsResumen = workbook.addWorksheet('Resumen');
      wsResumen.columns = [{ width: 40 }, { width: 20 }];

      wsResumen.addRow(['RESUMEN FISCAL IRPF', summary.year]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Concepto', 'Importe (€)']);
      wsResumen.addRow(['Rendimientos Brutos del Ahorro', summary.grossIncome]);
      wsResumen.addRow(['  - Intereses', summary.interestIncome]);
      wsResumen.addRow(['  - Dividendos', summary.dividendIncome]);
      wsResumen.addRow(['Devoluciones de Principal', summary.principalReturns]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Gastos Deducibles', -summary.deductibleExpenses]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Base Imponible del Ahorro', summary.taxableBase]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Cuota Íntegra Estimada', summary.estimatedTax]);
      wsResumen.addRow(['Retenciones Practicadas', -summary.withholdingsApplied]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Resultado Declaración', summary.estimatedTax - summary.withholdingsApplied]);
      wsResumen.addRow([]);
      // Numeric value with percentage cell format (not a string)
      const effectiveRateRow = wsResumen.addRow(['Tipo Efectivo', summary.effectiveRate]);
      effectiveRateRow.getCell(2).numFmt = '0.00%';

      wsResumen.getRow(1).font = { bold: true, size: 14 };
      wsResumen.getRow(3).font = { bold: true };

      // ── Sheet 2: Tramos IRPF ────────────────────────────────────────────────
      const wsTramos = workbook.addWorksheet('Tramos IRPF');
      wsTramos.columns = [{ width: 30 }, { width: 20 }, { width: 15 }, { width: 18 }];

      const breakdown = getTaxBreakdown(summary.taxableBase);
      wsTramos.addRow(['CÁLCULO POR TRAMOS IRPF', summary.year, '', '']);
      wsTramos.addRow([]);
      wsTramos.addRow(['Tramo', 'Base Gravada (€)', 'Tipo (%)', 'Cuota (€)']);
      breakdown.forEach(item => {
        wsTramos.addRow([
          `${formatCurrency(item.bracket.min)} - ${item.bracket.max === Infinity ? '∞' : formatCurrency(item.bracket.max)}`,
          item.amount,
          `${(item.bracket.rate * 100).toFixed(0)}%`,
          item.tax,
        ]);
      });
      wsTramos.addRow([]);
      wsTramos.addRow(['TOTAL', summary.taxableBase, '', summary.estimatedTax]);
      wsTramos.getRow(1).font = { bold: true, size: 14 };
      wsTramos.getRow(3).font = { bold: true };

      // ── Sheet 3: Gastos Deducibles ──────────────────────────────────────────
      const wsGastos = workbook.addWorksheet('Gastos Deducibles');
      wsGastos.columns = [{ width: 15 }, { width: 28 }, { width: 45 }, { width: 18 }];

      wsGastos.addRow(['GASTOS DEDUCIBLES', summary.year, '', '']);
      wsGastos.addRow([]);
      const gasNoteRow = wsGastos.addRow([EXPENSES_NOTE, '', '', '']);
      gasNoteRow.getCell(1).font = { italic: true, size: 8 };
      wsGastos.addRow([]);
      wsGastos.addRow(['Fecha', 'Categoría', 'Descripción', 'Importe (€)']);
      expenses.forEach(exp => {
        wsGastos.addRow([
          new Date(exp.date).toLocaleDateString('es-ES'),
          getCategoryLabel(exp.category),
          exp.description,
          exp.amount,
        ]);
      });
      wsGastos.addRow([]);
      wsGastos.addRow(['TOTAL', '', '', summary.deductibleExpenses]);
      wsGastos.getRow(1).font = { bold: true, size: 14 };
      wsGastos.getRow(5).font = { bold: true }; // header row shifted by note rows

      // ── Sheet 4: Detalle de Pagos ───────────────────────────────────────────
      const wsPagos = workbook.addWorksheet('Detalle de Pagos');
      wsPagos.columns = [
        { width: 15 }, { width: 40 }, { width: 20 },
        { width: 12 }, { width: 18 }, { width: 18 }, { width: 18 },
      ];

      const incomePayments = enrichedPayments.filter(p => p.type === 'interest' || p.type === 'dividend');

      wsPagos.addRow(['DETALLE DE PAGOS', summary.year, '', '', '', '', '']);
      wsPagos.addRow([]);
      wsPagos.addRow(['Fecha', 'Inversión', 'Plataforma', 'Tipo', 'Bruto (€)', 'Retención (€)', 'Neto (€)']);
      let totalBruto = 0;
      let totalRetencion = 0;
      incomePayments.forEach(p => {
        totalBruto += p.amount;
        totalRetencion += p.withholdingApplied;
        wsPagos.addRow([
          new Date(p.date).toLocaleDateString('es-ES'),
          p.investmentName,
          p.platform,
          p.type === 'interest' ? 'Interés' : 'Dividendo',
          p.amount,
          p.withholdingApplied,
          p.amount - p.withholdingApplied,
        ]);
      });
      wsPagos.addRow([]);
      wsPagos.addRow(['', '', '', 'TOTAL', totalBruto, totalRetencion, totalBruto - totalRetencion]);
      wsPagos.getRow(1).font = { bold: true, size: 14 };
      wsPagos.getRow(3).font = { bold: true };

      // ── Sheet 5: Detalle por Inversión ──────────────────────────────────────
      const wsInv = workbook.addWorksheet('Por Inversión');
      wsInv.columns = [{ width: 40 }, { width: 20 }, { width: 24 }, { width: 22 }, { width: 24 }];

      const byInvMap = new Map<string, { name: string; platform: string; gross: number; withholdings: number }>();
      incomePayments.forEach(p => {
        const e = byInvMap.get(p.investmentId) ?? { name: p.investmentName, platform: p.platform, gross: 0, withholdings: 0 };
        byInvMap.set(p.investmentId, { ...e, gross: e.gross + p.amount, withholdings: e.withholdings + p.withholdingApplied });
      });

      wsInv.addRow(['DETALLE POR INVERSIÓN', summary.year, '', '', '']);
      wsInv.addRow([]);
      wsInv.addRow(['Inversión', 'Plataforma', 'Rendimientos Brutos (€)', 'Retenciones (€)', 'Rendimientos Netos (€)']);
      byInvMap.forEach(inv => {
        wsInv.addRow([inv.name, inv.platform, inv.gross, inv.withholdings, inv.gross - inv.withholdings]);
      });
      wsInv.getRow(1).font = { bold: true, size: 14 };
      wsInv.getRow(3).font = { bold: true };

      // ── Download ────────────────────────────────────────────────────────────
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
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Exportar resumen IRPF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Datos listos para tu declaración o tu gestor
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExportClick(handleExportExcel)} disabled={isExporting}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Descargar Excel (.xlsx)
          {!isPro && <span className="ml-auto text-xs text-muted-foreground">Pro</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportClick(handleExportPDF)} disabled={isExporting}>
          <FileText className="mr-2 h-4 w-4" />
          Descargar PDF
          {!isPro && <span className="ml-auto text-xs text-muted-foreground">Pro</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
