#!/usr/bin/env node

import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { constants as fsConstants } from 'node:fs';

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
};

const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help') || hasFlag('-h')) {
  process.stdout.write(`Usage:
  node scripts/restore-mongo.mjs --archive <path> [--drop] [--db <name>] [--temp-suffix <suffix>]

Environment variables:
  MONGODB_URI            MongoDB connection string. If present, uses mongorestore directly.
  MONGODB_DB_NAME        Database name when restoring from Docker. Default: iso_manager
  MONGO_CONTAINER_NAME   Docker container name. Default: iso-manager-mongo

Behavior:
  - Requires --archive pointing to a .archive.gz file
  - If --temp-suffix is provided, restores into a temporary database namespace
  - If --drop is provided, drops target collections before restore
`);
  process.exit(0);
}

const archiveArg = getArgValue('--archive');
if (!archiveArg) {
  process.stderr.write('Mongo restore failed: --archive is required.\n');
  process.exit(1);
}

const archivePath = resolve(archiveArg);
const dbName = (getArgValue('--db') || process.env.MONGODB_DB_NAME || 'iso_manager').trim();
const tempSuffix = (getArgValue('--temp-suffix') || '').trim();
const mongoUri = (process.env.MONGODB_URI || '').trim();
const mongoContainerName = (process.env.MONGO_CONTAINER_NAME || 'iso-manager-mongo').trim();
const useDrop = hasFlag('--drop');

const run = (command, commandArgs, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      stdio: options.stdio ?? ['pipe', 'inherit', 'pipe'],
      env: process.env,
    });

    let stderr = '';

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        process.stderr.write(chunk);
      });
    }

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(
          `${command} ${commandArgs.join(' ')} failed with exit code ${String(code)}${stderr ? `\n${stderr.trim()}` : ''}`
        )
      );
    });

    if (options.stdinFile && child.stdin) {
      const input = createReadStream(options.stdinFile);
      input.pipe(child.stdin);
      input.on('error', rejectPromise);
    }
  });

const buildNamespaceArgs = () => {
  if (!tempSuffix) {
    return [];
  }

  return ['--nsFrom', `${dbName}.*`, '--nsTo', `${dbName}_${tempSuffix}.*`];
};

const restoreWithMongoUri = async () => {
  const commandArgs = ['--uri', mongoUri, `--archive=${archivePath}`, '--gzip'];
  if (useDrop) {
    commandArgs.push('--drop');
  }
  commandArgs.push(...buildNamespaceArgs());

  await run('mongorestore', commandArgs, {
    stdio: ['ignore', 'inherit', 'pipe'],
  });
};

const restoreWithDocker = async () => {
  const commandArgs = ['exec', '-i', mongoContainerName, 'mongorestore', '--archive', '--gzip'];
  if (useDrop) {
    commandArgs.push('--drop');
  }
  commandArgs.push(...buildNamespaceArgs());

  await run('docker', commandArgs, { stdinFile: archivePath });
};

const main = async () => {
  await access(archivePath, fsConstants.R_OK);

  if (mongoUri) {
    await restoreWithMongoUri();
  } else {
    await restoreWithDocker();
  }

  process.stdout.write(
    [
      'Mongo restore completed.',
      `archive=${archivePath}`,
      `mode=${mongoUri ? 'mongodb-uri' : 'docker-exec'}`,
      `database=${dbName}${tempSuffix ? `_${tempSuffix}` : ''}`,
      `drop=${useDrop ? 'true' : 'false'}`,
    ].join('\n') + '\n'
  );
};

main().catch((error) => {
  process.stderr.write(
    `Mongo restore failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
