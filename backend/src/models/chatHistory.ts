import mongoose from 'mongoose';

export interface IMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: Date;
    toolCalls?: any[];
    toolCallId?: string;
}

export interface IChatSession {
    sessionId: string;
    messages: IMessage[];
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new mongoose.Schema<IMessage>({
    role: { 
        type: String, 
        enum: ['user', 'assistant', 'system', 'tool'], 
        required: true 
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    toolCalls: { type: mongoose.Schema.Types.Mixed },
    toolCallId: { type: String }
});

const sessionSchema = new mongoose.Schema<IChatSession>({
    sessionId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true 
    },
    messages: [messageSchema],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
});

// 自动更新 updatedAt
sessionSchema.pre('findOneAndUpdate', function() {
    this.set({ updatedAt: new Date() });
});

export const ChatSession = mongoose.model<IChatSession>('ChatSession', sessionSchema);

// ========== 工具函数 ==========

export const saveMessage = async (
    sessionId: string, 
    role: IMessage['role'], 
    content: string, 
    toolCalls?: any[],
    toolCallId?: string
): Promise<IChatSession> => {
    const session = await ChatSession.findOneAndUpdate(
        { sessionId },
        {
            $push: { messages: { role, content, timestamp: new Date(), toolCalls, toolCallId } },
            $set: { updatedAt: new Date() }
        },
        { upsert: true, new: true }
    );
    return session;
};

export const getHistory = async (
    sessionId: string, 
    limit: number = 20
): Promise<IMessage[]> => {
    const session = await ChatSession.findOne({ sessionId });
    return session?.messages.slice(-limit) || [];
};

export const clearHistory = async (sessionId: string): Promise<void> => {
    await ChatSession.findOneAndDelete({ sessionId });
};

export const getOrCreateSession = async (sessionId: string): Promise<IChatSession> => {
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
        session = await ChatSession.create({ sessionId, messages: [] });
    }
    return session;
};