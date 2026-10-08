// Librerías pesadas (ExcelJS ~1 MB, jsPDF) que solo hacen falta al exportar o
// importar. Se cargan bajo demanda para que la landing y el panel no las
// descarguen en la primera visita.

export async function loadExcelJS() {
  const mod = await import('exceljs');
  // exceljs es CommonJS: según el empaquetador llega en `default` o directamente.
  return (mod as unknown as { default?: typeof mod }).default ?? mod;
}

export async function loadPdfLibs() {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable: autoTableMod.default };
}
