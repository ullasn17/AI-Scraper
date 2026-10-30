import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEligibilityObject {
  ageMinimum?: number | null;
  ageMaximum?: number | null;
  incomeMaximum?: number | null;
  occupations?: string[];
  educationLevels?: string[];
  states?: string[];
  gender?: string;
  casteCategories?: string[];
  disabilitySupported?: boolean;
  otherCriteria?: string[];
}

export interface IEvidenceSnippet {
  field?: string;
  snippet?: string;
}

export interface IScheme extends Document {
  name: string;
  schemeName?: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  benefits: string[];
  eligibility: string[] | Record<string, unknown>;
  beneficiaryGroups: string[];
  requiredDocuments: string[];
  applicationSteps: string[];
  governmentLevel: string;
  state?: string | null;
  ministry?: string | null;
  applicationStartDate?: Date | null;
  applicationEndDate?: Date | null;
  applicationUrl?: string | null;
  officialSourceUrl: string;
  sourcePublishedAt?: Date | null;
  lastCheckedAt: Date;
  contentHash?: string;
  verificationStatus: string;
  needsReview: boolean;
  confidenceScore: number;
  evidence: Array<Record<string, unknown> | string>;
  sourceId?: mongoose.Types.ObjectId;
  version: number;
  ageCriteria?: {
    minAge?: number | null;
    maxAge?: number | null;
  };
  incomeCriteria?: {
    maxAnnualIncome?: number | null;
    description?: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SchemeSchema = new Schema<IScheme>({
  name: { type: String, trim: true },
  schemeName: { type: String, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  summary: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
  },
  benefits: { type: [String], default: [] },
  eligibility: { type: Schema.Types.Mixed, default: [] },
  beneficiaryGroups: { type: [String], default: [] },
  requiredDocuments: { type: [String], default: [] },
  applicationSteps: { type: [String], default: [] },
  governmentLevel: { 
    type: String, 
    required: true, 
    uppercase: true,
    enum: ['CENTRAL', 'STATE', 'central', 'state'] 
  },
  state: { type: String, default: null },
  ministry: { type: String, default: null },
  applicationStartDate: { type: Date, default: null },
  applicationEndDate: { type: Date, default: null },
  applicationUrl: { type: String, default: null },
  officialSourceUrl: { type: String, required: true },
  sourcePublishedAt: { type: Date, default: null },
  lastCheckedAt: { type: Date, default: Date.now },
  contentHash: { type: String, default: '' },
  verificationStatus: {
    type: String,
    uppercase: true,
    enum: ['VERIFIED', 'PENDING', 'REJECTED', 'verified', 'pending', 'rejected'],
    default: 'VERIFIED',
  },
  needsReview: { type: Boolean, default: false },
  confidenceScore: { type: Number, default: 90, min: 0, max: 100 },
  evidence: { type: Schema.Types.Mixed, default: [] },
  sourceId: { type: Schema.Types.ObjectId, ref: 'Source' },
  version: { type: Number, default: 1 },
  ageCriteria: {
    minAge: { type: Number, default: null },
    maxAge: { type: Number, default: null },
  },
  incomeCriteria: {
    maxAnnualIncome: { type: Number, default: null },
    description: { type: String, default: null },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Auto-sync name and schemeName
SchemeSchema.pre('validate', function () {
  const doc = this as unknown as IScheme;
  if (doc.name && !doc.schemeName) {
    doc.schemeName = doc.name;
  } else if (doc.schemeName && !doc.name) {
    doc.name = doc.schemeName;
  }
});

// Indexes for high performance filtering and search
SchemeSchema.index({ category: 1, state: 1, governmentLevel: 1 });
SchemeSchema.index({ verificationStatus: 1, needsReview: 1 });
SchemeSchema.index({ lastCheckedAt: -1 });
SchemeSchema.index({
  name: 'text',
  schemeName: 'text',
  summary: 'text',
  description: 'text',
  ministry: 'text',
}, {
  weights: {
    name: 10,
    schemeName: 10,
    summary: 5,
    ministry: 3,
    description: 1
  },
  name: 'SchemeUnifiedTextIndex'
});

export const Scheme: Model<IScheme> = mongoose.models.Scheme || mongoose.model<IScheme>('Scheme', SchemeSchema);
