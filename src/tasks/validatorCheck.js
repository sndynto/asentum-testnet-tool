import { formatAse } from '@asentum/sdk';
import chalk from 'chalk';

/**
 * Check if the wallet is an active validator and whether it has signed blocks.
 * Fulfills / monitors the "Sign a block as a validator · validator" quest on airdrop.asentum.com.
 */
export async function checkValidatorStatus(client, wallet) {
    console.log(chalk.cyan(`[Task: Validator Check] Inspecting validator set & signed blocks...`));

    try {
        const balanceWei = await wallet.getBalance();
        const balanceAse = parseFloat(formatAse(balanceWei));

        // 1. Check participation tracker (who signed recent blocks)
        let hasSignedBlock = false;
        let signedBlocksCount = 0;
        try {
            const part = await client.getParticipation({ lookback: 1000 });
            const pEntry = part.validators?.find(v => v.address.toLowerCase() === wallet.address.toLowerCase());
            if (pEntry && pEntry.signedBlocks > 0) {
                hasSignedBlock = true;
                signedBlocksCount = pEntry.signedBlocks;
            }
        } catch (e) {
            // ignore
        }

        if (hasSignedBlock) {
            console.log(chalk.green(`[OK] [Validator] Quest "Sign a block as a validator" TERPENUHI!`));
            console.log(chalk.green(`  Total blok yang ditandatangani: ${signedBlocksCount} blok.`));
            return { success: true, isValidator: true, signedBlocks: signedBlocksCount };
        }

        // 2. Check active validator registry
        const valResponse = await client.getValidators();
        const myValidator = valResponse.validators?.find(v => v.address.toLowerCase() === wallet.address.toLowerCase());

        if (myValidator) {
            console.log(chalk.green(`[OK] [Validator] Node TERDAFTAR di validator set!`));
            console.log(chalk.gray(`  Status: ${myValidator.status || 'Active'}, Stake: ${myValidator.stake} wei, Committee: ${myValidator.committeeState || 'signing'}`));
            console.log(chalk.yellow(`  Menunggu rotasi komite untuk menandatangani blok di epoch berikutnya.`));
            return { success: true, isValidator: true, details: myValidator, signedBlocks: 0 };
        } else {
            console.log(chalk.yellow(`ℹ [Validator] Akun ini belum aktif sebagai node validator.`));
            console.log(chalk.gray(`  Saldo Saat Ini: ${balanceAse.toFixed(4)} ASE (Syarat bond minimal: 500 ASE)`));
            
            if (balanceAse >= 500) {
                console.log(chalk.bold.magenta(`  [*] Saldo mencukupi (>= 500 ASE)! Jalankan node di VPS:`));
                console.log(chalk.magenta(`     curl -fsSL explorer.asentum.com/install/validator | bash`));
            } else {
                console.log(chalk.gray(`  Dibutuhkan 500 ASE untuk menjalankan validator dan menandatangani blok.`));
            }
            return { success: false, reason: 'Belum running node (perlu 500 ASE)' };
        }
    } catch (err) {
        console.log(chalk.yellow(`ℹ [Validator Check] Notice: ${err.message}`));
        return { error: err.message };
    }
}
