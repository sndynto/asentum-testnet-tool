import { aseToWei, formatAse } from '@asentum/sdk';
import chalk from 'chalk';
import { getRandomAseAmount } from '../utils/randomizer.js';

export const AURAS_ROUTER_ADDRESS = 'ase1v0myp2de3dhj3crvkhxqlnjaw2mvp64a9efkpl';
const NATIVE_ASE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export async function executeAurasSwap(client, wallet) {
    // Random swap amount strictly < 0.13 ASE (e.g. 0.0063 to 0.0487 ASE)
    const swapAmountStr = getRandomAseAmount(0.005, 0.05, 4);
    const amountWei = aseToWei(swapAmountStr);

    console.log(chalk.cyan(`[Task: Auras Swap] Swapping randomized ${swapAmountStr} ASE on Auras Router...`));

    const balanceWei = await wallet.getBalance();
    if (balanceWei < amountWei) {
        console.log(chalk.yellow(`[Task: Auras Swap] Skipped: Insufficient balance (${formatAse(balanceWei)} ASE). Need faucet.`));
        return { success: false, reason: 'Insufficient balance' };
    }

    try {
        const poolId = '1';
        const minOut = '1';

        const tx = await wallet.sendCall({
            to: AURAS_ROUTER_ADDRESS,
            method: 'swapExactIn',
            args: [poolId, NATIVE_ASE_ADDRESS, amountWei.toString(), minOut],
            valueWei: amountWei,
            gasLimit: 3000000n
        });

        console.log(chalk.blue(`[Task: Auras Swap] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });
        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: Auras Swap] Swapped ${swapAmountStr} ASE in block #${receipt.blockNumber}!`));
            return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber, amount: swapAmountStr };
        } else {
            console.log(chalk.red(`[FAIL] [Task: Auras Swap] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: Auras Swap] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
