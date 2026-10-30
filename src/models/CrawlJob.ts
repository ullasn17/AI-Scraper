import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICrawlJob extends Document {
  jobId?: string;
  sourceId?: mongoose.Types.ObjectId | null;
  sourceName?: string;
  targetUrl: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW';
  startedAt: Date;
  completedAt?: Date | null;
  finishedAt?: Date | null;
  schemesFound: number;
  schemesCreated: number;
  schemesUpdated: number;
  pagesDiscovered?: number;
  pagesFetched?: number;
  errorMessage?: string;
  logs: string[];
  triggeredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CrawlJobSchema = new Schema<ICrawlJob>({
  jobId: { type: String },
  sourceId: { type: Schema.Types.ObjectId, ref: 'Source', default: null },
  sourceName: { type: String },
  targetUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW'],
    default: 'PENDING',
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  schemesFound: { type: Number, default: 0 },
  schemesCreated: { type: Number, default: 0 },
  schemesUpdated: { type: Number, default: 0 },
  pagesDiscovered: { type: Number, default: 0 },
  pagesFetched: { type: Number, default: 0 },
  errorMessage: { type: String },
  logs: { type: Schema.Types.Mixed, default: [] },
  triggeredBy: { type: String, default: 'admin_manual' },
}, {
  timestamps: true,
});

CrawlJobSchema.index({ status: 1, startedAt: -1 });

export const CrawlJob: Model<ICrawlJob> = mongoose.models.CrawlJob || mongoose.model<ICrawlJob>('CrawlJob', CrawlJobSchema);
