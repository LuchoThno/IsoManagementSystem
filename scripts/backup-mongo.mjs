#!/usr/bin/env node

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
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

if (hasFlag('--help') || hasFlag('-h')) {
  process.stdout.write(`Usage:
  node scripts/backup-mongo.mjs [--archive <path>] [--env <name>] [--db <name>]

Environment variables:
  MONGODB_URI            MongoDB connection string. If present, uses mongodump directly.
  MONGODB_DB_NAME        Database name when backing up from Docker. Default: iso_manager
  MONGO_CONTAINER_NAME   Docker container name. Default: iso-manager-mongo
  BACKUP_OUTPUT_DIR      Output directory for generated archives. Default: backups

Behavior:
  - If MONGODB_URI exists, runs mongodump with --uri
  - Otherwise falls back to docker exec against the mongo container
  - Writes a gzip archive with a timestamped filename when --archive is omitted
`);
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const environmentName = (getArgValue('--env') || process.env.BACKUP_ENV || 'local').trim();
const outputDir = resolve(process.env.BACKUP_OUTPUT_DIR || 'backups');
const archiveArg = getArgValue('--archive');
const archivePath = archiveArg
  ? resolve(archiveArg)
  : join(outputDir, `iso-manager_${environmentName}_${timestamp}.archive.gz`);
const dbName = (getArgValue('--db') || process.env.MONGODB_DB_NAME || 'iso_manager').trim();
const mongoUri = (process.env.MONGODB_URI || '').trim();
const mongoContainerName = (process.env.MONGO_CONTAINER_NAME || 'iso-manager-mongo').trim();

const ensureParentDirectory = async (filePath) => {
  await mkdir(dirname(filePath), { recursive: true });
};

const run = (command, commandArgs, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
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

    if (options.stdoutFile && child.stdout) {
      const output = createWriteStream(options.stdoutFile);
      child.stdout.pipe(output);
      output.on('error', rejectPromise);
    }
  });

const backupWithMongoUri = async () => {
  await run('mongodump', ['--uri', mongoUri, `--archive=${archivePath}`, '--gzip'], {
    stdio: ['ignore', 'inherit', 'pipe'],
  });
};

const backupWithDocker = async () => {
  await run(
    'docker',
    ['exec', '-i', mongoContainerName, 'mongodump', '--archive', '--gzip', '--db', dbName],
    { stdoutFile: archivePath }
  );
};

const main = async () => {
  await ensureParentDirectory(archivePath);

  if (mongoUri) {
    await backupWithMongoUri();
  } else {
    await backupWithDocker();
  }

  process.stdout.write(
    [
      'Mongo backup completed.',
      `archive=${archivePath}`,
      `mode=${mongoUri ? 'mongodb-uri' : 'docker-exec'}`,
      `database=${dbName}`,
      `file=${basename(archivePath)}`,
    ].join('\n') + '\n'
  );
};

main().catch((error) => {
  process.stderr.write(
    `Mongo backup failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
