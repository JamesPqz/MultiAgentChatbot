import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './db/database';
import chatRouter from './routers/chat';
import { corsConfig } from './config/cors';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import { env } from './config/env';
import mongoose from 'mongoose';
import abChatRouter from './routers/abChat';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

// middlewares
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' }));  // support larger payloads for image generation
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// routes
app.use('/api/', chatRouter);
app.use('/api/ab-chat', abChatRouter);

// health check
app.get('/health', (req, res) => {
    const isMongoConnected = mongoose.connection.readyState === 1;

    res.json({
        status: isMongoConnected ? 'ok' : 'disconnected',
        mongodb: {
            connected: isMongoConnected,
            readyState: mongoose.connection.readyState
        },
        env: env.name,
        timestamp: new Date().toLocaleString()
    });
});

// error handling
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${env.name}`);
    console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'}`);
});