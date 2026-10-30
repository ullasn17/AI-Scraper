import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: 'GENERAL' | 'SCHEME';
  citedSchemes?: Array<{
    schemeId?: string;
    title: string;
    slug?: string;
    url?: string;
  }>;
}

export interface IChatSession extends Document {
  sessionId: string;
  userId?: mongoose.Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  mode: { type: String, enum: ['GENERAL', 'SCHEME'], default: 'GENERAL' },
  citedSchemes: [{
    schemeId: { type: String },
    title: { type: String },
    slug: { type: String },
    url: { type: String },
  }],
}, { _id: false });

const ChatSessionSchema = new Schema<IChatSession>({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, default: 'New Conversation' },
  messages: [ChatMessageSchema],
}, {
  timestamps: true,
});

export const ChatSession: Model<IChatSession> = 
  mongoose.models.ChatSession || mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
