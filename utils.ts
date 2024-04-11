import { Client } from 'pg';
import { faker } from '@faker-js/faker';
import Knex from 'knex';
import config from './knexfile';
//import { date } from '@ceramicnetwork/codecs';

const knex = Knex(config);

export enum RequestStatus {
    PENDING = 0,
    PROCESSING = 1,
    COMPLETED = 2,
    FAILED = 3,
    READY = 4,
    REPLACED = 5, // Internal status for now, translates to PENDING externally, see RequestPresentationService
}

export type IDBRequest = {
    id?: string
    status: RequestStatus
    cid: string
    streamid: string
    message: string
    pinned: boolean
    timestamp?: string
    createdat?: string
    updatedat?: string
    origin?: string
}

interface Record {
    id?: string
    status: RequestStatus
    cid: string
    streamid: string
    message: string
    pinned: boolean
    createdat: Date
    updatedat: Date
    timestamp: Date
    origin?: string
}

function generateTestData(numRecords: number) {
    const testData = [];
    for (let i = 0; i < numRecords; i++) {
      const record = {
        status: faker.number.int({min: 0, max:5}),
        cid: faker.string.hexadecimal({length: 20}),
        streamid: faker.string.hexadecimal({length: 20}),
        message: faker.lorem.lines(2),
        pinned: faker.datatype.boolean(),
        createdat: faker.date.anytime(),
        updatedat: faker.date.anytime(),
        timestamp: faker.date.anytime(),
        origin: faker.string.sample()
      };
      testData.push(record);
    }
    return testData;
}

export async function insertRecordsInChunks(records: Record[]): Promise<any[]> {
    const chunkSize = 5000;
    const errors: any[] | PromiseLike<any[]> = []
    
    knex.batchInsert('request', records, chunkSize)
    .catch(function (error) {
      console.log("Algo exploto",error.message)
      errors.push(error);
    });
  
    return errors
}

  export async function readRecordsInChunks(client: Client, records: Record[]): Promise<any[]> {
    const chunkSize = 10000;
    const errors: { record: Record; error: any }[] = [];
    const res = [];
    
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      try {
        await client.query('BEGIN');
  
        for (const record of chunk) {
          res.push(await client.query('Select * from request where status = $1 and cid= $2 and streamid = $3 and message = $4 and pinned= $5 and createdat = $6 and updatedat = $7 and timestamp= $8 and origin = $9', [
            record.status,
            record.cid,
            record.streamid,
            record.message,
            record.pinned,
            record.createdat,
            record.updatedat,
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

  try {
    const records = generateTestData(1000000);
    console.log("About to start the insert")
    console.log("did we had an error", await insertRecordsInChunks(records));
    //const res = await readRecordsInChunks(client, records);
    //console.log(res.length, "thats the result amount")

    //await clearDB(client)
    console.log("THE END")
  } catch (error) {
    console.error('Error:', error);
  } finally {
   // await knex.destroy(); 
  }
}

main();
