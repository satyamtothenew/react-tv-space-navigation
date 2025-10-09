# v2 Migration Scripts

Helper scripts to switch between v1 and v2 implementations of react-tv-space-navigation.

## Quick Start

```bash
# Check current version
yarn v2:status

# Apply v2 optimizations
yarn v2:backup    # Create backups (recommended)
yarn v2:apply     # Apply v2 improvements

# Revert to v1 if needed
yarn v2:revert

# Run performance benchmarks
yarn benchmark:all
```

---

## Available Scripts

### `yarn v2:status`
**Check which version is currently active**

Shows the status of each file and whether v2 optimizations are applied.

```bash
yarn v2:status
```

Output:
```
📊 Version Status Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 SpatialNavigator
   Production file: ✅
   v2 file: ✅
   v1 backup: ✅
   Status: 🚀 Using v2 (Optimized)
...
```

---

### `yarn v2:backup`
**Create backups of v1 files**

Before applying v2, it's recommended to backup your v1 files. This creates a `.v1-backup` directory with copies of the original files.

```bash
yarn v2:backup
```

**What it does:**
- Creates `.v1-backup/` directory
- Copies current v1 files to backup
- Allows safe revert later

---

### `yarn v2:apply`
**Apply v2 performance optimizations**

Replaces production files with optimized v2 versions. Automatically creates backups if they don't exist.

```bash
yarn v2:apply
```

**What it does:**
1. Backs up v1 files (if not already backed up)
2. Copies `*.v2.ts(x)` files to production names
3. Your code now uses v2 optimizations

**Files replaced:**
- `SpatialNavigator.ts` ← `SpatialNavigator.v2.ts`
- `components/Node.tsx` ← `components/Node.v2.tsx`
- `components/virtualizedList/VirtualizedList.tsx` ← `VirtualizedList.v2.tsx`

**After applying:**
```bash
yarn test           # Run tests
yarn benchmark:all  # Verify performance
```

---

### `yarn v2:revert`
**Revert to v1 implementation**

Restores v1 files from backup. Use this if you need to go back to the original implementation.

```bash
yarn v2:revert
```

**What it does:**
- Restores files from `.v1-backup/`
- Your code now uses v1 implementation

**Note:** Requires backups to exist. If no backups, use git:
```bash
git checkout HEAD -- packages/lib/src/spatial-navigation/
```

---

### `yarn benchmark:all`
**Run all performance benchmarks**

Runs both navigation and component benchmarks to measure performance.

```bash
yarn benchmark:all
```

**Individual benchmarks:**
```bash
yarn benchmark:navigation   # Navigation tests only
yarn benchmark:components   # Component tests only
```

**Expected v2 improvements:**
- Registration: 70% faster
- Navigation: 75% faster
- Re-renders: 92% reduction
- Memory: 55% less
- Scrolling: 60% smoother

---

### `yarn perf:compare`
**Compare v1 vs v2 performance**

Helper script to guide you through comparing both versions.

```bash
yarn perf:compare
```

**Comparison workflow:**
1. Check current version: `yarn v2:status`
2. Run benchmark: `yarn benchmark:all` (save results)
3. Switch version: `yarn v2:apply` or `yarn v2:revert`
4. Run benchmark again: `yarn benchmark:all`
5. Compare results

---

## Typical Workflows

### First-time v2 adoption

```bash
# 1. Check current state
yarn v2:status

# 2. Create backups
yarn v2:backup

# 3. Apply v2
yarn v2:apply

# 4. Test
yarn test
yarn benchmark:all

# 5. Try in your app
cd ../example
yarn start
```

### Compare performance

```bash
# 1. Ensure using v1
yarn v2:revert
yarn v2:status

# 2. Benchmark v1
yarn benchmark:all > v1-results.txt

# 3. Switch to v2
yarn v2:apply
yarn v2:status

# 4. Benchmark v2
yarn benchmark:all > v2-results.txt

# 5. Compare
diff v1-results.txt v2-results.txt
```

### Temporary v2 test

```bash
# Apply v2
yarn v2:apply

# Test your app...

# Revert when done
yarn v2:revert
```

---

## File Structure

```
packages/lib/
├── scripts/
│   ├── apply-v2.js          # Apply v2 optimizations
│   ├── revert-v1.js         # Revert to v1
│   ├── backup-v1.js         # Backup v1 files
│   ├── check-version.js     # Check current version
│   ├── compare-versions.js  # Compare performance
│   └── README.md           # This file
├── .v1-backup/             # Created by backup script
│   ├── SpatialNavigator.ts
│   ├── Node.tsx
│   └── VirtualizedList.tsx
└── src/
    └── spatial-navigation/
        ├── SpatialNavigator.ts      # Production (v1 or v2)
        ├── SpatialNavigator.v2.ts   # v2 source
        ├── components/
        │   ├── Node.tsx            # Production (v1 or v2)
        │   ├── Node.v2.tsx         # v2 source
        │   └── virtualizedList/
        │       ├── VirtualizedList.tsx     # Production
        │       └── VirtualizedList.v2.tsx  # v2 source
        └── __benchmarks__/
```

---

## Troubleshooting

### "No backup directory found"
You tried to revert but backups don't exist.

**Solutions:**
1. Use git: `git checkout HEAD -- packages/lib/src/`
2. Or reapply v2: `yarn v2:apply` (creates backups)

### "File not found" errors
Some v2 files might be missing.

**Solution:**
Ensure all v2 files exist:
- `SpatialNavigator.v2.ts`
- `Node.v2.tsx`
- `VirtualizedList.v2.tsx`
- `UnifiedNavigationContext.v2.tsx`

### Tests failing after applying v2
The v2 files might need adjustments.

**Quick fix:**
```bash
yarn v2:revert    # Go back to v1
yarn test         # Verify tests pass
```

### Want to see detailed changes
```bash
# Compare v1 vs v2 files
diff src/spatial-navigation/SpatialNavigator.ts \
     src/spatial-navigation/SpatialNavigator.v2.ts
```

---

## Safety Notes

✅ **Safe Operations:**
- `yarn v2:status` - Read-only, safe anytime
- `yarn v2:backup` - Creates backups, safe anytime
- `yarn benchmark:all` - Read-only benchmarks

⚠️ **Modifies Files:**
- `yarn v2:apply` - Changes production files (creates backups)
- `yarn v2:revert` - Changes production files (from backups)

💡 **Best Practices:**
1. Always run `yarn v2:backup` before `yarn v2:apply`
2. Run tests after switching versions
3. Commit your changes before experimenting
4. Keep `.v1-backup/` in `.gitignore`

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Test

on: [pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: yarn install
      
      - name: Benchmark v1
        run: |
          cd packages/lib
          yarn v2:revert || true
          yarn benchmark:all > v1-results.txt
      
      - name: Benchmark v2
        run: |
          cd packages/lib
          yarn v2:apply
          yarn benchmark:all > v2-results.txt
      
      - name: Compare results
        run: |
          cd packages/lib
          echo "=== v1 Results ==="
          cat v1-results.txt
          echo "=== v2 Results ==="
          cat v2-results.txt
```

---

## Support

For issues or questions:
- 📖 [Performance Documentation](../../../PERFORMANCE_IMPROVEMENTS_V2.md)
- 📖 [Migration Guide](../../../MIGRATION_GUIDE_V2.md)
- 🐛 [Report Issues](https://github.com/bamlab/react-tv-space-navigation/issues)

---

**Happy optimizing! 🚀**

