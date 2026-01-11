import { useRef, useState } from 'react';
import { Upload, Download, FileJson, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Investment, PLATFORMS, STATUS_OPTIONS, Platform, InvestmentStatus } from '@/types/investment';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  investmentsArraySchema, 
  csvRowSchema, 
  MAX_IMPORT_FILE_SIZE, 
  MAX_INVESTMENTS_PER_IMPORT 
} from '@/lib/validation/investmentSchema';
import { ZodError } from 'zod';

interface ImportExportProps {
  investments: Investment[];
  onImport: (investments: Investment[], replace: boolean) => void;
  exportData: () => string;
}

// Helper to format Zod errors for user display
const formatZodError = (error: ZodError): string => {
  const issues = error.issues.slice(0, 3); // Show first 3 errors
  const messages = issues.map(issue => {
    const path = issue.path.join(' → ');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  const remaining = error.issues.length - 3;
  if (remaining > 0) {
    messages.push(`... y ${remaining} errores más`);
  }
  return messages.join('\n');
};

export function ImportExport({ investments, onImport, exportData }: ImportExportProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inversiones-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Datos exportados correctamente');
  };

  const handleExportCSV = () => {
    const headers = [
      'Plataforma',
      'Nombre Proyecto',
      'Monto',
      'Fecha Inversión',
      'Fecha Vencimiento',
      'Rendimiento Esperado',
      'Estado',
      'Notas',
    ];

    const rows = investments.map(inv => [
      inv.platform === 'other' ? inv.customPlatformName || 'Otra' : PLATFORMS.find(p => p.value === inv.platform)?.label,
      inv.projectName,
      inv.amount,
      inv.investmentDate.split('T')[0],
      inv.expectedEndDate?.split('T')[0] || '',
      inv.expectedReturn,
      STATUS_OPTIONS.find(s => s.value === inv.status)?.label,
      inv.notes || '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inversiones-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Datos exportados a CSV');
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Plataforma',
      'Nombre Proyecto',
      'Monto',
      'Fecha Inversión (YYYY-MM-DD)',
      'Fecha Vencimiento (YYYY-MM-DD)',
      'Rendimiento Esperado (%)',
      'Estado',
      'Notas',
    ];

    const example = [
      'Urbanitae',
      'Promoción Residencial Madrid',
      '5000',
      '2024-01-15',
      '2025-01-15',
      '10',
      'Activo',
      'Primera inversión en esta plataforma',
    ];

    const csv = [headers, example]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-inversiones.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Plantilla descargada');
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size validation
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setImportError(`El archivo es demasiado grande. Máximo permitido: ${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        
        // Parse JSON safely
        let parsedData: unknown;
        try {
          parsedData = JSON.parse(text);
        } catch {
          throw new Error('El archivo no contiene JSON válido');
        }

        // Validate that it's an array
        if (!Array.isArray(parsedData)) {
          throw new Error('El archivo debe contener un array de inversiones');
        }

        // Check max items limit
        if (parsedData.length > MAX_INVESTMENTS_PER_IMPORT) {
          throw new Error(`Demasiadas inversiones. Máximo permitido: ${MAX_INVESTMENTS_PER_IMPORT}`);
        }

        // Validate with zod schema
        const validatedData = investmentsArraySchema.parse(parsedData) as Investment[];
        
        onImport(validatedData, false);
        setImportOpen(false);
        setImportError(null);
        toast.success(`${validatedData.length} inversiones importadas`);
      } catch (error) {
        if (error instanceof ZodError) {
          setImportError(`Error de validación:\n${formatZodError(error)}`);
        } else if (error instanceof Error) {
          setImportError(error.message);
        } else {
          setImportError('Error al procesar el archivo JSON. Asegúrate de que sea un archivo válido.');
        }
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size validation
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setImportError(`El archivo es demasiado grande. Máximo permitido: ${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('El archivo debe contener al menos una fila de encabezados y una de datos');
        }

        // Check max items limit
        if (lines.length - 1 > MAX_INVESTMENTS_PER_IMPORT) {
          throw new Error(`Demasiadas inversiones. Máximo permitido: ${MAX_INVESTMENTS_PER_IMPORT}`);
        }

        const validationErrors: string[] = [];
        const validatedInvestments: Investment[] = [];

        lines.slice(1).forEach((line, index) => {
          try {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => 
              v.replace(/^"|"$/g, '').trim()
            ) || [];

            const platformName = values[0]?.toLowerCase() || '';
            const platform = PLATFORMS.find(p => 
              p.label.toLowerCase() === platformName || p.value === platformName
            )?.value as Platform || 'other';

            const statusName = values[6]?.toLowerCase() || '';
            const status = STATUS_OPTIONS.find(s => 
              s.label.toLowerCase() === statusName || s.value === statusName
            )?.value as InvestmentStatus || 'active';

            // Build the object for validation
            const rowData = {
              platform,
              customPlatformName: platform === 'other' ? values[0] : undefined,
              projectName: values[1] || `Proyecto ${index + 1}`,
              amount: parseFloat(values[2]) || 0,
              investmentDate: values[3] ? new Date(values[3]).toISOString() : new Date().toISOString(),
              expectedEndDate: values[4] ? new Date(values[4]).toISOString() : undefined,
              expectedReturn: parseFloat(values[5]) || 0,
              status,
              notes: values[7] || undefined,
            };

            // Validate with zod schema
            const validated = csvRowSchema.parse(rowData);

            // Create the full Investment object
            const investment: Investment = {
              id: crypto.randomUUID(),
              platform: validated.platform,
              customPlatformName: validated.customPlatformName,
              projectName: validated.projectName,
              amount: validated.amount,
              investmentDate: validated.investmentDate || new Date().toISOString(),
              expectedEndDate: validated.expectedEndDate,
              expectedReturn: validated.expectedReturn,
              status: validated.status,
              notes: validated.notes,
              payments: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            validatedInvestments.push(investment);
          } catch (rowError) {
            if (rowError instanceof ZodError) {
              validationErrors.push(`Fila ${index + 2}: ${rowError.issues[0]?.message || 'Error de validación'}`);
            } else {
              validationErrors.push(`Fila ${index + 2}: Error de formato`);
            }
          }
        });

        // If there are validation errors and no valid investments
        if (validationErrors.length > 0 && validatedInvestments.length === 0) {
          throw new Error(`Errores de validación:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n... y ${validationErrors.length - 5} errores más` : ''}`);
        }

        // If there are some errors but also some valid investments, warn but proceed
        if (validationErrors.length > 0) {
          toast.warning(`${validationErrors.length} filas con errores fueron omitidas`);
        }

        if (validatedInvestments.length === 0) {
          throw new Error('No se encontraron inversiones válidas en el archivo');
        }

        onImport(validatedInvestments, false);
        setImportOpen(false);
        setImportError(null);
        toast.success(`${validatedInvestments.length} inversiones importadas desde CSV`);
      } catch (error) {
        if (error instanceof Error) {
          setImportError(error.message);
        } else {
          setImportError('Error al procesar el archivo CSV. Verifica el formato.');
        }
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="flex gap-2">
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Inversiones</DialogTitle>
            <DialogDescription>
              Importa tus inversiones desde un archivo JSON o CSV
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{importError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">Desde archivo JSON</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Importa un backup previo exportado desde esta aplicación
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportJSON}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <FileJson className="mr-2 h-4 w-4" />
                Seleccionar JSON
              </Button>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">Desde archivo CSV/Excel</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Importa inversiones desde una hoja de cálculo
              </p>
              <div className="flex gap-2">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
                <Button variant="secondary" onClick={() => csvInputRef.current?.click()}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Seleccionar CSV
                </Button>
                <Button variant="ghost" onClick={handleDownloadTemplate}>
                  Descargar Plantilla
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Inversiones</DialogTitle>
            <DialogDescription>
              Descarga tus inversiones para backup o análisis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">Exportar como JSON</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Incluye todos los datos y pagos. Ideal para backups.
              </p>
              <Button onClick={handleExportJSON}>
                <FileJson className="mr-2 h-4 w-4" />
                Descargar JSON
              </Button>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">Exportar como CSV</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Compatible con Excel y Google Sheets
              </p>
              <Button onClick={handleExportCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Descargar CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
