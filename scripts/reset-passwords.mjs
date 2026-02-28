import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

const hash = hashPassword('password123');
console.log('New hash:', hash);

const emails = [
  'owner@beauty-school.ru',
  'manager@beauty-school.ru',
  'admin@beauty-school.ru',
];

for (const email of emails) {
  const updated = await prisma.user.update({
    where: { email },
    data: { password: hash },
  });
  console.log(`Updated: ${updated.email} (${updated.role})`);
}

await prisma.$disconnect();
console.log('Done!');
