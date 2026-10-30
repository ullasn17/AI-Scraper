import { describe, it, expect } from 'vitest';
import { ExtractedSchemeSchema } from '../../src/lib/validation/schemeSchema';

describe('ExtractedSchemeSchema Zod Validation', () => {
  it('should validate complete extracted scheme payload', () => {
    const samplePayload = {
      name: 'Pradhan Mantri Awas Yojana',
      summary: 'Comprehensive urban housing scheme providing financial subsidies.',
      description: 'The scheme provides central assistance to Urban Local Bodies and other implementing agencies through States/UTs.',
      category: 'HOUSING',
      governmentLevel: 'CENTRAL',
      benefits: ['Subsidized loan interest rates up to ₹2.67 lakh'],
      eligibility: ['No prior pucca house ownership anywhere in India'],
      requiredDocuments: ['Aadhaar card', 'Income certificate'],
      applicationSteps: ['Register on pmaymis.gov.in', 'Submit online verification'],
      beneficiaryGroups: ['Urban poor', 'EWS'],
      officialSourceUrl: 'https://pmaymis.gov.in/',
      needsReview: false,
    };

    const res = ExtractedSchemeSchema.safeParse(samplePayload);
    expect(res.success).toBe(true);
  });

  it('should reject payload with missing official source URL', () => {
    const invalidPayload = {
      name: 'Invalid Scheme',
      summary: 'Short summary here.',
      description: 'Valid description with sufficient length here.',
      category: 'HOUSING',
      // missing officialSourceUrl
    };

    const res = ExtractedSchemeSchema.safeParse(invalidPayload);
    expect(res.success).toBe(false);
  });

  it('should reject payload with too short name or summary', () => {
    const invalidPayload = {
      name: 'P',
      summary: 'Too short',
      description: 'Too short',
      officialSourceUrl: 'https://gov.in',
    };

    const res = ExtractedSchemeSchema.safeParse(invalidPayload);
    expect(res.success).toBe(false);
  });
});
