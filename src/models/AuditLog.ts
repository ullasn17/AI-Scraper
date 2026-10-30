import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  actorId?: mongoose.Types.ObjectId;
  actorEmail?: string;
  targetType: 'SCHEME' | 'SOURCE' | 'CRAWL_JOB' | 'USER' | 'SYSTEM';
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  actorEmail: { type: String },
  targetType: { 
    type: String, 
    enum: ['SCHEME', 'SOURCE', 'CRAWL_JOB', 'USER', 'SYSTEM'], 
    required: true,
    index: true 
  },
  targetId: { type: String },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> = 
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
