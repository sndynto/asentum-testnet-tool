import chalk from 'chalk';
import { formatAse } from '@asentum/sdk';

// AnotherShooter Core Game Contract (anothershooter.lol)
export const SHOOTER_CONTRACT = 'ase1t36ecyghp0mlk0w5pwzvffxl4q224akl7hprh4';
const SHOOTER_MODES = ['1v1', '5v5', 'rockets'];

/**
 * Enters and plays a game on AnotherShooter (anothershooter.lol)
 * Fulfills Quest: "Play a game of AnotherShooter · dapp" on airdrop.asentum.com
 */
export async function executeAnotherShooter(client, wallet, preferredMode = null) {
    const mode = preferredMode || SHOOTER_MODES[Math.floor(Math.random() * SHOOTER_MODES.length)];
    console.log(chalk.cyan(`[Task: AnotherShooter] Checking game ticket fee on-chain...`));

    try {
        const feeStr = await client.getStorageAt(SHOOTER_CONTRACT, 'entryFee').catch(() => '1000000000000000000');
        const entryFeeWei = BigInt(feeStr || '1000000000000000000');
        const entryFeeAse = formatAse(entryFeeWei);

        // Check wallet balance
        const balanceWei = await wallet.getBalance();
        if (balanceWei < entryFeeWei + 20000000000000000n) {
            console.log(chalk.yellow(`[Task: AnotherShooter] Skipped: Insufficient balance (${formatAse(balanceWei)} ASE). Need at least ${entryFeeAse} ASE.`));
            return { success: false, reason: 'Insufficient balance' };
        }

        console.log(chalk.cyan(`[Task: AnotherShooter] Entering game (Mode: ${mode}) for ${entryFeeAse} ASE ticket...`));

        // 1. Send enter transaction on blockchain
        const tx = await wallet.sendCall({
            to: SHOOTER_CONTRACT,
            method: 'enter',
            args: [mode],
            value: entryFeeWei,
            gasLimit: 2000000n
        });

        console.log(chalk.blue(`[Task: AnotherShooter] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (!receipt.success) {
            console.log(chalk.red(`[FAIL] [Task: AnotherShooter] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }

        console.log(chalk.green(`[OK] [Task: AnotherShooter] Ticket confirmed on-chain in block #${receipt.blockNumber}!`));

        // 2. Register ticket with AnotherShooter backend API
        let apiRegistered = false;
        try {
            const apiRes = await fetch('https://play.anothershooter.lol/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: wallet.address,
                    txHash: tx.hash
                })
            });
            if (apiRes.ok) {
                const apiData = await apiRes.json().catch(() => ({}));
                apiRegistered = true;
                console.log(chalk.green(`[OK] [Task: AnotherShooter] Ticket registered with game server! (Match ready: ${apiData.ready || 1})`));
            }
        } catch (apiErr) {
            console.log(chalk.gray(`[Task: AnotherShooter] API register notice: ${apiErr.message}`));
        }

        return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            mode,
            entryFeeAse,
            apiRegistered
        };
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: AnotherShooter] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
