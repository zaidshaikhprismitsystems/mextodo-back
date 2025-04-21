import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const countriesCsv = path.join(__dirname, '../data/countries.csv');
const statesCsv = path.join(__dirname, '../data/states.csv');
const citiesCsv = path.join(__dirname, '../data/cities.csv');

interface CountryCSV {
    id: string;
    name: string;
    iso2: string;
}

interface StateCSV {
    id: string;
    name: string;
    countryId: string;
}

interface CityCSV {
    id: string;
    name: string;
    stateId: string;
}

async function seedAdmin() {
  const adminEmail = 'admin@mextodo.com';
  const adminPassword = 'admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.super_admin.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    await prisma.super_admin.create({
      data: {
        username: "admin",
        email: adminEmail,
        password: hashedPassword,
      },
    });
    console.log('✅ Admin created');
  } else {
    console.log('ℹ️ Admin already exists');
  }
}

async function loadCsv<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: T) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function seedCountries(data: CountryCSV[]) {
  for (const { id, name, iso2 } of data) {
    await prisma.countries.upsert({
      where: { isoCode: iso2.trim() },
      update: {},
      create: {
        id: parseInt(id),
        name: name.trim(),
        isoCode: iso2.trim(),
      },
    });
  }
  console.log('✅ Countries seeded');
}

async function seedStates(data: StateCSV[]) {
  for (const { id, name, countryId } of data) {
    await prisma.states.upsert({
      where: {
        id: parseInt(id),
      },
      update: {},
      create: {
        id: parseInt(id),
        name: name.trim(),
        countryId: parseInt(countryId),
      },
    });
  }
  console.log('✅ States seeded');
}

async function seedCities(data: CityCSV[]) {
  for (const { id, name, stateId } of data) {
    await prisma.cities.upsert({
      where: {
        id: parseInt(id),
      },
      update: {},
      create: {
        id: parseInt(id),
        name: name.trim(),
        stateId: parseInt(stateId),
      },
    });
  }
  console.log('✅ Cities seeded');
}

async function main() {
  await seedAdmin();

  const countries = await loadCsv<CountryCSV>(countriesCsv);
  await seedCountries(countries);

  const states = await loadCsv<StateCSV>(statesCsv);
  await seedStates(states);

  const cities = await loadCsv<CityCSV>(citiesCsv);
  await seedCities(cities);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
