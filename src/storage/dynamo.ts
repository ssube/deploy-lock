/* eslint-disable sonarjs/no-duplicate-string */
import { doesExist, mustExist } from '@apextoaster/js-utils';
import {
  AttributeValue,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

import { ParsedArgs } from '../args.js';
import { LockData } from '../lock.js';
import { buildLock } from '../utils.js';
import { Storage, StorageContext } from './index.js';

export async function dynamoDelete(context: StorageContext, client: DynamoDBClient, path: string): Promise<LockData | undefined> {
  const { args, logger } = context;
  const { table } = args;

  logger.info({ path, table }, 'deleting lock from dynamo');
  const command = new DeleteItemCommand({
    TableName: table,
    Key: keyFromPath(path),
  });

  const result = await client.send(command);
  logger.debug({ result }, 'got result from dynamo');

  if (doesExist(result.Attributes)) {
    return lockFromAttributes(args, result.Attributes);
  }

  return undefined;
}

export async function dynamoGet(context: StorageContext, client: DynamoDBClient, path: string): Promise<LockData | undefined> {
  const { args, logger } = context;
  const { table } = args;

  logger.info({ path, table }, 'getting data from dynamo');
  const command = new GetItemCommand({
    TableName: table,
    Key: keyFromPath(path),
  });

  const result = await client.send(command);
  logger.debug({ result }, 'got result from dynamo');

  if (doesExist(result.Item)) {
    return lockFromAttributes(args, result.Item);
  }

  return undefined;
}

export async function dynamoList(context: StorageContext, client: DynamoDBClient): Promise<Array<LockData>> {
  const { args, logger } = context;
  const { table } = args;

  logger.info({ table }, 'listing data from dynamo');
  const command = new ScanCommand({
    TableName: table,
  });

  const result = await client.send(command);
  logger.debug({ result }, 'got result from dynamo');

  if (doesExist(result.Items)) {
    return result.Items.map((item) => lockFromAttributes(args, item));
  } else {
    return [];
  }
}

export async function dynamoSet(context: StorageContext, client: DynamoDBClient, data: LockData): Promise<LockData> {
  const { args, logger } = context;
  const { path } = data;
  const { table } = args;

  logger.info({ data, path, table }, 'setting data in dynamo');
  const command = new PutItemCommand({
    TableName: table,
    Item: attributesFromLock(data),
  });

  const result = await client.send(command);
  logger.debug({ result }, 'got result from dynamo');

  if (result.Attributes) {
    return lockFromAttributes(args, result.Attributes);
  } else {
    throw new Error('no attributes in dynamo result');
  }
}

export async function dynamoConnect(context: StorageContext): Promise<Storage> {
  const { args } = context;
  const { endpoint, region } = args;

  const client = new DynamoDBClient({
    endpoint,
    region,
  });

  return {
    delete(path: string) {
      return dynamoDelete(context, client, path);
    },
    get(path: string) {
      return dynamoGet(context, client, path);
    },
    list() {
      return dynamoList(context, client);
    },
    set(data: LockData) {
      return dynamoSet(context, client, data);
    },
  };
}

export type LockKey = Record<'path', Record<'S', string>>;

export function keyFromLock(lock: LockData): LockKey {
  return {
    path: {
      S: lock.path,
    },
  };
}

export function keyFromPath(path: string): LockKey {
  return {
    path: {
      S: path,
    },
  };
}

export function attributesFromLock(lock: LockData): Record<string, AttributeValue> {
  return keyFromLock(lock);
}

export function lockFromAttributes(args: ParsedArgs, attributes: Record<string, AttributeValue>): LockData {
  const lock = buildLock(args); // TODO: remove
  lock.path = mustExist(attributes.path.S);
  return lock;
}
