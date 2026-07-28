const { PrismaClient } = require('@prisma/client');
const passwords = ['postgres', 'password', 'root', 'admin', '1234', '123456', 'smartspend_pass', ''];
async function test() {
  for (const p of passwords) {
    const url = 'postgresql://postgres:' + p + '@localhost:5432/postgres?schema=public';
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$connect();
      console.log('Success with postgres:' + p);
      await prisma.$disconnect();
      return;
    } catch (e) {
      console.log('Failed for ' + p);
    }
  }
}
test();
