import chalk from 'chalk';
import { getRandomSocialMessage, getRandomProfile } from '../utils/randomizer.js';

// Central contracts for social.asentum.com
export const ASOCIAL_POSTS_CONTRACT = 'ase160qf2uyeaw4exdl9krxe5upah535mxksdcvw7p';
export const ASOCIAL_PROFILE_CONTRACT = 'ase1wzpl065lyld6h8kthew7jc3mudgu5wtgfdwawd';

const DEFAULT_AVATARS = [
    "https://res.cloudinary.com/dpap4jgmj/image/upload/v1792736313/asentum-social/avatars/avatar1.png",
    "https://res.cloudinary.com/dpap4jgmj/image/upload/v1792736313/asentum-social/avatars/avatar2.png"
];

/**
 * Fitur 1: Set Profile (Nama, Bio, Avatar) dengan data unik random
 */
export async function executeSetProfile(client, wallet) {
    console.log(chalk.cyan(`[Task: ASocial Profile] Checking on-chain profile...`));

    try {
        const userHex = wallet.addressHex;
        // Check if profile exists
        const hasProf = await client.viewCall(ASOCIAL_PROFILE_CONTRACT, 'hasProfile', [userHex]).catch(() => ({ returnValue: false }));
        
        if (hasProf && hasProf.returnValue === true) {
            console.log(chalk.gray(`[Task: ASocial Profile] Profile already configured for this address.`));
            return { success: true, reason: 'Already set' };
        }

        // Generate unique name & bio
        const { name, bio } = getRandomProfile();
        const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

        console.log(chalk.cyan(`[Task: ASocial Profile] Registering unique profile: "${name}"...`));

        const tx = await wallet.sendCall({
            to: ASOCIAL_PROFILE_CONTRACT,
            method: 'setProfile',
            args: [name, bio, avatar],
            gasLimit: 2000000n
        });

        console.log(chalk.blue(`[Task: ASocial Profile] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: ASocial Profile] Set profile "${name}" in block #${receipt.blockNumber}!`));
            return { success: true, txHash: tx.hash, name, bio };
        } else {
            console.log(chalk.red(`[FAIL] [Task: ASocial Profile] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: ASocial Profile] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}

/**
 * Fitur 2: Submit Post (Text unik acak)
 */
export async function executeSocialPost(client, wallet, customContent = null, imageUrl = '') {
    // Generate unique message
    const content = customContent || getRandomSocialMessage();

    console.log(chalk.cyan(`[Task: ASocial Post] Publishing randomized post...`));

    try {
        const tx = await wallet.sendCall({
            to: ASOCIAL_POSTS_CONTRACT,
            method: 'post',
            args: [content, imageUrl],
            gasLimit: 2000000n
        });

        console.log(chalk.blue(`[Task: ASocial Post] Broadcasted! Hash: ${tx.hash}`));
        const receipt = await tx.wait({ timeoutMs: 60000 });

        if (receipt.success) {
            console.log(chalk.green(`[OK] [Task: ASocial Post] Success in block #${receipt.blockNumber}!`));
            console.log(chalk.gray(`  Message: "${content}"`));
            return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber, content };
        } else {
            console.log(chalk.red(`[FAIL] [Task: ASocial Post] Failed: ${receipt.error || 'Reverted'}`));
            return { success: false, error: receipt.error };
        }
    } catch (err) {
        console.log(chalk.red(`[FAIL] [Task: ASocial Post] Error: ${err.message}`));
        return { success: false, error: err.message };
    }
}

/**
 * Fitur 3: Read Feed & User Stats
 */
export async function getSocialStats(client, wallet) {
    try {
        const userHex = wallet.addressHex;
        const countRes = await client.viewCall(ASOCIAL_POSTS_CONTRACT, 'getUserPostCount', [userHex]);
        const count = countRes.ok ? countRes.returnValue : '0';

        const latestRes = await client.viewCall(ASOCIAL_POSTS_CONTRACT, 'getLatestPostId', []);
        const totalNetworkPosts = latestRes.ok ? latestRes.returnValue : '0';

        return { userPostCount: count, totalNetworkPosts };
    } catch (e) {
        return { error: e.message };
    }
}
