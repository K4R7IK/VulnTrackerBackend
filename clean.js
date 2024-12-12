import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAll() {
  try {
    // Delete records from Asset model
    await prisma.vulnerability.deleteMany({});
    console.log('All assets deleted.');

    // Delete records from Company model
    await prisma.company.deleteMany({});
    console.log('All companies deleted.');
    
    // Add more models here as needed
  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAll();
