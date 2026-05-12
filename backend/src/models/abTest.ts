import { logger } from '../utils/logger';

export interface ABTestRecord {
    sessionId: string;
    variant: 'A' | 'B';           // A = single Agent, B = multi Agent
    message: string;
    messageLength: number;
    responseLength: number;
    latency: number; 
    success: boolean;
    errorMessage?: string;
    timestamp: Date;
}

// in-memory storage
const abTestRecords: ABTestRecord[] = [];

export async function saveABTestRecord(record: Omit<ABTestRecord, 'timestamp'>): Promise<void> {
    const fullRecord: ABTestRecord = {
        ...record,
        timestamp: new Date()
    };
    abTestRecords.push(fullRecord);
    logger.debug(`ABTest record saved: ${record.sessionId} -> ${record.variant}, total: ${abTestRecords.length}`);
}

export async function getABTestStats(): Promise<{
    total: number;
    variantA: { count: number; avgLatency: number; avgResponseLength: number };
    variantB: { count: number; avgLatency: number; avgResponseLength: number };
}> {
    const aRecords = abTestRecords.filter(r => r.variant === 'A');
    const bRecords = abTestRecords.filter(r => r.variant === 'B');
    
    const calcAvg = (records: ABTestRecord[], key: 'latency' | 'responseLength') => {
        if (records.length === 0) return 0;
        return records.reduce((sum, r) => sum + r[key], 0) / records.length;
    };
    
    return {
        total: abTestRecords.length,
        variantA: {
            count: aRecords.length,
            avgLatency: calcAvg(aRecords, 'latency'),
            avgResponseLength: calcAvg(aRecords, 'responseLength')
        },
        variantB: {
            count: bRecords.length,
            avgLatency: calcAvg(bRecords, 'latency'),
            avgResponseLength: calcAvg(bRecords, 'responseLength')
        }
    };
}

export async function getAllABTestRecords(): Promise<ABTestRecord[]> {
    return [...abTestRecords];
}

export async function clearABTestRecords(): Promise<void> {
    abTestRecords.length = 0;
    logger.info('ABTest records cleared');
}
