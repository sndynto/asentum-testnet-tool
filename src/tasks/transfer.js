import { aseToWei, formatAse } from '@asentum/sdk';
import chalk from 'chalk';
import { getRandomAseAmount } from '../utils/randomizer.js';

// Community / faucet return address as safe default
const DEFAULT_RECIPIENT = 'ase13aazds7gzjg785n8dkeh9us53y3rhws5lfzuv2';

export async function executeTransfer(client, wallet, targetRecipient = null) {
    const recipient = targetRecipient || (process.env.RECIPIENT_ADDRESS || '').trim() || DEFAULT_RECIPIENT;
    // Random transfer amount strictly below 0.13 ASE (e.g. 0.0012 to 0.0048 ASE)
    const amountStr = getRandomAseAmount(0.001, 0.005, 5);
    const amountWei = aseToWei(amountStr);

    console.log(chalk.cyan(`[Task: Send ASE] Sending randomized ${amountStr} ASE to ${recipient.substring(0, 15)}...`));

    const balanceWei = await wallet.getBalance();
    if (balanceWei < amountWei) {
        console.log(chalk.yellow(`[Task: Send ASE] Skipped: Insufficient balance (${formatAse(balanceWei)} ASE). Need faucet first.`));
        return { success: false, reason: 'Insufficient balance' };
    }

    try {
        const tx = await wallet.sendTransfer({
            to: recipient,
            amountWei: amountWei
        });

        console.log(chalk.blue(`[Task: Send ASE] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });
        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: Send ASE] Success (${amountStr} ASE) in block #${receipt.blockNumber}!`));
            return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber, amount: amountStr };
        } else {
            console.log(chalk.red(`[FAIL] [Task: Send ASE] Failed: ${receipt.error || 'Execution reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: Send ASE] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
