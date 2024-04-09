import { Client } from 'pg';
import { faker } from '@faker-js/faker';
import {insertRecordsInChunks, clearDB} from './utils'

// Database configuration
const client = new Client({
    user: 'test_username',
    host: 'localhost',
    database: 'batch_db',
    password: 'test_password',
    port: 5432, // Default PostgreSQL port
});

// Generate fake data for testing
const generateTestData = (numRecords: number) => {
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
};

// Jest test suite
describe('Database chunk insert', () => {

  const testData = generateTestData(1000000);

  afterAll(() => {
    clearDB(client);
  });
  // Test to generate 1 million records
  it('generates one million records', () => {
    expect(testData.length).toBe(1000000);
  });

  // Test to insert 1 million records into the database
  it('inserts 1 million records into the database', async () => {
    await client.query('BEGIN');
    try {
      // Assuming you have a function to insert records in chunks
      const res = await insertRecordsInChunks(client, testData);
      expect(res.length).toBe(0)
      await client.query('COMMIT');

      /*const result = await client.query('SELECT * FROM your_table'); // Replace with your actual query
      expect(result.rows.length).toBe(1000000); */
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.end();
    }
  }, 500000);

});