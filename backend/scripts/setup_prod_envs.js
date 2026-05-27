const { spawnSync } = require('child_process');
const path = require('path');

const backendPath = 'C:\\Users\\windows\\OneDrive\\Desktop\\personal mine\\vvit\\csecompiler-\\backend';
const frontendPath = 'C:\\Users\\windows\\OneDrive\\Desktop\\personal mine\\vvit\\csecompiler-\\frontend';

const backendEnvs = {
    FRONTEND_URL: 'https://frontend-theta-kohl-41.vercel.app',
    BACKEND_URL: 'https://backend-self-iota-65.vercel.app'
};

const frontendEnvs = {
    VITE_FIREBASE_API_KEY: 'AIzaSyANaYM4a-bk4jS6kPegLlAjTU_ZgkjorB0',
    VITE_FIREBASE_AUTH_DOMAIN: 'rgmcse-compiler.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'rgmcse-compiler',
    VITE_FIREBASE_STORAGE_BUCKET: 'rgmcse-compiler.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '524007067895',
    VITE_FIREBASE_APP_ID: '1:524007067895:web:3505d8be31de81921c03f2',
    VITE_BACKEND_URL: 'https://backend-self-iota-65.vercel.app',
    VITE_SOCKET_URL: 'https://backend-self-iota-65.vercel.app'
};

function addEnvs(envs, cwd) {
    for (const [key, value] of Object.entries(envs)) {
        console.log(`Setting Vercel Environment Variable: ${key} in ${cwd}...`);
        
        // Remove existing key if it exists to avoid conflicts
        spawnSync('npx', ['vercel', 'env', 'rm', key, 'production', '-y'], {
            shell: true,
            cwd: cwd
        });

        const result = spawnSync('npx', ['vercel', 'env', 'add', key, 'production'], {
            input: value,
            encoding: 'utf-8',
            shell: true,
            cwd: cwd
        });

        if (result.status === 0) {
            console.log(`✅ Successfully added ${key}`);
        } else {
            console.error(`❌ Failed to add ${key}:`, result.stderr || result.stdout);
        }
    }
}

console.log('--- Configuring Backend Env Envs ---');
addEnvs(backendEnvs, backendPath);

console.log('--- Configuring Frontend Env Envs ---');
addEnvs(frontendEnvs, frontendPath);
