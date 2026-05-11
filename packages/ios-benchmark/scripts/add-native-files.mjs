#!/usr/bin/env node
/**
 * Add SCProfiler.{h,mm} to the iosbench Xcode project so the Hermes
 * sampling-profiler bridge gets compiled into the app target.
 * Idempotent — running twice doesn't double-add.
 */
import xcode from 'xcode';
import { resolve } from 'node:path';

const PROJECT_PATH = resolve('ios/iosbench.xcodeproj/project.pbxproj');
const TARGET_NAME = 'iosbench';
const FILES = [
  { path: 'iosbench/SCProfiler.h', kind: 'header' },
  { path: 'iosbench/SCProfiler.mm', kind: 'source' },
];

const project = xcode.project(PROJECT_PATH);
project.parseSync();

const groupKey = project.findPBXGroupKey({ name: TARGET_NAME });
if (!groupKey) throw new Error(`group ${TARGET_NAME} not found`);
const groupObj = project.getPBXGroupByKey(groupKey);
const existing = new Set((groupObj.children ?? []).map((c) => c.comment));

let added = 0;
for (const { path: filePath, kind } of FILES) {
  const fname = filePath.split('/').pop();
  if (existing.has(fname)) {
    console.log(`skip ${fname} — already in project`);
    continue;
  }
  const result =
    kind === 'source'
      ? project.addSourceFile(filePath, { target: project.getFirstTarget().uuid }, groupKey)
      : project.addHeaderFile(filePath, {}, groupKey);
  if (!result) {
    console.error(`failed to add ${fname}`);
    process.exit(1);
  }
  console.log(`added ${fname}`);
  added++;
}

if (added > 0) {
  const fs = await import('node:fs');
  fs.writeFileSync(PROJECT_PATH, project.writeSync());
  console.log(`wrote ${PROJECT_PATH}`);
} else {
  console.log('no changes');
}
