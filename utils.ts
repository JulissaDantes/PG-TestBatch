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

export async function insertRecordsInChunks(client: Client, records: Record[]): Promise<any[]> {
  const chunkSize = 10000;
  const errors: { record: Record; error: any }[] = [];
  
  for (let i = 0; i < records.length; i += chunkSize) {
    console.log("about to start at:", i);
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
      console.log("Finished chunk #:", Math.floor(((i + 1)/chunkSize) + 1)," of ", records.length/ chunkSize);
      await client.query('COMMIT');
      console.log("Committed")
    } catch (error) {
      await client.query('ROLLBACK');
      errors.push(...chunk.map((record) => ({ record, error })));
    }
  }
  return errors
}

  export async function readRecordsInChunks(client: Client, records: Record[]): Promise<any[]> {
    const chunkSize = 10000;
    const errors: { record: Record; error: any }[] = [];
    const res = [];
    
    for (let i = 0; i < records.length; i += chunkSize) {
      console.log("about to start at:", i);
      const chunk = records.slice(i, i + chunkSize);
      try {
        await client.query('BEGIN');
  
        for (const record of chunk) {
          res.push(await client.query('Select * from your_table where name = $1 and address= $2 and email = $3', [
            record.name,
            record.address,
            record.email,
          ]));
        }
        console.log("Finished chunk #:", Math.floor(((i + 1)/chunkSize) + 1)," of ", records.length/ chunkSize);
        await client.query('COMMIT');
        console.log("Committed")
      } catch (error) {
        await client.query('ROLLBACK');
        errors.push(...chunk.map((record) => ({ record, error })));
      }
    }

  return res.length > 0? res : errors;
}

export async function clearDB(client: Client) {
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM your_table');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
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
    //const errors = await readRecordsInChunks(client, records);
    //await clearDB(client)
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
