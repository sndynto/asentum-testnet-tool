import { aseToWei, formatAse, toHexAddress, toAse1 } from '@asentum/sdk';
import chalk from 'chalk';
import { ASEDEX_CONTRACT } from './asedexSwap.js';
import { getRandomAseAmount } from '../utils/randomizer.js';

export const ASEDEX_POOL_1_TOKEN1 = '0xd580adfb35a68844903493f0dfa38549a1c74055';

/**
 * Adds liquidity to AseDex AMM (Pool 1: Native ASE <-> ARC20 Token).
 * Fulfills liquidity provision on AseDex.
 */
export async function executeAseDexLiquidity(client, wallet) {
    console.log(chalk.cyan(`[Task: AseDex Liquidity] Checking Pool 1 and token balances...`));

    try {
        const asedexHex = toHexAddress(ASEDEX_CONTRACT);
        const token1Ase1 = toAse1(ASEDEX_POOL_1_TOKEN1);
        const userHex = wallet.addressHex;

        // 1. Fetch Pool 1 status
        const poolRes = await client.viewCall(ASEDEX_CONTRACT, 'getPool', ['1']);
        if (!poolRes.ok || !poolRes.returnValue) {
            console.log(chalk.yellow(`[Task: AseDex Liquidity] Failed to load Pool 1. Skipping.`));
            return { success: false, reason: 'Failed to load Pool 1' };
        }

        const pool = typeof poolRes.returnValue === 'string' ? JSON.parse(poolRes.returnValue) : poolRes.returnValue;
        const r0 = BigInt(pool.reserve0);
        const r1 = BigInt(pool.reserve1);

        if (r0 <= 0n || r1 <= 0n) {
            console.log(chalk.yellow(`[Task: AseDex Liquidity] Pool 1 has zero reserves. Skipping.`));
            return { success: false, reason: 'Zero reserves' };
        }

        // 2. Check token1 balance
        let token1Bal = 0n;
        try {
            const balRes = await client.viewCall(token1Ase1, 'balanceOf', [userHex]);
            if (balRes.ok && balRes.returnValue) {
                token1Bal = BigInt(balRes.returnValue.toString());
            }
        } catch (e) {
            // ignore
        }

        if (token1Bal <= 0n) {
            console.log(chalk.yellow(`[Task: AseDex Liquidity] No token1 balance yet. (AseDex Swap in previous step will supply tokens).`));
            return { success: false, reason: 'No token1 balance' };
        }

        // 3. Random ASE amount strictly < 0.13 ASE (e.g. 0.0020 to 0.0080 ASE)
        const aseToAddStr = getRandomAseAmount(0.002, 0.008, 4);
        const a0 = aseToWei(aseToAddStr);

        // Calculate optimal token1 required
        const a1Optimal = (a0 * r1) / r0 + 1000n;

        if (token1Bal < a1Optimal) {
            console.log(chalk.yellow(`[Task: AseDex Liquidity] Token1 balance too low for pairing with ${aseToAddStr} ASE.`));
            return { success: false, reason: 'Token1 balance too low' };
        }

        const myAseBal = await wallet.getBalance();
        if (myAseBal < a0 + 10000000000000000n) {
            console.log(chalk.yellow(`[Task: AseDex Liquidity] Insufficient ASE balance (${formatAse(myAseBal)} ASE).`));
            return { success: false, reason: 'Insufficient ASE' };
        }

        // 4. Approve AseDex router for token1
        console.log(chalk.cyan(`[Task: AseDex Liquidity] Approving AseDex for paired tokens...`));
        const appTx = await wallet.sendCall({
            to: token1Ase1,
            method: 'approve',
            args: [asedexHex, (a1Optimal * 2n).toString()],
            gasLimit: 1000000n
        });
        await appTx.wait({ timeoutMs: 45000 });

        // 5. Add liquidity
        console.log(chalk.cyan(`[Task: AseDex Liquidity] Depositing ${aseToAddStr} ASE + tokens to Pool 1...`));
        const tx = await wallet.sendCall({
            to: ASEDEX_CONTRACT,
            method: 'addLiquidity',
            args: ['1', a0.toString(), (a1Optimal * 2n).toString(), '1'],
            valueWei: a0,
            gasLimit: 3000000n
        });

        console.log(chalk.blue(`[Task: AseDex Liquidity] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: AseDex Liquidity] Added liquidity successfully in block #${receipt.blockNumber}!`));
            console.log(chalk.gray(`  Pool 1 | Deposited: ${aseToAddStr} ASE | Tx: ${tx.hash}`));
            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amountAse: aseToAddStr
            };
        } else {
            console.log(chalk.red(`[FAIL] [Task: AseDex Liquidity] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }

    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: AseDex Liquidity] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
