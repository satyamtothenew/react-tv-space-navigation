# Performance Benchmarks

This directory contains performance benchmarks for comparing v1 and v2 implementations.

## Running Benchmarks

### All Benchmarks
```bash
cd packages/lib
yarn benchmark
```

### Specific Benchmarks

**Navigation Performance:**
```bash
yarn benchmark:navigation
```

**Component Performance:**
```bash
yarn benchmark:components
```

## Benchmark Suites

### 1. Navigation Benchmarks (`performance.benchmark.ts`)

Tests the core SpatialNavigator performance:

- **Node Registration**: Measures time to register N nodes
- **Focus Navigation**: Measures focus movement latency
- **Nested Registration**: Tests deeply nested node structures
- **Batch Registration**: Tests simultaneous node registration

### 2. Component Benchmarks (`component.benchmark.tsx`)

Tests React component rendering performance:

- **Initial Mount**: Time to mount N components
- **Focus Change Re-renders**: Number of re-renders on focus change
- **Nested Components**: Performance with deeply nested components
- **Dynamic Lists**: Performance with frequent updates

## Interpreting Results

### Good Performance Targets (v2)

| Metric | Target | Excellent |
|--------|--------|-----------|
| Node Registration (1000 nodes) | < 500ms | < 300ms |
| Focus Navigation Latency | < 5ms | < 3ms |
| Re-renders per Focus Change | < 10 | < 5 |
| Initial Mount (100 nodes) | < 150ms | < 100ms |

### Performance Improvements (v1 → v2)

Expected improvements:
- Node Registration: **60-70% faster**
- Focus Navigation: **70-80% faster**
- Re-render Count: **85-95% reduction**
- Memory Usage: **50-60% reduction**

## CI/CD Integration

Benchmarks can be integrated into CI/CD pipelines:

```javascript
const results = runAllBenchmarks();
const exported = exportBenchmarkResults(results);

// Save to file
fs.writeFileSync('benchmark-results.json', JSON.stringify(exported, null, 2));

// Compare with baseline
if (exported.summary.v2TotalTime > BASELINE_TIME) {
  console.error('Performance regression detected!');
  process.exit(1);
}
```

## Benchmark Environment

For consistent results:

1. Close unnecessary applications
2. Run on a consistent machine/environment
3. Use Node.js with `--expose-gc` flag for accurate memory measurements
4. Run multiple iterations and average results

### Example:
```bash
node --expose-gc node_modules/.bin/jest --testMatch='**/*.benchmark.ts'
```

## Performance Profiling

For deeper analysis, use Chrome DevTools:

```bash
# Start with inspector
node --inspect-brk node_modules/.bin/jest --testMatch='**/*.benchmark.ts'
```

Then open `chrome://inspect` in Chrome.

## Continuous Monitoring

Set up performance monitoring dashboard:

```javascript
// Example: Send results to monitoring service
const results = runAllBenchmarks();
sendToDatadog(results);
sendToCloudWatch(results);
```

## Notes

- Benchmarks run in Node.js environment (not browser)
- React Native components are mocked for testing
- Memory measurements require `--expose-gc` flag
- Results may vary based on machine specifications

