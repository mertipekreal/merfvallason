import 'dotenv/config';
import { ApifyClient } from 'apify-client';

async function checkApify() {
    const token = process.env.APIFY_API_TOKEN;
    console.log('Token defined in env:', !!token);

    if (!token) {
        console.error('❌ APIFY_API_TOKEN is missing from environment variables.');
        return;
    }

    // Show first/last chars for debug (safe log)
    const masked = token.substring(0, 4) + '...' + token.substring(token.length - 4);
    console.log(`Using token: ${masked}`);

    const client = new ApifyClient({ token });

    try {
        console.log('Attempting to fetch user info...');
        const user = await client.user().get();
        console.log('✅ Connection Successful!');
        console.log(`User ID: ${user?.id}`);
        console.log(`Username: ${user?.username}`);
    } catch (error: any) {
        console.error('❌ Connection Failed:', error.message);
    }
}

checkApify();
