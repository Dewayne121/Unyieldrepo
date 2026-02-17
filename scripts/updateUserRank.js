/**
 * Update user rank to Champion
 * Sets totalPoints to 5000 for the specified email
 */

const { Client } = require('pg');

const DB_CONNECTION = 'postgresql://postgres:ocSgjcKviXxJJpGlAkSGeGNBMVLKbBBD@maglev.proxy.rlwy.net:18897/railway';
const TARGET_EMAIL = 'dewayneshields19@gmail.com';
const CHAMPION_XP = 50000;

async function updateUserRank() {
  const client = new Client({
    connectionString: DB_CONNECTION,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // First, find the user
    console.log(`\n🔍 Looking for user: ${TARGET_EMAIL}`);
    const userResult = await client.query(
      'SELECT id, email, "totalPoints", username FROM "User" WHERE email = $1',
      [TARGET_EMAIL]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${TARGET_EMAIL}`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`\n👤 Found user:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Current XP: ${user.totalPoints || 0}`);

    // Update to Champion rank
    console.log(`\n⬆️  Updating to CHAMPION rank (${CHAMPION_XP} XP)...`);
    await client.query(
      'UPDATE "User" SET "totalPoints" = $1 WHERE id = $2',
      [CHAMPION_XP, user.id]
    );

    console.log(`✅ User updated successfully!`);
    console.log(`\n🏆 ${user.username || TARGET_EMAIL} is now CHAMPION rank!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

updateUserRank().catch(console.error);
