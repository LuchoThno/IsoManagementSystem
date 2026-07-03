#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

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
  node scripts/mongo-backup-cycle.mjs [--env <name>] [--db <name>] [--dir <path>] [--keep <count>] [--max-age-days <days>] [--skip-verify] [--verify-temp-suffix <suffix>] [--expected-collections <csv>] [--apply-prune]

Environment variables:
  BACKUP_OUTPUT_DIR      Backup directory. Default: backups
  BACKUP_ENV             Environment name for generated backups. Default: local
  BACKUP_KEEP_COUNT      Minimum number of newest backups to keep during prune. Default: 7
  BACKUP_MAX_AGE_DAYS    Maximum age in days for prune. Optional
  MONGODB_DB_NAME        Database name for backup and restore. Default: iso_manager

Behavior:
  - Generates a new Mongo backup
  - Applies backup retention in dry-run mode unless --apply-prune is provided
  - Verifies restore against the newest matching backup unless --skip-verify is provided
`);
  process.exit(0);
}

const backupDir = resolve(getArgValue('--dir') || process.env.BACKUP_OUTPUT_DIR || 'backups');
const environmentName = (getArgValue('--env') || process.env.BACKUP_ENV || 'local').trim();
const dbName = (getArgValue('--db') || process.env.MONGODB_DB_NAME || 'iso_manager').trim();
const keepCount = (getArgValue('--keep') || process.env.BACKUP_KEEP_COUNT || '7').trim();
const maxAgeDays = (getArgValue('--max-age-days') || process.env.BACKUP_MAX_AGE_DAYS || '').trim();
const verifyTempSuffix = ((getArgValue('--verify-temp-suffix') || 'restore_check').trim() || 'restore_check');
const expectedCollections = (getArgValue('--expected-collections') || '').trim();
const skipVerify = hasFlag('--skip-verify');
const applyPrune = hasFlag('--apply-prune');

const run = (command, commandArgs) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${String(code)}`)
      );
    });
  });

const findLatestBackup = async () => {
  const entries = await readdir(backupDir, { withFileTypes: true }).catch((error) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  });

  const matchingFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.endsWith('.archive.gz'))
    .filter((fileName) => fileName.startsWith(`iso-manager_${environmentName}_`))
    .sort((left, right) => right.localeCompare(left));

  const latest = matchingFiles[0] ?? null;
  return latest ? join(backupDir, latest) : null;
};

const main = async () => {
  const backupArgs = ['scripts/backup-mongo.mjs', '--env', environmentName, '--db', dbName, '--archive', join(backupDir, `iso-manager_${environmentName}_${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}.archive.gz`)];
  process.stdout.write(`step=backup env=${environmentName} db=${dbName}\n`);
  await run('node', backupArgs);

  const pruneArgs = [
    'scripts/prune-mongo-backups.mjs',
    '--dir',
    backupDir,
    '--env',
    environmentName,
    '--keep',
    keepCount,
  ];

  if (maxAgeDays) {
    pruneArgs.push('--max-age-days', maxAgeDays);
  }

  if (applyPrune) {
    pruneArgs.push('--apply');
  }

  process.stdout.write(
    `step=prune env=${environmentName} mode=${applyPrune ? 'apply' : 'dry-run'}\n`
  );
  await run('node', pruneArgs);

  if (skipVerify) {
    process.stdout.write('step=verify skipped=true\n');
    return;
  }

  const latestBackup = await findLatestBackup();
  if (!latestBackup) {
    throw new Error(
      `No se encontro un backup para verificar en ${backupDir} con el prefijo iso-manager_${environmentName}_`
    );
  }

  const verifyArgs = [
    'scripts/verify-mongo-restore.mjs',
    '--archive',
    latestBackup,
    '--db',
    dbName,
    '--temp-suffix',
    verifyTempSuffix,
  ];

  if (expectedCollections) {
    verifyArgs.push('--expected-collections', expectedCollections);
  }

  process.stdout.write(`step=verify archive=${latestBackup}\n`);
  await run('node', verifyArgs);
};

main().catch((error) => {
  process.stderr.write(
    `Mongo backup cycle failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
