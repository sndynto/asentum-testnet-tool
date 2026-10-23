import { aseToWei, formatAse, toHexAddress, toAse1 } from '@asentum/sdk';
import chalk from 'chalk';
import { AURAS_ROUTER_ADDRESS } from './aurasSwap.js';
import { getRandomAseAmount } from '../utils/randomizer.js';

const TOKEN0_ADDRESS = '0xc24044dccea3ba8b362e1c85fa16ddc658022269';

export async function executeAurasLiquidity(client, wallet) {
    console.log(chalk.cyan(`[Task: Auras Liquidity] Checking token balances for Pool 1...`));

    try {
        const routerHex = wallet.addressHex ? toHexAddress(AURAS_ROUTER_ADDRESS) : '0x63f640a9b98b6f28e06cb5cc0fce5d72b6c0eabd';
        const userHex = wallet.addressHex;

        // Query token0 balance
        let token0Bal = 0n;
        try {
            const token0Ase1 = toAse1(TOKEN0_ADDRESS);
            const balRes = await client.viewCall(token0Ase1, 'balanceOf', [userHex]);
            if (balRes.ok && balRes.returnValue) {
                token0Bal = BigInt(balRes.returnValue.toString());
            }
        } catch (e) {
            // fallback
        }

        if (token0Bal <= 0n) {
            console.log(chalk.yellow(`[Task: Auras Liquidity] No secondary token balance yet. (Auras Swap in previous step will supply tokens).`));
            return { success: false, reason: 'No token0 balance yet' };
        }

        // Random fraction of holding (between 15% and 35%)
        const fraction = BigInt(Math.floor(Math.random() * 20 + 15));
        const token0ToAdd = (token0Bal * fraction) / 100n > 0n ? (token0Bal * fraction) / 100n : token0Bal;

        // Random ASE amount strictly < 0.13 ASE
        const aseToAddStr = getRandomAseAmount(0.002, 0.02, 4);
        const aseToAddWei = aseToWei(aseToAddStr);

        const myAseBal = await wallet.getBalance();
        if (myAseBal < aseToAddWei) {
            console.log(chalk.yellow(`[Task: Auras Liquidity] Insufficient ASE for LP pairing (${formatAse(myAseBal)} ASE).`));
            return { success: false, reason: 'Insufficient ASE' };
        }

        console.log(chalk.cyan(`[Task: Auras Liquidity] Approving Auras Router for ${token0ToAdd.toString()} tokens...`));
        const token0Ase1 = toAse1(TOKEN0_ADDRESS);

        const approveTx = await wallet.sendCall({
            to: token0Ase1,
            method: 'approve',
            args: [routerHex, token0ToAdd.toString()],
            gasLimit: 1000000n
        });
        await approveTx.wait({ timeoutMs: 45000 });

        console.log(chalk.cyan(`[Task: Auras Liquidity] Adding liquidity: ${token0ToAdd.toString()} token0 + randomized ${aseToAddStr} ASE...`));
        const addLpTx = await wallet.sendCall({
            to: AURAS_ROUTER_ADDRESS,
            method: 'addLiquidity',
            args: ['1', token0ToAdd.toString(), aseToAddWei.toString()],
            valueWei: aseToAddWei,
            gasLimit: 3000000n
        });

        const receipt = await addLpTx.wait({ timeoutMs: 60000 });
        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: Auras Liquidity] Success in block #${receipt.blockNumber}! (Paired ${aseToAddStr} ASE)`));
            return { success: true, txHash: addLpTx.hash, aseAmount: aseToAddStr };
        } else {
            console.log(chalk.red(`[FAIL] [Task: Auras Liquidity] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: Auras Liquidity] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
