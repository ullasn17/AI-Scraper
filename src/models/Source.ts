import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISource extends Document {
  name: string;
  baseUrl: string;
  allowedDomains: string[];
  allowedPaths?: string[];
  governmentLevel: string;
  state?: string;
  department?: string;
  ministry?: string;
  contentType?: 'html' | 'pdf' | 'api' | 'mixed';
  crawlFrequencyHours: number;
  isEnabled: boolean;
  permissionNotes?: string;
  lastCrawledAt?: Date | null;
  lastCrawlStatus?: string | null;
  lastSuccessfulCrawl?: Date | null;
  lastCrawlError?: string | null;
  lastErrorMessage?: string | null;
  errorCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema<ISource>({
  name: { type: String, required: true, trim: true },
  baseUrl: { type: String, required: true, trim: true },
  allowedDomains: { type: [String], required: true },
  allowedPaths: { type: [String], default: [] },
  governmentLevel: { type: String, default: 'CENTRAL' },
  state: { type: String, default: 'National' },
  department: { type: String, default: 'General Administration' },
  ministry: { type: String },
  contentType: { type: String, enum: ['html', 'pdf', 'api', 'mixed'], default: 'html' },
  crawlFrequencyHours: { type: Number, default: 24, min: 1 },
  isEnabled: { type: Boolean, default: false },
  permissionNotes: { type: String, default: 'Public portal guidelines compliant with standard robots.txt' },
  lastCrawledAt: { type: Date, default: null },
  lastCrawlStatus: { type: String, default: null },
  lastSuccessfulCrawl: { type: Date, default: null },
  lastCrawlError: { type: String, default: null },
  lastErrorMessage: { type: String, default: null },
  errorCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

SourceSchema.index({ isEnabled: 1 });
SourceSchema.index({ allowedDomains: 1 });

export const Source: Model<ISource> = mongoose.models.Source || mongoose.model<ISource>('Source', SourceSchema);
