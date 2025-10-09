#!/usr/bin/env node

/**
 * Revert to v1 Implementation
 *
 * This script restores the v1 files from backup.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'spatial-navigation');
const BACKUP_DIR = path.join(ROOT, '.v1-backup');

const FILES_TO_RESTORE = [
  {
    backup: path.join(BACKUP_DIR, 'SpatialNavigator.ts'),
    target: path.join(SRC, 'SpatialNavigator.ts'),
  },
  {
    backup: path.join(BACKUP_DIR, 'Node.tsx'),
    target: path.join(SRC, 'components', 'Node.tsx'),
  },
  {
    backup: path.join(BACKUP_DIR, 'VirtualizedList.tsx'),
    target: path.join(SRC, 'components', 'virtualizedList', 'VirtualizedList.tsx'),
  },
];

console.log('⏪ Reverting to v1 Implementation...\n');

// Check if backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  console.error('❌ No backup directory found!');
  console.error('   Cannot revert - backups were not created.');
  console.error('   You may need to restore from git: git checkout HEAD -- packages/lib/src\n');
  process.exit(1);
}

let successCount = 0;
let errorCount = 0;

FILES_TO_RESTORE.forEach((file) => {
  try {
    // Check if backup exists
    if (!fs.existsSync(file.backup)) {
      console.log(`⚠️  Skipping ${path.basename(file.target)} - no backup found`);
      return;
    }

    // Restore from backup
    fs.copyFileSync(file.backup, file.target);
    console.log(`✅ Restored ${path.basename(file.target)}`);
    successCount++;
  } catch (error) {
    console.error(`❌ Error restoring ${path.basename(file.target)}:`, error.message);
    errorCount++;
  }
});

console.log('\n' + '━'.repeat(60));
if (successCount > 0) {
  console.log(`\n✨ Successfully reverted to v1!`);
  console.log(`   Files restored: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount}`);
  }
  console.log('\nNext steps:');
  console.log('  1. Run tests: yarn test');
  console.log('  2. Your library is now using v1 implementation\n');
} else {
  console.log('\n❌ No files were restored.');
  console.log('   Check that backups exist in .v1-backup/\n');
  process.exit(1);
}

process.exit(errorCount > 0 ? 1 : 0);
