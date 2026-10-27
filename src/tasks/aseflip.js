import chalk from 'chalk';
import crypto from 'crypto';
import { formatAse } from '@asentum/sdk';

// AseCasino Core Contract (ase-casino.fun)
export const ASECASINO_CONTRACT = 'ase123ddfnyp34qn9r8lfwl5lzf0csylyj8lecw40v';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Plays a round of ASEFlip on AseCasino (ase-casino.fun)
 * Fulfills Quest: "Play a round of ASEFlip on AseCasino · dapp (+30 XP)" on airdrop.asentum.com
 */
export async function executeAseFlip(client, wallet) {
    console.log(chalk.cyan(`[Task: ASEFlip] Checking AseCasino config and conditions...`));

    try {
        const cfgRes = await client.viewCall(ASECASINO_CONTRACT, 'getCustomConfig', []);
        const cfg = cfgRes.returnValue;

        if (!cfg || !cfg.active) {
            console.log(chalk.yellow(`[Task: ASEFlip] Custom flip is currently not active on AseCasino.`));
            return { success: false, reason: 'Custom flip not active' };
        }

        const stakeWei = BigInt(cfg.minStakeWei || '2500000000000000000');
        const stakeAse = formatAse(stakeWei);

        // Check wallet balance
        const balanceWei = await wallet.getBalance();
        if (balanceWei < stakeWei + 20000000000000000n) {
            console.log(chalk.yellow(`[Task: ASEFlip] Skipped: Insufficient balance (${formatAse(balanceWei)} ASE). Need at least ${stakeAse} ASE.`));
            return { success: false, reason: 'Insufficient balance' };
        }

        // Generate play parameters
        const playId = crypto.randomBytes(16).toString('hex');
        const playerSeed = crypto.randomBytes(8).toString('hex');
        const mult = 200n; // 2.00x multiplier
        const edge = BigInt(cfg.edgeBps || '800');
        const winChanceBps = (100n * (10000n - edge)) / mult;

        console.log(chalk.cyan(`[Task: ASEFlip] Placing ASEFlip round (${stakeAse} ASE at 2.00x, Win Chance: ${(Number(winChanceBps) / 100).toFixed(1)}%)...`));

        // 1. Send playCustom transaction
        const tx = await wallet.sendCall({
            to: ASECASINO_CONTRACT,
            method: 'playCustom',
            args: [playId, playerSeed, mult.toString(), winChanceBps.toString()],
            value: stakeWei,
            gasLimit: 3000000n
        });

        console.log(chalk.blue(`[Task: ASEFlip] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (!receipt.success) {
            console.log(chalk.red(`[FAIL] [Task: ASEFlip] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }

        console.log(chalk.green(`[OK] [Task: ASEFlip] Play confirmed in block #${receipt.blockNumber}!`));
        console.log(chalk.gray(`[Task: ASEFlip] Waiting ~10s (3 blocks) for auto-settlement...`));
        await sleep(10000);

        // 2. Trigger settleAuto to claim win/loss result
        try {
            const settleTx = await wallet.sendCall({
                to: ASECASINO_CONTRACT,
                method: 'settleAuto',
                args: ['1', playId],
                gasLimit: 2000000n
            });
            const settleReceipt = await settleTx.wait({ timeoutMs: 45000 });
            if (settleReceipt.success) {
                const won = settleReceipt.returnValue?.won;
                const payout = settleReceipt.returnValue?.payoutWei ? formatAse(BigInt(settleReceipt.returnValue.payoutWei)) : '0';
                if (won) {
                    console.log(chalk.bold.green(`🎉 [Task: ASEFlip] WON! Payout: ${payout} ASE!`));
                } else {
                    console.log(chalk.gray(`[Task: ASEFlip] Round settled: Not won this time (Roll: ${settleReceipt.returnValue?.roll}).`));
                }
            }
        } catch (settleErr) {
            console.log(chalk.gray(`[Task: ASEFlip] Auto-settle notification: ${settleErr.message}`));
        }

        return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            playId,
            stakeAse
        };
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: ASEFlip] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
