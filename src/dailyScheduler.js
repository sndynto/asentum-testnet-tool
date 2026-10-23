import { CronJob } from 'cron';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { runBot } from './bot.js';

dotenv.config();

const cronExpression = process.env.CRON_SCHEDULE || '0 0 1 * * *';

console.log(chalk.bold.cyan('========================================================'));
console.log(chalk.bold.yellow(`ASENTUM DAILY SCHEDULER AKTIF`));
console.log(chalk.white(`Jadwal Cron: ${chalk.bold.green(cronExpression)}`));
console.log(chalk.gray('Menjalankan putaran pertama sekarang, lalu berulang setiap hari.'));
console.log(chalk.bold.cyan('========================================================\n'));

// Run immediately on start
runBot().then(() => {
    console.log(chalk.gray(`\nMenunggu jadwal berikutnya sesuai pola: ${cronExpression} ...\n`));
}).catch(err => {
    console.error(chalk.red(`Error pada eksekusi awal: ${err.message}`));
});

// Setup recurring cron job
const job = new CronJob(
    cronExpression,
    async function () {
        console.log(chalk.magenta(`\n[CRON TRIGGER] Memulai eksekusi harian: ${new Date().toLocaleString()}`));
        try {
            await runBot();
        } catch (err) {
            console.error(chalk.red(`Error saat menjalankan cron job: ${err.message}`));
        }
    },
    null,
    true
);
