import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedScheme extends Document {
  userId: mongoose.Types.ObjectId;
  schemeId: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SavedSchemeSchema = new Schema<ISavedScheme>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  schemeId: { type: Schema.Types.ObjectId, ref: 'Scheme', required: true, index: true },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

SavedSchemeSchema.index({ userId: 1, schemeId: 1 }, { unique: true });

export const SavedScheme: Model<ISavedScheme> = 
  mongoose.models.SavedScheme || mongoose.model<ISavedScheme>('SavedScheme', SavedSchemeSchema);
