import chalk from 'chalk';
import crypto from 'crypto';
import { formatAse } from '@asentum/sdk';

// AseCasino Core Contract (ase-casino.fun)
export const ASECASINO_CONTRACT = 'ase123ddfnyp34qn9r8lfwl5lzf0csylyj8lecw40v';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Plays 1 individual round of ASEFlip
 */
async function playSingleFlip(client, wallet, cfg, roundNum, totalRounds) {
    const stakeWei = BigInt(cfg.minStakeWei || '2500000000000000000');
    const stakeAse = formatAse(stakeWei);

    // Check wallet balance
    const balanceWei = await wallet.getBalance();
    if (balanceWei < stakeWei + 20000000000000000n) {
        console.log(chalk.yellow(`[Task: ASEFlip] Putaran ${roundNum}/${totalRounds} dilewati: Saldo kurang (${formatAse(balanceWei)} ASE). Butuh ${stakeAse} ASE.`));
        return { success: false, reason: 'Insufficient balance' };
    }

    const playId = crypto.randomBytes(16).toString('hex');
    const playerSeed = crypto.randomBytes(8).toString('hex');
    const mult = 200n; // 2.00x multiplier
    const edge = BigInt(cfg.edgeBps || '800');
    const winChanceBps = (100n * (10000n - edge)) / mult;

    console.log(chalk.cyan(`[Task: ASEFlip] Memasang Putaran ${roundNum}/${totalRounds} (${stakeAse} ASE @ 2.00x, Peluang: ${(Number(winChanceBps) / 100).toFixed(1)}%)...`));

    // 1. Send playCustom transaction
    const tx = await wallet.sendCall({
        to: ASECASINO_CONTRACT,
        method: 'playCustom',
        args: [playId, playerSeed, mult.toString(), winChanceBps.toString()],
        value: stakeWei,
        gasLimit: 3000000n
    });

    console.log(chalk.blue(`[Task: ASEFlip] Putaran #${roundNum} Broadcasted! Hash: ${tx.hash}`));
    const receipt = await tx.wait({ timeoutMs: 60000 });

    if (!receipt.success) {
        console.log(chalk.red(`[FAIL] [Task: ASEFlip] Putaran #${roundNum} Gagal: ${receipt.error || 'Reverted'}`));
        return { success: false, error: receipt.error };
    }

    console.log(chalk.green(`[OK] [Task: ASEFlip] Putaran #${roundNum} terkonfirmasi di blok #${receipt.blockNumber}!`));
    console.log(chalk.gray(`[Task: ASEFlip] Menunggu ~10 detik (3 blok) untuk auto-settle...`));
    await sleep(10000);

    // 2. Trigger settleAuto to claim win/loss result
    let won = false;
    let payout = '0';
    try {
        const settleTx = await wallet.sendCall({
            to: ASECASINO_CONTRACT,
            method: 'settleAuto',
            args: ['1', playId],
            gasLimit: 2000000n
        });
        const settleReceipt = await settleTx.wait({ timeoutMs: 45000 });
        if (settleReceipt.success) {
            won = !!settleReceipt.returnValue?.won;
            payout = settleReceipt.returnValue?.payoutWei ? formatAse(BigInt(settleReceipt.returnValue.payoutWei)) : '0';
            if (won) {
                console.log(chalk.bold.green(`🎉 [Task: ASEFlip] MENANG! Payout: ${payout} ASE!`));
            } else {
                console.log(chalk.gray(`[Task: ASEFlip] Putaran #${roundNum} Selesai: Belum menang (Roll: ${settleReceipt.returnValue?.roll}).`));
            }
        }
    } catch (settleErr) {
        console.log(chalk.gray(`[Task: ASEFlip] Notifikasi Auto-settle: ${settleErr.message}`));
    }

    return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        playId,
        won,
        payout
    };
}

/**
 * Plays N rounds of ASEFlip on AseCasino (ase-casino.fun)
 * Fulfills Quest: "Play 3 rounds of ASEFlip on AseCasino · dapp (+50 XP)" on airdrop.asentum.com
 */
export async function executeAseFlip(client, wallet, targetRounds = 3) {
    console.log(chalk.cyan(`\n[Task: ASEFlip] Memulai ${targetRounds} putaran ASEFlip on AseCasino (ase-casino.fun)...`));

    try {
        const cfgRes = await client.viewCall(ASECASINO_CONTRACT, 'getCustomConfig', []);
        const cfg = cfgRes.returnValue;

        if (!cfg || !cfg.active) {
            console.log(chalk.yellow(`[Task: ASEFlip] Custom flip sedang tidak aktif di AseCasino.`));
            return { success: false, reason: 'Custom flip not active' };
        }

        let completedRounds = 0;
        const roundResults = [];

        for (let i = 1; i <= targetRounds; i++) {
            const res = await playSingleFlip(client, wallet, cfg, i, targetRounds);
            if (res.success) {
                completedRounds++;
                roundResults.push(res);
            } else if (res.reason === 'Insufficient balance') {
                break;
            }

            if (i < targetRounds) {
                console.log(chalk.gray(`Jeda 4 detik sebelum putaran berikutnya...\n`));
                await sleep(4000);
            }
        }

        if (completedRounds > 0) {
            console.log(chalk.bold.green(`[OK] [Task: ASEFlip] Selesai ${completedRounds}/${targetRounds} putaran ASEFlip!\n`));
            return {
                success: true,
                completedRounds,
                targetRounds,
                rounds: roundResults
            };
        } else {
            return { success: false, reason: 'No rounds completed' };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: ASEFlip] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
