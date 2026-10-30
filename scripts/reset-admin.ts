import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

import connectDB from '../src/lib/mongodb';
import { User } from '../src/models/User';
import bcrypt from 'bcryptjs';

async function main() {
  await connectDB();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@schemesathi.gov.in').toLowerCase();
  const newPassword = 'admin123';
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const user = await User.findOneAndUpdate(
    { email: adminEmail },
    { $set: { passwordHash, role: 'ADMIN', name: 'SchemeSathi Administrator' } },
    { upsert: true, returnDocument: 'after' }
  );

  console.log(`[Success] Admin credentials updated:`);
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${newPassword}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error updating admin password:', err);
  process.exit(1);
});

