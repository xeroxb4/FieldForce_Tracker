/**
 * Fix trainer login: password was double-hashed by seed.
 * Run: node fixTrainerPassword.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config();

const USERNAME = 'trainer';
const PLAIN = 'Train@FF2026';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ username: USERNAME });
  if (!user) {
    console.error('User "trainer" not found. Run seedTrainingUser.js first (after fix).');
    process.exit(1);
  }
  // Assign plain text — User pre-save middleware hashes once
  user.password = PLAIN;
  user.isActive = true;
  user.isTraining = true;
  user.role = 'omr';
  await user.save();

  const ok = await user.comparePassword(PLAIN);
  console.log('Password reset for trainer. comparePassword:', ok ? 'OK' : 'FAILED');
  console.log('Login: trainer / Train@FF2026 (role OMR)');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
