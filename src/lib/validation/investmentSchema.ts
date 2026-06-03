import { z } from 'zod';

// Platform enum validation
const platformSchema = z.enum([
  'urbanitae',
  'housers',
  'estateguru',
  'crowdcube',
  'brickstarter',
  'wecity',
  'other'
]);

// Investment status enum validation
const investmentStatusSchema = z.enum(['active', 'pending', 'completed', 'defaulted']);

// Payment type enum validation
const paymentTypeSchema = z.enum(['dividend', 'principal', 'interest', 'capital_return']);

// Income model enum validation
const incomeModelSchema = z.enum(['bullet', 'periodic_fixed', 'amortizing', 'variable_or_unknown', 'equity']);

// Payment frequency enum validation
const paymentFrequencySchema = z.enum(['monthly', 'quarterly', 'semiannual', 'annual']);

// Principal return type enum validation
const principalReturnTypeSchema = z.enum(['at_maturity', 'amortizing', 'unknown']);

// Payment schema
const paymentSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  amount: z.number(),
  type: paymentTypeSchema,
  notes: z.string().optional(),
});

// Investment schema for import validation
export const investmentImportSchema = z.object({
  id: z.string().min(1),
  platform: platformSchema,
  customPlatformName: z.string().optional(),
  projectName: z.string().min(1, 'El nombre del proyecto es requerido').max(500, 'Nombre demasiado largo'),
  amount: z.number().nonnegative('El monto debe ser positivo'),
  investmentDate: z.string().min(1, 'La fecha de inversión es requerida'),
  expectedEndDate: z.string().optional(),
  expectedReturn: z.number().min(-100).max(1000, 'Rendimiento fuera de rango válido'),
  status: investmentStatusSchema,
  payments: z.array(paymentSchema).default([]),
  notes: z.string().max(5000, 'Notas demasiado largas').optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  incomeModel: incomeModelSchema.optional(),
  paymentFrequency: paymentFrequencySchema.optional(),
  principalReturnType: principalReturnTypeSchema.optional(),
});

// Array of investments for JSON import
export const investmentsArraySchema = z.array(investmentImportSchema);

// Schema for CSV row import (more lenient, we build the object)
export const csvRowSchema = z.object({
  platform: platformSchema,
  customPlatformName: z.string().optional(),
  projectName: z.string().min(1, 'El nombre del proyecto es requerido').max(500),
  amount: z.number().nonnegative('El monto debe ser positivo'),
  investmentDate: z.string().min(1),
  expectedEndDate: z.string().optional(),
  expectedReturn: z.number().min(-100).max(1000),
  status: investmentStatusSchema,
  notes: z.string().max(5000).optional(),
  incomeModel: incomeModelSchema.optional(),
  paymentFrequency: paymentFrequencySchema.optional(),
  principalReturnType: principalReturnTypeSchema.optional(),
});

// File size limit (5MB)
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

// Maximum number of investments per import
export const MAX_INVESTMENTS_PER_IMPORT = 10000;

export type ValidatedInvestment = z.infer<typeof investmentImportSchema>;
export type ValidatedCsvRow = z.infer<typeof csvRowSchema>;
