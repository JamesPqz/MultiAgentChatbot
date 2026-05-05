import { env } from './env';

const getMongoUri = () => {
    if (env.isDocker) {
        return process.env.MONGODB_URI_DOCKER || 'mongodb://mongodb:27017/chatbot';
    }
    return process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/chatbot';
};

export const mongodbConfig = {
    uri: getMongoUri(),
    dbName: process.env.MONGODB_DB_NAME || 'chatbot',
    options: {
        connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000'),
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000')
    }
};