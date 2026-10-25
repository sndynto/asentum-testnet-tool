import chalk from 'chalk';
import { formatAse } from '@asentum/sdk';

// ASE Vegas Core Contracts
export const LOTO_CONTRACT = 'ase1ezfewusutg0h9lgwwgv0fk3kxf3wtarvv09jsu';
export const RAFFLE_CONTRACT = 'ase1aknup4w8z6l24cec098m8ez9zqhkm8aeyaahce';

/**
 * Generates 5 unique random numbers between 1 and maxn (default 15)
 */
export function generateRandomLotoGrid(maxn = 15) {
    const nums = new Set();
    while (nums.size < 5) {
        nums.add(Math.floor(Math.random() * maxn) + 1);
    }
    return [...nums].sort((a, b) => a - b);
}

/**
 * Buys 1 Loto grid on ASE Vegas (asevegas.com/loto)
 * Fulfills Quest: "Buy a Loto grid or a Raffle ticket on ASE Vegas · dapp"
 */
export async function executeLotoBuy(client, wallet, customGrid = null) {
    console.log(chalk.cyan(`[Task: ASE Vegas Loto] Checking round status and ticket price...`));

    try {
        const infoRes = await client.viewCall(LOTO_CONTRACT, 'info', []);
        const info = infoRes.returnValue;

        if (!info || info.status !== 'open' || info.paused) {
            console.log(chalk.yellow(`[Task: ASE Vegas Loto] Current round is not open (Status: ${info?.status}, Paused: ${info?.paused}). Skipping.`));
            return { success: false, reason: 'Round not open' };
        }

        const priceWei = BigInt(info.price || '2000000000000000000');
        const priceAse = formatAse(priceWei);
        const maxn = Number(info.maxn || 15);

        const maxAllowed = parseFloat(process.env.MAX_ALLOWED_TX_ASE || '999');
        if (parseFloat(priceAse) > maxAllowed) {
            console.log(chalk.yellow(`[Task: ASE Vegas Loto] Dilewati: Harga tiket kontrak (${priceAse} ASE) melampaui batas MAX_ALLOWED_TX_ASE = ${maxAllowed} ASE.`));
            return { success: true, skipped: true, reason: `Exceeds MAX_ALLOWED_TX_ASE (Ticket price is ${priceAse} ASE)` };
        }

        // Check wallet balance
        const balanceWei = await wallet.getBalance();
        if (balanceWei < priceWei + 10000000000000000n) {
            console.log(chalk.yellow(`[Task: ASE Vegas Loto] Skipped: Insufficient balance (${formatAse(balanceWei)} ASE). Need ${priceAse} ASE.`));
            return { success: false, reason: 'Insufficient balance' };
        }

        // Generate or validate 5 unique numbers
        const grid = customGrid || generateRandomLotoGrid(maxn);
        const seed = Math.random().toString(16).substring(2, 18);

        console.log(chalk.cyan(`[Task: ASE Vegas Loto] Buying 1 grid [${grid.join(', ')}] in Round #${info.round} for ${priceAse} ASE...`));

        const tx = await wallet.sendCall({
            to: LOTO_CONTRACT,
            method: 'buy',
            args: [[grid], seed],
            value: priceWei,
            gasLimit: 2000000n
        });

        console.log(chalk.blue(`[Task: ASE Vegas Loto] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: ASE Vegas Loto] Purchased 1 Loto grid successfully in block #${receipt.blockNumber}!`));
            console.log(chalk.gray(`  Round #${info.round} | Numbers: [${grid.join(', ')}] | Tx: ${tx.hash}`));
            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                round: info.round,
                grid: grid
            };
        } else {
            console.log(chalk.red(`[FAIL] [Task: ASE Vegas Loto] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }

    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: ASE Vegas Loto] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
