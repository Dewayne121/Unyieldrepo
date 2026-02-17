const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'start',
  'server',
  'AsyncNgrok.js'
);

const oldValue = 'const TUNNEL_TIMEOUT = 10 * 1000;';
const newValue = 'const TUNNEL_TIMEOUT = 120 * 1000;';

try {
  if (!fs.existsSync(target)) {
    console.log('[patch-expo-ngrok-timeout] target file not found, skipping.');
    process.exit(0);
  }

  const source = fs.readFileSync(target, 'utf8');
  if (source.includes(newValue)) {
    console.log('[patch-expo-ngrok-timeout] already patched.');
    process.exit(0);
  }

  if (!source.includes(oldValue)) {
    console.log('[patch-expo-ngrok-timeout] expected pattern not found, skipping.');
    process.exit(0);
  }

  const patched = source.replace(oldValue, newValue);
  fs.writeFileSync(target, patched, 'utf8');
  console.log('[patch-expo-ngrok-timeout] patched to 120s.');
} catch (error) {
  console.error('[patch-expo-ngrok-timeout] failed:', error.message);
  process.exit(1);
}
