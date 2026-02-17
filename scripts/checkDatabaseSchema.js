/**
 * Check database schema and find the correct table name
 */

const { Client } = require('pg');

const DB_CONNECTION = 'postgresql://postgres:ocSgjcKviXxJJpGlAkSGeGNBMVLKbBBD@maglev.proxy.rlwy.net:18897/railway';

async function checkSchema() {
  const client = new Client({
    connectionString: DB_CONNECTION,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // List all tables
    console.log('📋 Listing all tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📊 Tables found:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Search for user in any table that might have email
    console.log('\n🔍 Searching for user in common tables...');

    const possibleTables = ['User', 'user', 'users', 'Player', 'player', 'Account', 'account'];
    const targetEmail = 'dewayneshields19@gmail.com';

    for (const tableName of possibleTables) {
      try {
        const checkTable = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = '${tableName.toLowerCase()}'
          );
        `);

        if (checkTable.rows[0].exists) {
          console.log(`\n✅ Table "${tableName}" exists, checking for user...`);

          const userQuery = await client.query(`
            SELECT * FROM "${tableName}"
            WHERE email = '${targetEmail}'
            LIMIT 1;
          `);

          if (userQuery.rows.length > 0) {
            console.log(`\n🎉 FOUND USER in table "${tableName}":`);
            console.log(JSON.stringify(userQuery.rows[0], null, 2));
          }
        }
      } catch (error) {
        // Table might not exist or query failed
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkSchema().catch(console.error);
