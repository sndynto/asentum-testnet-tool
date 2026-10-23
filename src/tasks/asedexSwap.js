import { aseToWei, formatAse } from '@asentum/sdk';
import chalk from 'chalk';
import { getRandomAseAmount } from '../utils/randomizer.js';

// Official AseDex Exchange Contract (asepad.fun/dex)
export const ASEDEX_CONTRACT = 'ase1cwpnkultxqjz9z09xwe7jlztw2uhuf8fklhzsm';
const NATIVE_ASE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

/**
 * Execute a token swap on AseDex (Pool 1).
 * Directly fulfills the "Make a swap on AseDex" quest on airdrop.asentum.com.
 */
export async function executeAseDexSwap(client, wallet) {
    // Random swap amount strictly < 0.13 ASE (e.g. 0.0040 to 0.0450 ASE)
    const swapAmountStr = getRandomAseAmount(0.004, 0.045, 4);
    const amountWei = aseToWei(swapAmountStr);

    console.log(chalk.cyan(`[Task: AseDex Swap] Swapping randomized ${swapAmountStr} ASE on AseDex (${ASEDEX_CONTRACT})...`));

    const balanceWei = await wallet.getBalance();
    if (balanceWei < amountWei) {
        console.log(chalk.yellow(`[Task: AseDex Swap] Skipped: Insufficient balance (${formatAse(balanceWei)} ASE).`));
        return { success: false, reason: 'Insufficient balance' };
    }

    try {
        // Pool 1: native ASE <-> ARC20 Token
        const poolId = '1';
        const minOut = '1';

        const tx = await wallet.sendCall({
            to: ASEDEX_CONTRACT,
            method: 'swapExactIn',
            args: [poolId, NATIVE_ASE_ADDRESS, amountWei.toString(), minOut],
            valueWei: amountWei,
            gasLimit: 2000000n
        });

        console.log(chalk.blue(`[Task: AseDex Swap] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: AseDex Swap] SUCCESS! Swapped ${swapAmountStr} ASE in block #${receipt.blockNumber}!`));
            console.log(chalk.green(`  Quest "Make a swap on AseDex" terpenuhi! (Tx: ${tx.hash})`));
            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amountAse: swapAmountStr
            };
        } else {
            console.log(chalk.red(`[FAIL] [Task: AseDex Swap] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: AseDex Swap] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
