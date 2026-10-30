import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
  userId?: mongoose.Types.ObjectId;
  schemeId?: mongoose.Types.ObjectId;
  feedbackType: 'ACCURACY' | 'SUGGESTION' | 'BUG' | 'GENERAL';
  comment: string;
  rating?: number;
  contactEmail?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  schemeId: { type: Schema.Types.ObjectId, ref: 'Scheme' },
  feedbackType: { 
    type: String, 
    enum: ['ACCURACY', 'SUGGESTION', 'BUG', 'GENERAL'], 
    default: 'GENERAL' 
  },
  comment: { type: String, required: true, maxlength: 2000 },
  rating: { type: Number, min: 1, max: 5 },
  contactEmail: { type: String, trim: true },
  status: { type: String, enum: ['PENDING', 'RESOLVED', 'DISMISSED'], default: 'PENDING' },
}, {
  timestamps: true,
});

export const Feedback: Model<IFeedback> = 
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
