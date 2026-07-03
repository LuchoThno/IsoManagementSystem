#!/usr/bin/env node

import { access, constants as fsConstants } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
};

const hasFlag = (flag) => args.includes(flag);

const DEFAULT_EXPECTED_COLLECTIONS = [
  'documents',
  'tasks',
  'audits',
  'settings',
  'standards',
  'chat_threads',
  'platformauditlogs',
];

if (hasFlag('--help') || hasFlag('-h')) {
  process.stdout.write(`Usage:
  node scripts/verify-mongo-restore.mjs --archive <path> [--db <name>] [--temp-suffix <suffix>] [--expected-collections <csv>] [--keep-restored-db]

Environment variables:
  MONGODB_URI              MongoDB connection string. If present, uses mongorestore/mongosh directly.
  MONGODB_DB_NAME          Database name when validating from Docker. Default: iso_manager
  MONGO_CONTAINER_NAME     Docker container name. Default: iso-manager-mongo

Behavior:
  - Restores the archive into a temporary database namespace
  - Verifies the restored database contains expected collections
  - Prints collection counts for quick inspection
  - Drops the temporary database at the end unless --keep-restored-db is provided
`);
  process.exit(0);
}

const archiveArg = getArgValue('--archive');
if (!archiveArg) {
  process.stderr.write('Mongo restore verification failed: --archive is required.\n');
  process.exit(1);
}

const archivePath = resolve(archiveArg);
const dbName = (getArgValue('--db') || process.env.MONGODB_DB_NAME || 'iso_manager').trim();
const tempSuffix = ((getArgValue('--temp-suffix') || 'restore_check').trim() || 'restore_check');
const expectedCollections = (
  getArgValue('--expected-collections') || DEFAULT_EXPECTED_COLLECTIONS.join(',')
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const keepRestoredDb = hasFlag('--keep-restored-db');
const mongoUri = (process.env.MONGODB_URI || '').trim();
const mongoContainerName = (process.env.MONGO_CONTAINER_NAME || 'iso-manager-mongo').trim();
const targetDbName = `${dbName}_${tempSuffix}`;

const quoteForJs = (value) => JSON.stringify(value);

const run = (command, commandArgs, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (options.pipeStdout !== false) {
        process.stdout.write(text);
      }
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      rejectPromise(
        new Error(
          `${command} ${commandArgs.join(' ')} failed with exit code ${String(code)}${stderr ? `\n${stderr.trim()}` : ''}`
        )
      );
    });
  });

const runRestore = async () => {
  const restoreArgs = [
    'scripts/restore-mongo.mjs',
    '--archive',
    archivePath,
    '--temp-suffix',
    tempSuffix,
    '--db',
    dbName,
  ];

  await run('node', restoreArgs);
};

const buildMetadataScript = () => {
  const expectedArray = `[${expectedCollections.map(quoteForJs).join(', ')}]`;

  return [
    `const database = db.getSiblingDB(${quoteForJs(targetDbName)});`,
    'const actualCollections = database.getCollectionNames().sort();',
    `const expectedCollections = ${expectedArray};`,
    'const counts = actualCollections.map((name) => ({ name, count: database.getCollection(name).countDocuments({}) }));',
    'const missingCollections = expectedCollections.filter((name) => !actualCollections.includes(name));',
    'print(JSON.stringify({ database: database.getName(), actualCollections, missingCollections, counts }));',
  ].join('');
};

const readMetadata = async () => {
  const commandArgs = mongoUri
    ? ['--quiet', '--uri', mongoUri, '--eval', buildMetadataScript()]
    : ['exec', '-i', mongoContainerName, 'mongosh', '--quiet', '--eval', buildMetadataScript()];

  const command = mongoUri ? 'mongosh' : 'docker';
  const { stdout } = await run(command, commandArgs, { pipeStdout: false });
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = lines.at(-1);

  if (!lastLine) {
    throw new Error('No fue posible obtener metadata del restore temporal.');
  }

  return JSON.parse(lastLine);
};

const dropTemporaryDatabase = async () => {
  const script = [
    `const database = db.getSiblingDB(${quoteForJs(targetDbName)});`,
    'const result = database.dropDatabase();',
    'print(JSON.stringify(result));',
  ].join('');

  const commandArgs = mongoUri
    ? ['--quiet', '--uri', mongoUri, '--eval', script]
    : ['exec', '-i', mongoContainerName, 'mongosh', '--quiet', '--eval', script];

  await run(mongoUri ? 'mongosh' : 'docker', commandArgs, { pipeStdout: false });
};

const main = async () => {
  await access(archivePath, fsConstants.R_OK);
  await runRestore();

  let metadata;

  try {
    metadata = await readMetadata();
  } finally {
    if (!keepRestoredDb) {
      await dropTemporaryDatabase();
    }
  }

  if (!Array.isArray(metadata?.actualCollections)) {
    throw new Error('La verificación del restore no devolvió una lista válida de colecciones.');
  }

  if (metadata.missingCollections.length > 0) {
    throw new Error(
      `Faltan colecciones esperadas en el restore temporal: ${metadata.missingCollections.join(', ')}`
    );
  }

  process.stdout.write(
    [
      'Mongo restore verification completed.',
      `archive=${archivePath}`,
      `database=${targetDbName}`,
      `mode=${mongoUri ? 'mongodb-uri' : 'docker-exec'}`,
      `expectedCollections=${expectedCollections.join(',')}`,
      `actualCollections=${metadata.actualCollections.join(',')}`,
      `keptTemporaryDatabase=${keepRestoredDb ? 'true' : 'false'}`,
    ].join('\n') + '\n'
  );

  for (const item of metadata.counts) {
    process.stdout.write(`collection=${item.name} count=${item.count}\n`);
  }
};

main().catch((error) => {
  process.stderr.write(
    `Mongo restore verification failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
