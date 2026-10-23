import chalk from 'chalk';
import { getRandomMemeToken, generateUniqueSmartContract } from '../utils/randomizer.js';

export async function executeDeployContract(client, wallet) {
    // Generate unique random meme token ticker and source code
    const tokenInfo = getRandomMemeToken();
    const sourceCode = generateUniqueSmartContract(tokenInfo);

    console.log(chalk.cyan(`[Task: Contract Deploy] Deploying unique Meme Token: ${chalk.bold.yellow(tokenInfo.name)} (${chalk.bold.green(tokenInfo.symbol)})...`));

    try {
        const contract = await wallet.deploy({
            source: sourceCode,
            gasLimit: 3000000n
        });

        console.log(chalk.blue(`[Task: Contract Deploy] Broadcasted! Contract Address: ${contract.address}`));
        console.log(chalk.gray(`[Task: Contract Deploy] Waiting for confirmation receipt...`));

        const receipt = await contract.waitForDeploy({ timeoutMs: 60000 });
        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: Contract Deploy] Success in block #${receipt.blockNumber}!`));
            console.log(chalk.green(`  Token: ${tokenInfo.name} | Ticker: ${tokenInfo.symbol} | Address: ${contract.address}`));
            return {
                success: true,
                contractAddress: contract.address,
                tokenName: tokenInfo.name,
                symbol: tokenInfo.symbol,
                txHash: contract.deployTx?.hash,
                blockNumber: receipt.blockNumber
            };
        } else {
            console.log(chalk.red(`[FAIL] [Task: Contract Deploy] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: Contract Deploy] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}
