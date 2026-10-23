import { aseToWei, formatAse } from '@asentum/sdk';
import chalk from 'chalk';
import { getRandomAseAmount } from '../utils/randomizer.js';

// AsePad Core Contract
export const ASEPAD_CONTRACT = 'ase1r57zd8sstugu4km2axf7ar85q0fj793vdlzt6v';

// Active tokens on AsePad bonding curve
export const ACTIVE_ASEPAD_TOKENS = [
    '0xe4c71359a75224de17f911b8e87f87b8e0394d4a', // YUCO
    '0x8695d1fa27b77db29312083d29b9157003700191', // Active Meme
    '0xaa68ea304b9f9c0251e747b50df0a2381fa312c6', // ASEBUCK
    '0x930d7000bcb07b98ccb25445a1ca2673857bbf83'
];

/**
 * Buy tokens on AsePad bonding curve.
 * This directly completes the "Buy or sell a token on AsePad · dapp" quest on airdrop.asentum.com.
 */
export async function executeAsepadBuy(client, wallet, targetToken = null) {
    const tokenHex = targetToken || ACTIVE_ASEPAD_TOKENS[Math.floor(Math.random() * ACTIVE_ASEPAD_TOKENS.length)];
    // Random buy amount strictly < 0.13 ASE (e.g. 0.0035 to 0.0250 ASE)
    const amountAse = getRandomAseAmount(0.0035, 0.025, 4);
    const amountWei = aseToWei(amountAse);
    const balanceWei = await wallet.getBalance();

    console.log(chalk.cyan(`[Task: AsePad] Querying on-chain quote for token (${tokenHex.substring(0, 10)}...)...`));

    if (balanceWei < amountWei) {
        console.log(chalk.yellow(`[Task: AsePad] Skipped: Insufficient balance (${formatAse(balanceWei)} ASE).`));
        return { success: false, reason: 'Insufficient balance' };
    }

    try {
        // 1. Fetch exact quote from AsePad contract
        const quoteRes = await client.viewCall(ASEPAD_CONTRACT, 'quoteBuy', [tokenHex, amountWei.toString()]);
        
        let minTokensOut = '1';
        if (quoteRes.ok && quoteRes.returnValue) {
            const q = JSON.parse(quoteRes.returnValue);
            if (!q.feasible) {
                console.log(chalk.yellow(`[Task: AsePad] Quote not feasible: ${q.reason}`));
                return { success: false, reason: q.reason };
            }
            // 10% slippage tolerance
            minTokensOut = ((BigInt(q.tokensOut) * 90n) / 100n).toString();
        }

        console.log(chalk.cyan(`[Task: AsePad] Buying with randomized ${amountAse} ASE (min tokens: ${minTokensOut.substring(0, 8)}...)...`));

        // 2. Broadcast buy transaction
        const tx = await wallet.sendCall({
            to: ASEPAD_CONTRACT,
            method: 'buy',
            args: [tokenHex, minTokensOut],
            valueWei: amountWei,
            gasLimit: 2000000n
        });

        console.log(chalk.blue(`[Task: AsePad] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: AsePad] SUCCESS! Bought with ${amountAse} ASE in block #${receipt.blockNumber}!`));
            console.log(chalk.green(`  Quest "Buy or sell a token on AsePad" terpenuhi! (Tx: ${tx.hash})`));
            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amountAse,
                token: tokenHex
            };
        } else {
            console.log(chalk.red(`[FAIL] [Task: AsePad] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: AsePad] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
