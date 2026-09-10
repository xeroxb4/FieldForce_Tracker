/**
 * Assign OMR distributors from confirmed list + create any missing OMRs.
 * Run: node assignDistributors.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

/**
 * Confirmed mapping from admin:
 * Rep → Distributor
 */
const ROSTER = [
  { fullName: 'Basmah Ali', username: 'basmah', distributor: 'Amata', territory: 'Okaishie' },
  { fullName: 'Marilyn Etornam Amekudzi', username: 'marilyn', distributor: 'Amata', territory: 'Makola' },
  { fullName: 'Richard Korli', username: 'richard', distributor: 'Amata', territory: 'Koforidua' },
  { fullName: 'Samuel Aryeetey', username: 'samuel', distributor: 'Amata', territory: 'Accra' },
  { fullName: 'Evelyn Okyere', username: 'evelyn', distributor: 'Amata', territory: 'Madina' },
  { fullName: 'Sandra Owusu', username: 'sandramo', distributor: 'Amata', territory: 'Accra' },
  { fullName: 'Christina Sefah', username: 'christina', distributor: 'Daddy Ash', territory: 'Tarkwa' },
  { fullName: 'Doris Asamoah', username: 'doris', distributor: 'Ernievero', territory: 'Kumasi' },
  { fullName: 'Samira Nasara', username: 'samiran', distributor: 'Ernievero', territory: 'Kumasi' },
  { fullName: 'Raphael Ahiable', username: 'rafael', distributor: 'Daniel Adjei', territory: 'Kumasi' },
  { fullName: 'Reuben Kyei', username: 'reuben', distributor: 'Daniel Adjei', territory: 'Kumasi' },
  { fullName: 'Mary Owusu', username: 'mary', distributor: 'Daniel Adjei', territory: 'Kumasi' },
];

/** Strong default passwords for any newly created accounts */
const NEW_PASSWORDS = {
  basmah: 'B@sm4h#R7',
  marilyn: 'M@rilyn#9',
  richard: 'R1ch#J2v9',
  samuel: 'S@mu3l#T7',
  evelyn: 'Ev3lyn$P2',
  sandramo: 'S@ndra#M3',
  christina: 'Chr1st#N5',
  doris: 'D0ris#M8k',
  samiran: 'S@mirN#5x',
  rafael: 'R@fa3l$K6',
  reuben: 'R3uben#H8',
  mary: 'M@ry0w#Q4',
};

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  const created = [];
  const updated = [];

  for (const row of ROSTER) {
    let user = await User.findOne({ username: row.username });
    if (!user) {
      const plain = NEW_PASSWORDS[row.username] || `Ff#${row.username}9x`;
      const hash = await bcrypt.hash(plain, 10);
      user = await User.create({
        username: row.username,
        password: hash,
        fullName: row.fullName,
        role: 'omr',
        distributor: row.distributor,
        territory: row.territory || '',
        isActive: true,
      });
      created.push({ ...row, password: plain });
      console.log(`CREATED  ${row.fullName}  @${row.username}  → ${row.distributor}  pass: ${plain}`);
    } else {
      const before = user.distributor || '';
      user.distributor = row.distributor;
      if (row.territory && !user.territory) user.territory = row.territory;
      user.fullName = row.fullName;
      user.isActive = true;
      await user.save();
      updated.push({ fullName: row.fullName, username: row.username, distributor: row.distributor, before });
      console.log(`UPDATED  ${row.fullName}  @${row.username}  "${before}" → "${row.distributor}"`);
    }
  }

  console.log('\n========== OMR LOGINS (share with team) ==========');
  console.log('Name                          Username      Password         Distributor');
  console.log('----------------------------------------------------------------');
  for (const row of ROSTER) {
    const pass = NEW_PASSWORDS[row.username] || '(existing — reset in admin if needed)';
    console.log(
      `${row.fullName.padEnd(30)} ${row.username.padEnd(12)} ${String(pass).padEnd(16)} ${row.distributor}`
    );
  }
  console.log('==================================================');
  console.log(`Created: ${created.length}  Updated: ${updated.length}`);
  console.log('Refresh Admin → Distributors');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
