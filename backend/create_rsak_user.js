// Run this script with: pnpm exec node create_rsak_user.js
import bcrypt from 'bcryptjs';

const username = 'rsak';
const password = 'rsak';

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log('\n--- SQL to insert user ---');
  console.log(`INSERT INTO users (username, password) VALUES ('${username}', '${hash}');`);
})();
