import { CronJob } from 'cron';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { loadAllWallets } from './wallet.js';
import { claimFaucet } from './tasks/faucet.js';

dotenv.config();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Every 6 hours: 0 */6 * * *
const cronExpression = process.env.FAUCET_CRON_SCHEDULE || '0 0 */6 * * *';

export async function runFaucetForAll() {
    console.log(chalk.bold.cyan('\n========================================================'));
    console.log(chalk.bold.yellow('      AUTO-CLAIM FAUCET (5 TEST ASE) - SEMUA WALLET     '));
    console.log(chalk.bold.cyan('========================================================\n'));

    let client, walletsList;
    try {
        const loaded = await loadAllWallets();
        client = loaded.client;
        walletsList = loaded.walletsList;
    } catch (err) {
        console.log(chalk.red(`[Error] ${err.message}`));
        return;
    }

    for (let i = 0; i < walletsList.length; i++) {
        const item = walletsList[i];
        console.log(chalk.white(`Akun [${i + 1}/${walletsList.length}]: ${chalk.bold.yellow(item.wallet.address)}`));
        await claimFaucet(client, item.wallet.address, 5);

        if (i + 1 < walletsList.length) {
            await sleep(3000);
        }
    }
    console.log(chalk.bold.cyan('\n========================================================\n'));
}

console.log(chalk.bold.cyan('========================================================'));
console.log(chalk.bold.yellow(`FAUCET 6-HOUR SCHEDULER AKTIF`));
console.log(chalk.white(`Jadwal Cron: ${chalk.bold.green(cronExpression)}`));
console.log(chalk.gray('Menjalankan klaim pertama sekarang, lalu berulang setiap 6 jam.'));
console.log(chalk.bold.cyan('========================================================\n'));

// Run immediately on start
runFaucetForAll().then(() => {
    console.log(chalk.gray(`Menunggu putaran klaim faucet berikutnya sesuai jadwal (setiap 6 jam)...\n`));
}).catch(err => {
    console.error(chalk.red(`Error: ${err.message}`));
});

// Setup recurring 6-hour cron job
const job = new CronJob(
    cronExpression,
    async function () {
        console.log(chalk.magenta(`\n[CRON FAUCET] Memulai klaim otomatis 6 jam: ${new Date().toLocaleString()}`));
        try {
            await runFaucetForAll();
        } catch (err) {
            console.error(chalk.red(`Error saat cron faucet: ${err.message}`));
        }
    },
    null,
    true
);
