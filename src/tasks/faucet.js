import chalk from 'chalk';
import { formatAse } from '@asentum/sdk';

/**
 * Attempts to claim test ASE from the testnet faucet endpoint
 * Endpoint: POST https://testnet.asentum.com/dev/faucet
 */
export async function claimFaucet(client, address, amountAse = 5) {
    console.log(chalk.cyan(`[Task: Faucet] Requesting ${amountAse} test ASE for ${address}...`));

    const rpcUrl = process.env.RPC_URL || 'https://testnet.asentum.com';
    const faucetEndpoint = `${rpcUrl.replace(/\/+$/, '')}/dev/faucet`;
    const amountWei = (BigInt(amountAse) * 1000000000000000000n).toString();

    // 1. Try standard request
    try {
        const res = await fetch(faucetEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Asentum-Faucet-Kind': 'validator',
                'X-Asentum-Faucet-Token': 'asentum-validator-2026'
            },
            body: JSON.stringify({
                to: address,
                amount: amountWei
            })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.accepted) {
            console.log(chalk.green(`[OK] [Task: Faucet] Successfully claimed ${amountAse} ASE! Drip queued.`));
            return { success: true, accepted: true, data };
        } else if (res.status === 429) {
            console.log(chalk.yellow(`[WARN] [Task: Faucet] Faucet is currently busy/cooldown: ${data.reason || 'Rate limited'}`));
            return { success: false, rateLimited: true, reason: data.reason };
        } else {
            console.log(chalk.yellow(`[WARN] [Task: Faucet] Faucet response: ${data.reason || `HTTP ${res.status}`}`));
            return { success: false, reason: data.reason || `HTTP ${res.status}` };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: Faucet] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
