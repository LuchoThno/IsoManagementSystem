#!/usr/bin/env node

import { readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

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
  node scripts/prune-mongo-backups.mjs [--dir <path>] [--env <name>] [--keep <count>] [--max-age-days <days>] [--apply]

Environment variables:
  BACKUP_OUTPUT_DIR      Backup directory to inspect. Default: backups
  BACKUP_ENV             Environment name used in backup filenames. Optional
  BACKUP_KEEP_COUNT      Minimum number of newest matching backups to keep. Default: 7
  BACKUP_MAX_AGE_DAYS    Deletes matching backups older than this age. Default: disabled

Behavior:
  - Scans the backup directory for .archive.gz files
  - Filters by environment name when --env or BACKUP_ENV is provided
  - Keeps the newest N files and marks older ones as prune candidates
  - Can also prune files older than max age
  - Runs in dry-run mode unless --apply is provided
`);
  process.exit(0);
}

const backupDir = resolve(getArgValue('--dir') || process.env.BACKUP_OUTPUT_DIR || 'backups');
const environmentName = (getArgValue('--env') || process.env.BACKUP_ENV || '').trim();
const keepCount = Number(getArgValue('--keep') || process.env.BACKUP_KEEP_COUNT || '7');
const maxAgeDaysRaw = (getArgValue('--max-age-days') || process.env.BACKUP_MAX_AGE_DAYS || '').trim();
const maxAgeDays = maxAgeDaysRaw ? Number(maxAgeDaysRaw) : null;
const applyChanges = hasFlag('--apply');

if (!Number.isInteger(keepCount) || keepCount < 0) {
  process.stderr.write('Mongo backup prune failed: --keep debe ser un entero mayor o igual a 0.\n');
  process.exit(1);
}

if (maxAgeDays !== null && (!Number.isFinite(maxAgeDays) || maxAgeDays < 0)) {
  process.stderr.write(
    'Mongo backup prune failed: --max-age-days debe ser un numero mayor o igual a 0.\n'
  );
  process.exit(1);
}

const matchesEnvironment = (fileName) => {
  if (!environmentName) {
    return true;
  }

  return fileName.startsWith(`iso-manager_${environmentName}_`);
};

const hasExpectedExtension = (fileName) => fileName.endsWith('.archive.gz');

const parseTimestampFromFileName = (fileName) => {
  const match = fileName.match(/_(\d{8})T(\d{6})Z\.archive\.gz$/);
  if (!match) {
    return null;
  }

  const [, datePart, timePart] = match;
  const isoLike = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}T${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}Z`;
  const parsed = new Date(isoLike);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseCandidates = async () => {
  let entries;

  try {
    entries = await readdir(backupDir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!hasExpectedExtension(entry.name) || !matchesEnvironment(entry.name)) {
      continue;
    }

    const fullPath = join(backupDir, entry.name);
    files.push({
      name: entry.name,
      path: fullPath,
    });
  }

  return files;
};

const main = async () => {
  const candidates = await parseCandidates();
  const now = Date.now();
  const maxAgeMs = maxAgeDays === null ? null : maxAgeDays * 24 * 60 * 60 * 1000;

  candidates.sort((left, right) => right.name.localeCompare(left.name));

  const pruneDecisions = candidates.map((candidate, index) => {
    const createdAt = parseTimestampFromFileName(candidate.name);
    const ageMs = createdAt ? now - createdAt.getTime() : null;
    const exceedsKeepCount = index >= keepCount;
    const exceedsMaxAge = maxAgeMs !== null && ageMs !== null ? ageMs > maxAgeMs : false;
    const shouldPrune = exceedsKeepCount || exceedsMaxAge;

    return {
      ...candidate,
      createdAt,
      ageDays: ageMs === null ? null : ageMs / (24 * 60 * 60 * 1000),
      shouldPrune,
      reasons: [
        ...(exceedsKeepCount ? [`older-than-keep-count-${keepCount}`] : []),
        ...(exceedsMaxAge ? [`older-than-${maxAgeDays}-days`] : []),
      ],
    };
  });

  const filesToPrune = pruneDecisions.filter((item) => item.shouldPrune);
  const filesToKeep = pruneDecisions.filter((item) => !item.shouldPrune);

  if (applyChanges) {
    for (const file of filesToPrune) {
      await rm(file.path);
    }
  }

  process.stdout.write(
    [
      `backupDir=${backupDir}`,
      `environment=${environmentName || 'all'}`,
      `keepCount=${keepCount}`,
      `maxAgeDays=${maxAgeDays === null ? 'disabled' : String(maxAgeDays)}`,
      `mode=${applyChanges ? 'apply' : 'dry-run'}`,
      `matched=${candidates.length}`,
      `kept=${filesToKeep.length}`,
      `pruneCandidates=${filesToPrune.length}`,
    ].join('\n') + '\n'
  );

  for (const file of filesToKeep) {
    process.stdout.write(
      `keep file=${file.name} ageDays=${file.ageDays === null ? 'unknown' : file.ageDays.toFixed(2)}\n`
    );
  }

  for (const file of filesToPrune) {
    process.stdout.write(
      `${applyChanges ? 'deleted' : 'would-delete'} file=${file.name} reasons=${file.reasons.join(',')} ageDays=${file.ageDays === null ? 'unknown' : file.ageDays.toFixed(2)}\n`
    );
  }
};

main().catch((error) => {
  process.stderr.write(
    `Mongo backup prune failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
