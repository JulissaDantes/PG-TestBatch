import { Client } from 'pg';
import { faker } from '@faker-js/faker';

export enum RequestStatus {
    PENDING = 0,
    PROCESSING = 1,
    COMPLETED = 2,
    FAILED = 3,
    READY = 4,
    REPLACED = 5, // Internal status for now, translates to PENDING externally, see RequestPresentationService
}

interface Record {
    id?: string
    status: RequestStatus
    cid: string
    streamId: string
    message: string
    pinned: boolean
    createdAt: Date
    updatedAt: Date
    timestamp: Date
    origin?: string
}

function generateTestData(numRecords: number) {
    const testData = [];
    for (let i = 0; i < numRecords; i++) {
      const record = {
        status: faker.number.int({min: 0, max:5}),
        cid: faker.string.hexadecimal({length: 20}),
        streamId: faker.string.hexadecimal({length: 20}),
        message: faker.lorem.lines(2),
        pinned: faker.datatype.boolean(),
        createdAt: faker.date.anytime(),
        updatedAt: faker.date.anytime(),
        timestamp: faker.date.anytime(),
        origin: faker.string.sample()
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
        await client.query('INSERT INTO request (status, cid, streamId, message, pinned, createdAt, updatedAt, timestamp, origin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
          record.status,
          record.cid,
          record.streamId,
          record.message,
          record.pinned,
          record.createdAt,
          record.updatedAt,
          record.timestamp,
          record.origin,
        ]);
      }
      console.log("Finished inserting chunk #:", Math.floor(((i + 1)/chunkSize) + 1)," of ", records.length/ chunkSize);
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
          res.push(await client.query('Select * from request where status = $1 and cid= $2 and streamId = $3 and message = $4 and pinned= $5 and createdAt = $6 and updatedAt = $7 and timestamp= $8 and origin = $9', [
            record.status,
            record.cid,
            record.streamId,
            record.message,
            record.pinned,
            record.createdAt,
            record.updatedAt,
            record.timestamp,
            record.origin,
          ]));
        }
        console.log("Finished reading chunk #:", Math.floor(((i + 1)/chunkSize) + 1)," of ", records.length/ chunkSize);
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
    console.log("this was generated", records);
    console.log("did we had an error", await insertRecordsInChunks(client, records));
    const res = await readRecordsInChunks(client, records);
    console.log(res.length, "thats the result amount")

    //await clearDB(client)
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
