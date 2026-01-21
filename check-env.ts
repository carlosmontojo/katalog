
import fs from 'fs';
import path from 'path';

try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        const hasDbUrl = envConfig.includes('DATABASE_URL=');
        console.log(`Has DATABASE_URL: ${hasDbUrl}`);
    } else {
        console.log('.env.local not found');
    }
} catch (e) {
    console.error('Error checking .env.local', e);
}
