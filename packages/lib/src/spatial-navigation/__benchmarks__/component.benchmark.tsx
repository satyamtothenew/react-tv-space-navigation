/**
 * React Component Performance Benchmarks
 *
 * Measures:
 * 1. Component render counts
 * 2. Re-render performance
 * 3. Mount/unmount performance
 * 4. Memory usage during component lifecycle
 */

import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react-native';
import { SpatialNavigationNode } from '../components/Node';
import { SpatialNavigationRoot } from '../components/Root';

/**
 * Render counter for tracking re-renders
 */
class RenderCounter {
  private counts = new Map<string, number>();

  increment(componentId: string) {
    this.counts.set(componentId, (this.counts.get(componentId) || 0) + 1);
  }

  get(componentId: string): number {
    return this.counts.get(componentId) || 0;
  }

  reset() {
    this.counts.clear();
  }

  getTotal(): number {
    return Array.from(this.counts.values()).reduce((sum, count) => sum + count, 0);
  }
}

const renderCounter = new RenderCounter();

/**
 * Test component that tracks renders
 */
const TestNode = ({
  id,
  isFocusable = false,
  children,
}: {
  id: string;
  isFocusable?: boolean;
  children?: React.ReactNode;
}) => {
  useEffect(() => {
    renderCounter.increment(id);
  });

  if (isFocusable) {
    return (
      <SpatialNavigationNode isFocusable={true}>
        {() => <>{children || `Node ${id}`}</>}
      </SpatialNavigationNode>
    );
  }

  return (
    <SpatialNavigationNode isFocusable={false}>
      <>{children || `Node ${id}`}</>
    </SpatialNavigationNode>
  );
};

/**
 * Benchmark 1: Initial Mount Performance
 */
export const benchmarkInitialMount = (nodeCount: number) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  const { unmount } = render(
    <SpatialNavigationRoot>
      {Array.from({ length: nodeCount }).map((_, i) => (
        <TestNode key={i} id={`node_${i}`} isFocusable />
      ))}
    </SpatialNavigationRoot>,
  );

  const mountTime = performance.now() - startTime;
  const mountMemory = process.memoryUsage().heapUsed / 1024 / 1024 - startMemory;

  const totalRenders = renderCounter.getTotal();
  renderCounter.reset();

  unmount();

  return {
    nodeCount,
    mountTime,
    mountMemory,
    totalRenders,
    avgTimePerNode: mountTime / nodeCount,
  };
};

/**
 * Benchmark 2: Focus Change Re-render Count
 */
export const benchmarkFocusChangeRerenders = () => {
  const TestApp = () => {
    return (
      <SpatialNavigationRoot>
        {Array.from({ length: 10 }).map((_, i) => (
          <TestNode key={i} id={`focus_node_${i}`} isFocusable />
        ))}
      </SpatialNavigationRoot>
    );
  };

  renderCounter.reset();
  const { rerender } = render(<TestApp />);

  const initialRenders = renderCounter.getTotal();
  renderCounter.reset();

  // Simulate focus change
  act(() => {
    rerender(<TestApp />);
  });

  const rerendersOnFocusChange = renderCounter.getTotal();

  return {
    initialRenders,
    rerendersOnFocusChange,
    improvement:
      initialRenders > 0
        ? `${((1 - rerendersOnFocusChange / initialRenders) * 100).toFixed(1)}%`
        : 'N/A',
  };
};

/**
 * Benchmark 3: Nested Component Performance
 */
export const benchmarkNestedComponents = (depth: number) => {
  const renderNestedNodes = (currentDepth: number, maxDepth: number): React.ReactElement => {
    const id = `nested_${currentDepth}`;

    if (currentDepth >= maxDepth) {
      return <TestNode id={id} isFocusable />;
    }

    return <TestNode id={id}>{renderNestedNodes(currentDepth + 1, maxDepth)}</TestNode>;
  };

  renderCounter.reset();
  const startTime = performance.now();

  const { unmount } = render(
    <SpatialNavigationRoot>{renderNestedNodes(0, depth)}</SpatialNavigationRoot>,
  );

  const renderTime = performance.now() - startTime;
  const totalRenders = renderCounter.getTotal();

  unmount();

  return {
    depth,
    renderTime,
    totalRenders,
    avgTimePerLevel: renderTime / depth,
  };
};

/**
 * Benchmark 4: Dynamic List Performance
 */
export const benchmarkDynamicList = (itemCount: number, updateIterations: number) => {
  const TestDynamicList = ({ items }: { items: number[] }) => {
    return (
      <SpatialNavigationRoot>
        {items.map((item) => (
          <TestNode key={item} id={`dynamic_${item}`} isFocusable />
        ))}
      </SpatialNavigationRoot>
    );
  };

  renderCounter.reset();
  const startTime = performance.now();

  let items = Array.from({ length: itemCount }, (_, i) => i);
  const { rerender, unmount } = render(<TestDynamicList items={items} />);

  const initialRenders = renderCounter.getTotal();
  const updateTimes: number[] = [];

  // Perform updates
  for (let i = 0; i < updateIterations; i++) {
    renderCounter.reset();
    const updateStart = performance.now();

    // Add one item and remove one item
    items = [...items.slice(1), items.length + i];

    act(() => {
      rerender(<TestDynamicList items={items} />);
    });

    updateTimes.push(performance.now() - updateStart);
  }

  const totalTime = performance.now() - startTime;
  const avgUpdateTime = updateTimes.reduce((sum, t) => sum + t, 0) / updateTimes.length;

  unmount();

  return {
    itemCount,
    updateIterations,
    totalTime,
    avgUpdateTime,
    initialRenders,
    avgRendersPerUpdate: renderCounter.getTotal() / updateIterations,
  };
};

/**
 * Run all component benchmarks
 */
export const runComponentBenchmarks = () => {
  console.log('\n\n🧪 React Component Performance Benchmarks');
  console.log('='.repeat(80));

  // Benchmark 1: Initial Mount
  console.log('\n📊 Benchmark 1: Initial Mount Performance');
  console.log('-'.repeat(80));

  const mountCounts = [10, 50, 100, 500];
  mountCounts.forEach((count) => {
    const result = benchmarkInitialMount(count);
    console.log(`\nNodes: ${count}`);
    console.log(`  Mount Time: ${result.mountTime.toFixed(2)}ms`);
    console.log(`  Memory Used: ${result.mountMemory.toFixed(2)}MB`);
    console.log(`  Total Renders: ${result.totalRenders}`);
    console.log(`  Avg Time/Node: ${result.avgTimePerNode.toFixed(3)}ms`);
  });

  // Benchmark 2: Focus Change Re-renders
  console.log('\n\n📊 Benchmark 2: Focus Change Re-render Count');
  console.log('-'.repeat(80));

  const focusResult = benchmarkFocusChangeRerenders();
  console.log(`\nInitial Renders: ${focusResult.initialRenders}`);
  console.log(`Re-renders on Focus: ${focusResult.rerendersOnFocusChange}`);
  console.log(`Improvement: ${focusResult.improvement}`);

  // Benchmark 3: Nested Components
  console.log('\n\n📊 Benchmark 3: Nested Component Performance');
  console.log('-'.repeat(80));

  const nestedDepths = [5, 10, 20];
  nestedDepths.forEach((depth) => {
    const result = benchmarkNestedComponents(depth);
    console.log(`\nDepth: ${depth}`);
    console.log(`  Render Time: ${result.renderTime.toFixed(2)}ms`);
    console.log(`  Total Renders: ${result.totalRenders}`);
    console.log(`  Avg Time/Level: ${result.avgTimePerLevel.toFixed(3)}ms`);
  });

  // Benchmark 4: Dynamic List
  console.log('\n\n📊 Benchmark 4: Dynamic List Performance');
  console.log('-'.repeat(80));

  const listResult = benchmarkDynamicList(50, 100);
  console.log(`\nItems: ${listResult.itemCount}, Updates: ${listResult.updateIterations}`);
  console.log(`  Total Time: ${listResult.totalTime.toFixed(2)}ms`);
  console.log(`  Avg Update Time: ${listResult.avgUpdateTime.toFixed(3)}ms`);
  console.log(`  Initial Renders: ${listResult.initialRenders}`);
  console.log(`  Avg Renders/Update: ${listResult.avgRendersPerUpdate.toFixed(1)}`);

  console.log('\n' + '='.repeat(80));
};

/**
 * Export for CI/CD
 */
export const exportComponentBenchmarks = () => {
  const results = {
    mount: [10, 50, 100, 500].map(benchmarkInitialMount),
    focusChange: benchmarkFocusChangeRerenders(),
    nested: [5, 10, 20].map(benchmarkNestedComponents),
    dynamic: benchmarkDynamicList(50, 100),
  };

  return {
    timestamp: new Date().toISOString(),
    results,
  };
};
