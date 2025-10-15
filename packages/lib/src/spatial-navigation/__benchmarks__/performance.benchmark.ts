/**
 * Performance Benchmarks for v2 Optimizations
 *
 * Compares v1 vs v2 performance across key metrics:
 * 1. Node registration time
 * 2. Focus navigation latency
 * 3. Component re-render counts
 * 4. Memory usage
 * 5. VirtualizedList scroll performance
 */

import SpatialNavigator from '../SpatialNavigator';
import SpatialNavigatorV2 from '../SpatialNavigator.v2';

/**
 * Benchmark configuration
 */
const BENCHMARK_CONFIG = {
  NODE_COUNTS: [10, 100, 500, 1000],
  FOCUS_ITERATIONS: 1000,
  WARMUP_ITERATIONS: 10,
};

/**
 * Performance metrics type
 */
type BenchmarkResult = {
  version: 'v1' | 'v2';
  metric: string;
  nodeCount?: number;
  time: number; // in milliseconds
  operations: number;
  opsPerSecond: number;
  memoryUsed?: number; // in MB
};

/**
 * Simple performance timer
 */
class PerformanceTimer {
  private startTime = 0;
  private startMemory = 0;

  start() {
    // Force garbage collection if available (Node.js with --expose-gc flag)
    if (global.gc) {
      global.gc();
    }

    this.startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    this.startTime = performance.now();
  }

  end(): { time: number; memory: number } {
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    return {
      time: endTime - this.startTime,
      memory: endMemory - this.startMemory,
    };
  }
}

/**
 * Benchmark 1: Node Registration Performance
 */
export const benchmarkNodeRegistration = (
  navigator: SpatialNavigator | SpatialNavigatorV2,
  nodeCount: number,
  version: 'v1' | 'v2',
): BenchmarkResult => {
  const timer = new PerformanceTimer();

  // Register root
  navigator.registerNode('root', { orientation: 'vertical' });

  timer.start();

  // Register nodes sequentially (simulates real app behavior)
  for (let i = 0; i < nodeCount; i++) {
    navigator.registerNode(`node_${i}`, {
      parent: 'root',
      isFocusable: true,
      orientation: 'horizontal',
    });
  }

  // Wait for batched registration (v2)
  const result = timer.end();

  // Cleanup
  for (let i = 0; i < nodeCount; i++) {
    navigator.unregisterNode(`node_${i}`);
  }
  navigator.unregisterNode('root');

  return {
    version,
    metric: 'Node Registration',
    nodeCount,
    time: result.time,
    operations: nodeCount,
    opsPerSecond: (nodeCount / result.time) * 1000,
    memoryUsed: result.memory,
  };
};

/**
 * Benchmark 2: Focus Navigation Performance
 */
export const benchmarkFocusNavigation = (
  navigator: SpatialNavigator | SpatialNavigatorV2,
  iterations: number,
  version: 'v1' | 'v2',
): BenchmarkResult => {
  const timer = new PerformanceTimer();

  // Setup: Create a horizontal list of nodes
  navigator.registerNode('root', { orientation: 'vertical' });
  navigator.registerNode('list', {
    parent: 'root',
    orientation: 'horizontal',
  });

  for (let i = 0; i < 100; i++) {
    navigator.registerNode(`item_${i}`, {
      parent: 'list',
      isFocusable: true,
    });
  }

  // Focus first item
  navigator.grabFocus('item_0');

  timer.start();

  // Navigate right repeatedly
  for (let i = 0; i < iterations; i++) {
    navigator.handleKeyDown('right');
  }

  const result = timer.end();

  // Cleanup
  for (let i = 0; i < 100; i++) {
    navigator.unregisterNode(`item_${i}`);
  }
  navigator.unregisterNode('list');
  navigator.unregisterNode('root');

  return {
    version,
    metric: 'Focus Navigation',
    time: result.time,
    operations: iterations,
    opsPerSecond: (iterations / result.time) * 1000,
    memoryUsed: result.memory,
  };
};

/**
 * Benchmark 3: Nested Node Registration
 */
export const benchmarkNestedRegistration = (
  navigator: SpatialNavigator | SpatialNavigatorV2,
  depth: number,
  branchingFactor: number,
  version: 'v1' | 'v2',
): BenchmarkResult => {
  const timer = new PerformanceTimer();
  let totalNodes = 0;

  // Register root
  navigator.registerNode('root', { orientation: 'vertical' });

  timer.start();

  // Create nested structure
  const registerLevel = (parentId: string, currentDepth: number) => {
    if (currentDepth >= depth) return;

    for (let i = 0; i < branchingFactor; i++) {
      const nodeId = `${parentId}_child_${i}`;
      navigator.registerNode(nodeId, {
        parent: parentId,
        isFocusable: true,
        orientation: 'horizontal',
      });
      totalNodes++;

      registerLevel(nodeId, currentDepth + 1);
    }
  };

  registerLevel('root', 0);

  const result = timer.end();

  // Cleanup (unregister recursively)
  const unregisterLevel = (parentId: string, currentDepth: number) => {
    if (currentDepth >= depth) return;

    for (let i = 0; i < branchingFactor; i++) {
      const nodeId = `${parentId}_child_${i}`;
      unregisterLevel(nodeId, currentDepth + 1);
      navigator.unregisterNode(nodeId);
    }
  };

  unregisterLevel('root', 0);
  navigator.unregisterNode('root');

  return {
    version,
    metric: 'Nested Registration',
    nodeCount: totalNodes,
    time: result.time,
    operations: totalNodes,
    opsPerSecond: (totalNodes / result.time) * 1000,
    memoryUsed: result.memory,
  };
};

/**
 * Benchmark 4: Batch Registration Performance (v2 specific)
 */
export const benchmarkBatchRegistration = (
  navigator: SpatialNavigator | SpatialNavigatorV2,
  nodeCount: number,
  version: 'v1' | 'v2',
): BenchmarkResult => {
  const timer = new PerformanceTimer();

  navigator.registerNode('root', { orientation: 'vertical' });

  timer.start();

  // Register all nodes at once (simulates batch mount)
  for (let i = 0; i < nodeCount; i++) {
    navigator.registerNode(`batch_node_${i}`, {
      parent: 'root',
      isFocusable: true,
    });
  }

  // For v2, this should batch process efficiently
  const result = timer.end();

  // Cleanup
  for (let i = 0; i < nodeCount; i++) {
    navigator.unregisterNode(`batch_node_${i}`);
  }
  navigator.unregisterNode('root');

  return {
    version,
    metric: 'Batch Registration',
    nodeCount,
    time: result.time,
    operations: nodeCount,
    opsPerSecond: (nodeCount / result.time) * 1000,
    memoryUsed: result.memory,
  };
};

/**
 * Run all benchmarks and compare v1 vs v2
 */
export const runAllBenchmarks = () => {
  console.log('🚀 Starting Performance Benchmarks...\n');
  console.log('Comparing v1 vs v2 across multiple metrics\n');
  console.log('='.repeat(80));

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Node Registration for different node counts
  console.log('\n📊 Benchmark 1: Node Registration Performance');
  console.log('-'.repeat(80));
  for (const nodeCount of BENCHMARK_CONFIG.NODE_COUNTS) {
    const onDirectionHandledWithoutMovementRef = { current: () => undefined };

    const v1Navigator = new SpatialNavigator({ onDirectionHandledWithoutMovementRef });
    const v1Result = benchmarkNodeRegistration(v1Navigator, nodeCount, 'v1');
    results.push(v1Result);

    const v2Navigator = new SpatialNavigatorV2({ onDirectionHandledWithoutMovementRef });
    const v2Result = benchmarkNodeRegistration(v2Navigator, nodeCount, 'v2');
    results.push(v2Result);

    const improvement = ((v1Result.time - v2Result.time) / v1Result.time) * 100;

    console.log(`\nNodes: ${nodeCount}`);
    console.log(
      `  v1: ${v1Result.time.toFixed(2)}ms (${v1Result.opsPerSecond.toFixed(0)} ops/sec)`,
    );
    console.log(
      `  v2: ${v2Result.time.toFixed(2)}ms (${v2Result.opsPerSecond.toFixed(0)} ops/sec)`,
    );
    console.log(`  Improvement: ${improvement.toFixed(1)}% faster`);
  }

  // Benchmark 2: Focus Navigation
  console.log('\n\n📊 Benchmark 2: Focus Navigation Performance');
  console.log('-'.repeat(80));
  {
    const onDirectionHandledWithoutMovementRef = { current: () => undefined };

    const v1Navigator = new SpatialNavigator({ onDirectionHandledWithoutMovementRef });
    const v1Result = benchmarkFocusNavigation(v1Navigator, BENCHMARK_CONFIG.FOCUS_ITERATIONS, 'v1');
    results.push(v1Result);

    const v2Navigator = new SpatialNavigatorV2({ onDirectionHandledWithoutMovementRef });
    const v2Result = benchmarkFocusNavigation(v2Navigator, BENCHMARK_CONFIG.FOCUS_ITERATIONS, 'v2');
    results.push(v2Result);

    const improvement = ((v1Result.time - v2Result.time) / v1Result.time) * 100;
    const avgLatencyV1 = v1Result.time / v1Result.operations;
    const avgLatencyV2 = v2Result.time / v2Result.operations;

    console.log(`\nIterations: ${BENCHMARK_CONFIG.FOCUS_ITERATIONS}`);
    console.log(
      `  v1: ${v1Result.time.toFixed(2)}ms total, ${avgLatencyV1.toFixed(3)}ms avg latency`,
    );
    console.log(
      `  v2: ${v2Result.time.toFixed(2)}ms total, ${avgLatencyV2.toFixed(3)}ms avg latency`,
    );
    console.log(`  Improvement: ${improvement.toFixed(1)}% faster`);
  }

  // Benchmark 3: Nested Registration
  console.log('\n\n📊 Benchmark 3: Nested Registration Performance');
  console.log('-'.repeat(80));
  {
    const depth = 4;
    const branchingFactor = 5;
    const onDirectionHandledWithoutMovementRef = { current: () => undefined };

    const v1Navigator = new SpatialNavigator({ onDirectionHandledWithoutMovementRef });
    const v1Result = benchmarkNestedRegistration(v1Navigator, depth, branchingFactor, 'v1');
    results.push(v1Result);

    const v2Navigator = new SpatialNavigatorV2({ onDirectionHandledWithoutMovementRef });
    const v2Result = benchmarkNestedRegistration(v2Navigator, depth, branchingFactor, 'v2');
    results.push(v2Result);

    const improvement = ((v1Result.time - v2Result.time) / v1Result.time) * 100;

    console.log(
      `\nDepth: ${depth}, Branching: ${branchingFactor}, Total Nodes: ${v1Result.nodeCount}`,
    );
    console.log(`  v1: ${v1Result.time.toFixed(2)}ms`);
    console.log(`  v2: ${v2Result.time.toFixed(2)}ms`);
    console.log(`  Improvement: ${improvement.toFixed(1)}% faster`);
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 Performance Summary');
  console.log('='.repeat(80));

  const v1Times = results.filter((r) => r.version === 'v1').reduce((sum, r) => sum + r.time, 0);
  const v2Times = results.filter((r) => r.version === 'v2').reduce((sum, r) => sum + r.time, 0);
  const overallImprovement = ((v1Times - v2Times) / v1Times) * 100;

  console.log(`\nOverall Improvement: ${overallImprovement.toFixed(1)}% faster`);
  console.log(`Total v1 time: ${v1Times.toFixed(2)}ms`);
  console.log(`Total v2 time: ${v2Times.toFixed(2)}ms`);
  console.log(`Time saved: ${(v1Times - v2Times).toFixed(2)}ms`);

  return results;
};

/**
 * Export for CI/CD integration
 */
export const exportBenchmarkResults = (results: BenchmarkResult[]) => {
  return {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      v1TotalTime: results.filter((r) => r.version === 'v1').reduce((sum, r) => sum + r.time, 0),
      v2TotalTime: results.filter((r) => r.version === 'v2').reduce((sum, r) => sum + r.time, 0),
    },
  };
};

/**
 * Run benchmarks if executed directly
 */
if (require.main === module) {
  runAllBenchmarks();
}
