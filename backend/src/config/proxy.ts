import { env } from './env';

const getProxyHost = () => {
    if (env.isDocker) {
        return process.env.DOCKER_PROXY_HOST || 'host.docker.internal';
    }
    return process.env.PROXY_HOST || '127.0.0.1';
};

export const proxyConfig = {
    enabled: process.env.PROXY_ENABLED === 'true',
    host: getProxyHost(),
    port: parseInt(process.env.PROXY_PORT || '7897'),
    timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),  // 代理超时
    get url() {
        return `http://${this.host}:${this.port}`;
    }
};