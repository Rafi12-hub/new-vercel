const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const credentialsPath = 'C:\\Users\\windows\\Downloads\\rgmcse-compiler-firebase-adminsdk-fbsvc-ccedd29aa2.json';

function run() {
    let rawContent = fs.readFileSync(credentialsPath, 'utf8').trim();
    // Fix the minor typo in the file if it starts with 'nw{'
    if (rawContent.startsWith('nw{')) {
        rawContent = rawContent.slice(2);
    }

    const creds = JSON.parse(rawContent);

    const envs = {
        NODE_ENV: 'production',
        JWT_SECRET: 'supersecretkey_rgm_compiler_change_in_prod',
        FIREBASE_PROJECT_ID: creds.project_id,
        FIREBASE_CLIENT_EMAIL: creds.client_email,
        FIREBASE_PRIVATE_KEY: creds.private_key,
        FIREBASE_API_KEY: 'AIzaSyANaYM4a-bk4jS6kPegLlAjTU_ZgkjorB0',
        FIREBASE_STORAGE_BUCKET: 'rgmcse-compiler.appspot.com'
    };

    for (const [key, value] of Object.entries(envs)) {
        console.log(`Setting Vercel Environment Variable: ${key}...`);
        const result = spawnSync('npx', ['vercel', 'env', 'add', key, 'production'], {
            input: value,
            encoding: 'utf-8',
            shell: true,
            cwd: path.join(__dirname, '..')
        });

        if (result.status === 0) {
            console.log(`✅ Successfully added ${key}`);
        } else {
            console.error(`❌ Failed to add ${key}:`, result.stderr || result.stdout);
        }
    }
}

try {
    run();
} catch (e) {
    console.error('Error running setup script:', e);
}
