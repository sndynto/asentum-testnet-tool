import chalk from 'chalk';
import { formatAse } from '@asentum/sdk';

// ASE Vegas Treasure Hunt Core Contract
export const TREASURE_CONTRACT = 'ase1znfss8jyag09x9c570cjn5cyxk3v6zta3z27lr';

/**
 * Executes a single cell dig in the ASE Vegas Treasure Hunt
 * Fulfills Quest: "Dig a cell in the ASE Vegas Treasure hunt"
 */
export async function executeTreasureDig(client, wallet, targetCell = null) {
    console.log(chalk.cyan(`[Task: Treasure Hunt] Inspecting ASE Vegas Treasure map...`));

    try {
        // 1. Get current game state and grid
        const infoRes = await client.viewCall(TREASURE_CONTRACT, 'info', []);
        const info = infoRes.returnValue;

        if (!info || info.status !== 'open' || info.paused) {
            console.log(chalk.yellow(`[Task: Treasure Hunt] Map not open (Status: ${info?.status || 'unknown'}, Paused: ${info?.paused}). Skipping.`));
            return { success: false, reason: 'Map not open' };
        }

        const gridId = info.grid;
        const digPriceWei = BigInt(info.price);
        const digPriceAse = formatAse(digPriceWei);

        const maxAllowed = parseFloat(process.env.MAX_ALLOWED_TX_ASE || '999');
        if (process.env.ENABLE_TREASURE_HUNT !== 'true' && parseFloat(digPriceAse) > maxAllowed) {
            console.log(chalk.yellow(`[Task: Treasure Hunt] Dilewati: Biaya petak kontrak (${digPriceAse} ASE) melampaui batas MAX_ALLOWED_TX_ASE = ${maxAllowed} ASE.`));
            return { success: true, skipped: true, reason: `Exceeds MAX_ALLOWED_TX_ASE (Dig price is ${digPriceAse} ASE)` };
        }

        // 2. Check wallet balance
        const balanceWei = await wallet.getBalance();
        if (balanceWei < digPriceWei + 10000000000000000n) {
            console.log(chalk.yellow(`[Task: Treasure Hunt] Insufficient balance (${formatAse(balanceWei)} ASE). Need ${digPriceAse} ASE.`));
            return { success: false, reason: 'Insufficient balance' };
        }

        // 3. Check wallet dig count on this grid
        const userHex = wallet.addressHex;
        const digsCountRes = await client.viewCall(TREASURE_CONTRACT, 'digsOf', [gridId, userHex]).catch(() => ({ returnValue: 0 }));
        const currentDigs = Number(digsCountRes.returnValue || 0);

        if (currentDigs >= (info.maxPerWallet || 5)) {
            console.log(chalk.gray(`[Task: Treasure Hunt] Max digs reached on Map #${gridId} (${currentDigs}/${info.maxPerWallet}).`));
            return { success: true, reason: 'Already reached max digs for this map' };
        }

        // 4. Query already dug cells on this map to pick an undug cell
        const digsRes = await client.viewCall(TREASURE_CONTRACT, 'getDigs', [gridId, 0, 400]);
        const dugCells = new Set((digsRes.returnValue || []).map(d => d.c));

        let cellToDig = targetCell;
        if (cellToDig === null || dugCells.has(cellToDig)) {
            const undug = [];
            for (let i = 0; i < 400; i++) {
                if (!dugCells.has(i)) undug.push(i);
            }
            if (undug.length === 0) {
                console.log(chalk.yellow(`[Task: Treasure Hunt] All cells on Map #${gridId} have been dug.`));
                return { success: false, reason: 'Map full' };
            }
            cellToDig = undug[Math.floor(Math.random() * undug.length)];
        }

        console.log(chalk.cyan(`[Task: Treasure Hunt] Digging cell #${cellToDig} on Map #${gridId} for ${digPriceAse} ASE...`));

        // 5. Broadcast transaction
        const tx = await wallet.sendCall({
            to: TREASURE_CONTRACT,
            method: 'dig',
            args: [gridId, cellToDig],
            value: digPriceWei,
            gasLimit: 2000000n
        });

        console.log(chalk.blue(`[Task: Treasure Hunt] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: Treasure Hunt] Cell #${cellToDig} dug successfully in block #${receipt.blockNumber}!`));
            console.log(chalk.gray(`  Map #${gridId} | Cell #${cellToDig} | Cost: ${digPriceAse} ASE`));
            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gridId,
                cell: cellToDig,
                costAse: digPriceAse
            };
        } else {
            console.log(chalk.red(`[FAIL] [Task: Treasure Hunt] Reverted: ${receipt.error || 'Failed'}`));
            return { success: false, error: receipt.error };
        }

    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: Treasure Hunt] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
