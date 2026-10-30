import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISchemeVersion extends Document {
  schemeId: mongoose.Types.ObjectId;
  slug?: string;
  schemeName?: string;
  version: number;
  versionNumber?: number;
  changeReason?: string;
  changesSummary?: string;
  snapshot: Record<string, unknown>;
  snapshotData?: Record<string, unknown>;
  changedBy?: mongoose.Types.ObjectId;
  detectedBy?: string;
  createdAt: Date;
}

const SchemeVersionSchema = new Schema<ISchemeVersion>({
  schemeId: { type: Schema.Types.ObjectId, ref: 'Scheme', required: true, index: true },
  slug: { type: String },
  schemeName: { type: String },
  version: { type: Number, default: 1 },
  versionNumber: { type: Number, default: 1 },
  changeReason: { type: String, default: 'Scheme update' },
  changesSummary: { type: String, default: 'Scheme update' },
  snapshot: { type: Schema.Types.Mixed, default: {} },
  snapshotData: { type: Schema.Types.Mixed, default: {} },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  detectedBy: { type: String, default: 'node_scraper_worker' },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

SchemeVersionSchema.index({ schemeId: 1, version: -1 });

export const SchemeVersion: Model<ISchemeVersion> = 
  mongoose.models.SchemeVersion || mongoose.model<ISchemeVersion>('SchemeVersion', SchemeVersionSchema);
