export const env = {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDocker: process.env.DOCKER_ENV === 'true' || !!process.env.DOCKER_CONTAINER,
    get name() {
        if (this.isDocker) return 'docker';
        if (this.isProduction) return 'production';
        return 'development';
    }
};