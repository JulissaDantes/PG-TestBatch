import { Client } from 'pg';
import { faker } from '@faker-js/faker';

interface Record {
  name: string;
  email: string;
  address: string;
}
// TODO use actual DB schema here
function generateTestData(numRecords: number) {
    const testData = [];
    for (let i = 0; i < numRecords; i++) {
      const record = {
        name: faker.person.firstName(),
        email: faker.internet.email(),
        address: faker.location.direction(),
        // Add more fields as needed
      };
      testData.push(record);
    }
    return testData;
}

async function insertRecordsInChunks(client: Client, records: Record[]): Promise<{ record: Record; error: Error }[]> {
  const chunkSize = 10000;
  const errors: { record: Record; error: Error }[] = [];

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    try {
      await client.query('BEGIN');

      for (const record of chunk) {
        await client.query('INSERT INTO your_table (name, address, email) VALUES ($1, $2, $3)', [
          record.name,
          record.address,
          record.email,
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      errors.push(...chunk.map((record) => ({ record, error })));
    }
  }

  return errors;
}

// Usage example:
async function main() {
  const client = new Client({
    user: 'test_username',
    host: 'localhost',
    database: 'batch_db',
    password: 'test_password',
    port: 5432, // Default PostgreSQL port
  });

  try {
    await client.connect();

    const records = generateTestData(1000000);
    const errors = await insertRecordsInChunks(client, records);

    console.log('Records that couldn\'t be inserted:', errors);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();