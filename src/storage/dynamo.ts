/* eslint-disable camelcase */
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

import { LockCI, LockData, LockType } from '../lock.js';
import { splitEmpty } from '../utils.js';
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
    return lockFromAttributes(result.Attributes);
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
    return lockFromAttributes(result.Item);
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
    return result.Items.map(lockFromAttributes);
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

  // DDB PutItemCommand only recognizes ALL_OLD for ReturnValues, so it will never return the whole document
  return data;
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
  return keyFromPath(lock.path);
}

export function keyFromPath(path: string): LockKey {
  return {
    path: {
      S: path,
    },
  };
}

export function attributesFromCI(ci: LockCI): AttributeValue.MMember {
  return {
    M: {
      project: {
        S: ci.project,
      },
      ref: {
        S: ci.ref,
      },
      commit: {
        S: ci.commit,
      },
      pipeline: {
        S: ci.pipeline,
      },
      job: {
        S: ci.job,
      },
    },
  };
}

export function attributesFromLinks(links: Record<string, string>): AttributeValue.MMember {
  const attributes: Record<string, AttributeValue.SMember> = {};
  for (const key of Object.keys(links)) {
    attributes[key] = {
      S: links[key],
    };
  }

  return {
    M: attributes,
  };
}

export function attributesFromLock(lock: LockData): Record<string, AttributeValue> {
  const attributes: Record<string, AttributeValue> = {
    type: {
      S: lock.type,
    },
    path: {
      S: lock.path,
    },
    author: {
      S: lock.author,
    },
    created_at: {
      N: lock.created_at.toFixed(0),
    },
    updated_at: {
      N: lock.updated_at.toFixed(0),
    },
    expires_at: {
      N: lock.expires_at.toFixed(0),
    },
    source: {
      S: lock.source,
    },
    allow: {
      S: lock.allow.join(','),
    },
    links: attributesFromLinks(lock.links),
  };

  if (doesExist(lock.ci)) {
    attributes.ci = attributesFromCI(lock.ci);
  }

  return attributes;
}

export function linksFromAttributes(attributes: Record<string, AttributeValue>): Record<string, string> {
  const links: Record<string, string> = {};

  for (const key of Object.keys(attributes)) {
    links[key] = mustExist(attributes[key].S);
  }

  return links;
}

export function ciFromAttributes(attributes: Record<string, AttributeValue>): LockCI {
  return {
    project: mustExist(attributes.project.S),
    ref: mustExist(attributes.ref.S),
    commit: mustExist(attributes.commit.S),
    pipeline: mustExist(attributes.pipeline.S),
    job: mustExist(attributes.job.S),
  };
}

export function lockFromAttributes(attributes: Record<string, AttributeValue>): LockData {
  const lock: LockData = {
    type: mustExist(attributes.type.S) as LockType,
    path: mustExist(attributes.path.S),
    author: mustExist(attributes.author.S),
    source: mustExist(attributes.source.S),
    allow: splitEmpty(mustExist(attributes.allow.S)) as Array<LockType>,
    created_at: parseInt(mustExist(attributes.created_at.N), 10),
    expires_at: parseInt(mustExist(attributes.expires_at.N), 10),
    updated_at: parseInt(mustExist(attributes.updated_at.N), 10),
    links: linksFromAttributes(mustExist(attributes.links.M)),
  };

  if (doesExist(attributes.ci)) {
    lock.ci = ciFromAttributes(mustExist(attributes.ci.M));
  }

  return lock;
}
