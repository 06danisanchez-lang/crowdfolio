import { TaxSummary } from '@/types/tax';
import { getTaxBreakdown } from '@/lib/tax/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface TaxBreakdownTableProps {
  summary: TaxSummary;
}

export function TaxBreakdownTable({ summary }: TaxBreakdownTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const taxBreakdown = getTaxBreakdown(summary.taxableBase);

  return (
    <div className="space-y-6">
      {/* Income Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose de Rendimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Rendimiento</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">% del Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Intereses</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.interestIncome)}</TableCell>
                <TableCell className="text-right">
                  {summary.grossIncome > 0
                    ? `${((summary.interestIncome / summary.grossIncome) * 100).toFixed(1)}%`
                    : '0%'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Dividendos</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.dividendIncome)}</TableCell>
                <TableCell className="text-right">
                  {summary.grossIncome > 0
                    ? `${((summary.dividendIncome / summary.grossIncome) * 100).toFixed(1)}%`
                    : '0%'}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Total Rendimientos</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(summary.grossIncome)}
                </TableCell>
                <TableCell className="text-right font-semibold">100%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Devolución de Principal</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(summary.principalReturns)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  (No tributa)
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tax Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cálculo del IRPF por Tramos</CardTitle>
        </CardHeader>
        <CardContent>
          {taxBreakdown.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay base imponible para calcular
            </p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tramo</TableHead>
                    <TableHead className="text-right">Base en Tramo</TableHead>
                    <TableHead className="text-right">Tipo</TableHead>
                    <TableHead className="text-right">Cuota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxBreakdown.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.bracket.max === Infinity
                          ? `Más de ${formatCurrency(item.bracket.min)}`
                          : `${formatCurrency(item.bracket.min)} - ${formatCurrency(item.bracket.max)}`}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right">{(item.bracket.rate * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.tax)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-semibold">
                      Cuota Total Estimada
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(summary.estimatedTax)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Visual Breakdown */}
              <div className="space-y-2 pt-4">
                <p className="text-sm font-medium">Distribución por Tramos</p>
                <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                  {taxBreakdown.map((item, index) => {
                    const percentage =
                      summary.taxableBase > 0
                        ? (item.amount / summary.taxableBase) * 100
                        : 0;
                    const colors = [
                      'bg-green-500',
                      'bg-yellow-500',
                      'bg-orange-500',
                      'bg-red-500',
                    ];
                    return (
                      <div
                        key={index}
                        className={`${colors[index]} transition-all`}
                        style={{ width: `${percentage}%` }}
                        title={`${(item.bracket.rate * 100).toFixed(0)}%: ${formatCurrency(item.amount)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  {taxBreakdown.map((item, index) => {
                    const colors = [
                      'bg-green-500',
                      'bg-yellow-500',
                      'bg-orange-500',
                      'bg-red-500',
                    ];
                    return (
                      <div key={index} className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${colors[index]}`} />
                        <span>{(item.bracket.rate * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de Liquidación</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Rendimientos Brutos</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.grossIncome)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>- Gastos Deducibles</TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-400">
                  -{formatCurrency(summary.deductibleExpenses)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-semibold">= Base Imponible del Ahorro</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(summary.taxableBase)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cuota Íntegra (según tramos)</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.estimatedTax)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>- Retenciones Ya Practicadas</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">
                  -{formatCurrency(summary.withholdingsApplied)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2 bg-muted/50">
                <TableCell className="font-bold">= Resultado de la Declaración</TableCell>
                <TableCell
                  className={`text-right font-bold ${
                    summary.estimatedTax - summary.withholdingsApplied > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {formatCurrency(summary.estimatedTax - summary.withholdingsApplied)}
                  <span className="ml-2 text-xs font-normal">
                    {summary.estimatedTax - summary.withholdingsApplied > 0
                      ? '(A pagar)'
                      : '(A devolver)'}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
