export class Timer {
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    elapsed(): number {
        return Date.now() - this.startTime;
    }

    reset(): void {
        this.startTime = Date.now();
    }
}

export const measureAsync = async <T>(
    fn: () => Promise<T>,
    label?: string
): Promise<{ result: T; elapsedMs: number }> => {
    const start = Date.now();
    const result = await fn();
    const elapsedMs = Date.now() - start;
    if (label) {
        console.log(`[PERF] ${label}: ${elapsedMs}ms`);
    }
    return { result, elapsedMs };
};