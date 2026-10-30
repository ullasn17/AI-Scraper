import { z } from 'zod';

export const ExtractedSchemeSchema = z.object({
  name: z.string().min(3, 'Scheme name must be at least 3 characters'),
  slug: z.string().optional(),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.enum([
    'EDUCATION',
    'AGRICULTURE',
    'HEALTHCARE',
    'HOUSING',
    'FINANCIAL_SERVICES',
    'WOMEN_AND_CHILD',
    'EMPLOYMENT',
    'BUSINESS_MSME',
    'SOCIAL_WELFARE',
    'OTHER',
  ]).default('OTHER'),
  governmentLevel: z.enum(['CENTRAL', 'STATE']).default('CENTRAL'),
  state: z.string().nullable().optional(),
  ministry: z.string().nullable().optional(),
  benefits: z.array(z.string()).default([]),
  eligibility: z.array(z.string()).default([]),
  requiredDocuments: z.array(z.string()).default([]),
  applicationSteps: z.array(z.string()).default([]),
  beneficiaryGroups: z.array(z.string()).default([]),
  ageCriteria: z.object({
    minAge: z.number().nullable().optional(),
    maxAge: z.number().nullable().optional(),
  }).optional(),
  incomeCriteria: z.object({
    maxAnnualIncome: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
  }).optional(),
  applicationUrl: z.string().url().nullable().optional().or(z.literal('')),
  officialSourceUrl: z.string().url(),
  applicationStartDate: z.string().nullable().optional(),
  applicationEndDate: z.string().nullable().optional(),
  evidence: z.array(z.string()).default([]),
  needsReview: z.boolean().default(false),
});

export type ExtractedSchemeType = z.infer<typeof ExtractedSchemeSchema>;
