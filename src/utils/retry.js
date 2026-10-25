import chalk from 'chalk';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes an async function with automatic exponential backoff on RPC / Network hiccups (502, 503, 504, 429, timeouts).
 */
export async function withRpcRetry(fn, options = {}) {
    const maxRetries = options.maxRetries || 5;
    const baseDelayMs = options.baseDelayMs || 3000;
    const label = options.label || 'RPC';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const msg = err?.message || String(err);
            const status = err?.status;
            const is5xx = status === 502 || status === 503 || status === 504 || status === 500;
            const isNetwork = err?.code === 'NETWORK_ERROR' || msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND') || msg.includes('timeout');
            const isRetryable = is5xx || isNetwork || status === 429;

            if (isRetryable && attempt < maxRetries) {
                const waitMs = Math.min(baseDelayMs * Math.pow(1.5, attempt - 1), 25000);
                console.log(chalk.yellow(`[WARN] Server ${label} sedang sibuk (${msg}). Mencoba ulang (${attempt}/${maxRetries}) dalam ${(waitMs / 1000).toFixed(1)} detik...`));
                await sleep(waitMs);
                continue;
            }
            throw err;
        }
    }
}
