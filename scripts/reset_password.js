const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: 'postgresql://postgres:ocSgjcKviXxJJpGlAkSGeGNBMVLKbBBD@maglev.proxy.rlwy.net:18897/railway'
});

async function resetPassword() {
  try {
    await client.connect();

    // Find the user
    const userResult = await client.query(`
      SELECT id, email, username FROM "User" WHERE email = $1
    `, ['dewayneshields19@gmail.com']);

    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('Found user:', user);

    // Hash the new password
    const newPassword = 'uxbridge';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('New password hash:', hashedPassword);

    // Update the password
    const updateResult = await client.query(`
      UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE email = $2
    `, [hashedPassword, 'dewayneshields19@gmail.com']);

    console.log('Password updated successfully!');
    console.log('Rows affected:', updateResult.rowCount);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

resetPassword();
