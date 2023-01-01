import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

import { LockData } from '../lock.js';
import { buildLock } from '../utils.js';
import { Storage, StorageContext } from './index.js';

export async function dynamoGet(context: StorageContext, client: DynamoDBClient, path: string): Promise<LockData | undefined> {
  const { args, logger } = context;

  context.logger.info({ path }, 'getting data from dynamo');
  const command = new GetItemCommand({
    TableName: context.args.table,
    Key: { key: { S: path } },
  });

  const result = await client.send(command);
  logger.debug({ result }, 'got result from dynamo');

  return buildLock(args); // TODO: build from result
}

export async function dynamoSet(context: StorageContext, client: DynamoDBClient, path: string, data: LockData): Promise<LockData> {
  const { args, logger } = context;

  logger.info({ path, data }, 'setting data in memory');
  const command = new PutItemCommand({
    TableName: args.table,
    Item: { key: { S: path } },
  });

  const result = await client.send(command);
  logger.debug({ result }, 'got result from dynamo');

  return data; // TODO: build from result
}

export async function dynamoConnect(context: StorageContext): Promise<Storage> {
  const client = new DynamoDBClient({
    region: context.args.region,
  });

  return {
    async get(path: string) {
      return dynamoGet(context, client, path);
    },
    async set(path: string, data: LockData) {
      return dynamoSet(context, client, path, data);
    },
  };
}

