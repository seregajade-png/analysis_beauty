import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const failed = await prisma.callAnalysis.findMany({
  where: { status: 'FAILED' },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { id: true, title: true, errorMessage: true, createdAt: true },
});

for (const r of failed) {
  console.log('---');
  console.log('ID:', r.id);
  console.log('Title:', r.title);
  console.log('Error:', r.errorMessage);
  console.log('Time:', r.createdAt);
}

await prisma.$disconnect();
