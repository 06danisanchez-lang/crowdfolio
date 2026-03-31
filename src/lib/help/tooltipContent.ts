// Centralized help content for contextual tooltips throughout the app

export const HELP_CONTENT = {
  // Dashboard KPIs
  dashboard: {
    totalInvested: 'Suma de todas tus inversiones activas en crowdfunding inmobiliario.',
    expectedReturn: 'Rendimiento medio ponderado esperado de tu cartera basado en la rentabilidad anunciada por cada proyecto.',
    projectedProfit: 'Beneficio total estimado si todas las inversiones terminan según lo previsto.',
    activeInvestments: 'Número de inversiones en estado "activo" (pendientes de recuperar el capital).',
    maturityTimeline: 'Próximas inversiones que vencen y devolverán capital. Revisa las fechas para planificar reinversiones.',
    platformDistribution: 'Distribución de tu cartera por plataforma. Diversificar reduce el riesgo.',
  },

  // Investments
  investments: {
    platform: 'Plataforma de crowdfunding donde realizaste la inversión (Urbanitae, Housers, etc.).',
    projectName: 'Nombre del proyecto inmobiliario tal como aparece en la plataforma.',
    amount: 'Capital invertido en euros.',
    expectedReturn: 'Rentabilidad anual esperada según la plataforma (TIR o rentabilidad anunciada).',
    investmentDate: 'Fecha en que realizaste la inversión.',
    expectedEndDate: 'Fecha estimada de vencimiento o devolución del capital.',
    status: 'Estado actual: Activo (en curso), Completado (finalizado con éxito), o Impago (con problemas).',
    payments: 'Registra los pagos recibidos: intereses, dividendos o devoluciones de capital.',
    importExport: 'Importa inversiones masivamente desde CSV/Excel o exporta tu cartera para backup.',
  },

  // Tax Section
  tax: {
    devengo: 'Los impuestos se calculan cuando el dinero está disponible en la plataforma, no cuando lo retiras al banco.',
    rcm: 'Rendimientos del Capital Mobiliario: intereses y dividendos que tributas en la base del ahorro.',
    gpp: 'Ganancias y Pérdidas Patrimoniales: resultados de ventas de participaciones o pérdidas por impago.',
    compensation25: 'Puedes compensar pérdidas de un cajón (RCM/GPP) con beneficios del otro, hasta el 25% del beneficio.',
    lossCarryforward: 'Las pérdidas no compensadas se arrastran hasta 4 años para usarlas en declaraciones futuras.',
    deductibleExpenses: 'Gastos directamente relacionados con tus inversiones que reducen la base imponible (comisiones, asesoría, etc.).',
    withholdings: 'Retenciones ya pagadas a Hacienda por las plataformas. Se descuentan del impuesto final.',
    foreignIncome: 'Ingresos de plataformas extranjeras. Puede aplicar deducción por doble imposición.',
    modelo720: 'Si tienes más de 50.000€ en activos en el extranjero, debes presentar el Modelo 720.',
    effectiveRate: 'Tipo impositivo real que pagas considerando todos los tramos progresivos.',
    projection: 'Estimación de tu resultado fiscal a final de año basada en inversiones activas.',
  },

  // General
  general: {
    notifications: 'Alertas sobre vencimientos de inversiones, cambios de estado y avisos fiscales.',
    subscription: 'Plan actual y funcionalidades disponibles.',
  },
};

// Helper function to get nested content
export function getHelpContent(section: keyof typeof HELP_CONTENT, key: string): string {
  const sectionContent = HELP_CONTENT[section] as Record<string, string>;
  return sectionContent?.[key] || 'Información no disponible';
}
