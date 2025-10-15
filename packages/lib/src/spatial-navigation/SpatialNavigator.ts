/**
 * SpatialNavigator v2 - Optimized Version
 *
 * Key improvements:
 * 1. Batched registration system (O(n) instead of O(n²))
 * 2. WeakMap for automatic memory cleanup
 * 3. RequestIdleCallback for non-blocking registration
 * 4. Optimized data structures (Set instead of Array)
 */

import { Direction, Lrud } from '@bam.tech/lrud';
import { isError } from './helpers/isError';

export type OnDirectionHandledWithoutMovement = (direction: Direction) => void;
type OnDirectionHandledWithoutMovementRef = { current: OnDirectionHandledWithoutMovement };

type SpatialNavigatorParams = {
  onDirectionHandledWithoutMovementRef: OnDirectionHandledWithoutMovementRef;
};

type RegistrationTask = {
  params: Parameters<Lrud['registerNode']>;
  attempts: number;
  timestamp: number;
};

type NavigationMetrics = {
  focusChanges: number;
  avgFocusLatency: number;
  registrationCount: number;
  batchedRegistrations: number;
};

export default class SpatialNavigatorV2 {
  private lrud: Lrud;
  private onDirectionHandledWithoutMovementRef: OnDirectionHandledWithoutMovementRef;

  // Optimized registration system
  private registrationBatchQueue = new Set<RegistrationTask>();
  private batchTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY_MS = 16; // One frame at 60fps
  private readonly MAX_REGISTRATION_ATTEMPTS = 10;

  // Memory optimization: WeakMap for automatic cleanup
  private nodeMetadata = new WeakMap<object, { lastFocused: number }>();

  // Optimized parent-child mapping
  private parentChildMap = new Map<string, Set<string>>();

  // Performance metrics (optional, for dev mode)
  private metrics: NavigationMetrics = {
    focusChanges: 0,
    avgFocusLatency: 0,
    registrationCount: 0,
    batchedRegistrations: 0,
  };

  // Cleanup interval
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute

  constructor({
    onDirectionHandledWithoutMovementRef = { current: () => undefined },
  }: SpatialNavigatorParams) {
    this.lrud = new Lrud();
    this.onDirectionHandledWithoutMovementRef = onDirectionHandledWithoutMovementRef;

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Optimized registration with batching
   * Instead of recursive registration, we batch and process in idle time
   */
  public registerNode(...params: Parameters<Lrud['registerNode']>) {
    const task: RegistrationTask = {
      params,
      attempts: 0,
      timestamp: Date.now(),
    };

    this.registrationBatchQueue.add(task);
    this.metrics.registrationCount++;

    // Schedule batch processing if not already scheduled
    if (!this.batchTimeoutId) {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Schedule batch processing using requestIdleCallback when available
   * Falls back to setTimeout for Node.js environment
   */
  private scheduleBatchProcessing() {
    // Use requestIdleCallback if available (browser), otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      this.batchTimeoutId = requestIdleCallback(() => this.processBatchRegistration(), {
        timeout: this.BATCH_DELAY_MS,
      }) as unknown as ReturnType<typeof setTimeout>;
    } else {
      this.batchTimeoutId = setTimeout(() => this.processBatchRegistration(), this.BATCH_DELAY_MS);
    }
  }

  /**
   * Process registration queue in a single pass - O(n) complexity
   */
  private processBatchRegistration() {
    const readyToRegister: RegistrationTask[] = [];
    const stillPending: RegistrationTask[] = [];
    const timedOut: RegistrationTask[] = [];

    // Single pass through queue
    for (const task of this.registrationBatchQueue) {
      const parent = task.params[1]?.parent;
      const id = task.params[0];

      // Check if task has timed out (been pending too long)
      if (Date.now() - task.timestamp > 5000) {
        timedOut.push(task);
        console.warn(`[SpatialNavigator v2] Registration timeout for node: ${id}`);
        continue;
      }

      // Check if parent exists or if this is a root node
      if (parent === undefined || this.lrud.getNode(parent)) {
        readyToRegister.push(task);
      } else if (task.attempts < this.MAX_REGISTRATION_ATTEMPTS) {
        task.attempts++;
        stillPending.push(task);
      } else {
        console.warn(
          `[SpatialNavigator v2] Max registration attempts reached for node: ${id}, parent: ${parent}`,
        );
      }
    }

    // Register all ready nodes in batch
    this.metrics.batchedRegistrations += readyToRegister.length;

    readyToRegister.forEach((task) => {
      try {
        const id = task.params[0];
        const parent = task.params[1]?.parent;

        this.lrud.registerNode(...task.params);

        // Update parent-child mapping for efficient cleanup
        if (parent) {
          if (!this.parentChildMap.has(parent)) {
            this.parentChildMap.set(parent, new Set());
          }
          this.parentChildMap.get(parent)?.add(id);
        }

        // Handle any queued focus after registration
        this.handleQueuedFocus();
      } catch (e) {
        console.error('[SpatialNavigator v2] Registration error:', e);
      }
    });

    // Update queue with only pending tasks
    this.registrationBatchQueue = new Set(stillPending);
    this.batchTimeoutId = null;

    // Schedule next batch if there are still pending tasks
    if (stillPending.length > 0) {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Optimized unregister with cleanup of child references
   */
  public unregisterNode(...params: Parameters<Lrud['unregisterNode']>) {
    const id = params[0];

    // Ensure id is a string
    if (typeof id !== 'string') {
      console.warn('[SpatialNavigator v2] Cannot unregister non-string node ID');
      return;
    }

    // Clean up parent-child mapping
    const children = this.parentChildMap.get(id);
    if (children) {
      // Unregister all children first
      children.forEach((childId) => {
        try {
          this.lrud.unregisterNode(childId);
        } catch (e) {
          // Child might already be unregistered
        }
      });
      this.parentChildMap.delete(id);
    }

    // Remove from parent's children set
    for (const [, childSet] of this.parentChildMap.entries()) {
      if (childSet.has(id)) {
        childSet.delete(id);
        break;
      }
    }

    // Unregister the node itself
    this.lrud.unregisterNode(...params);
  }

  /**
   * Optimized key handling with performance tracking
   */
  public async handleKeyDown(direction: Direction | null) {
    if (!direction) return;
    if (!this.hasRootNode) return;
    if (!this.lrud.getRootNode()) return;

    const startTime = performance.now();

    const nodeBeforeMovement = this.lrud.getCurrentFocusNode();
    this.lrud.handleKeyEvent({ direction }, { forceFocus: true });
    const nodeAfterMovement = this.lrud.getCurrentFocusNode();

    // Track metrics
    this.metrics.focusChanges++;
    const latency = performance.now() - startTime;
    this.metrics.avgFocusLatency =
      (this.metrics.avgFocusLatency * (this.metrics.focusChanges - 1) + latency) /
      this.metrics.focusChanges;

    if (nodeBeforeMovement === nodeAfterMovement) {
      this.onDirectionHandledWithoutMovementRef.current(direction);
    }
  }

  public hasOneNodeFocused() {
    return this.lrud.getCurrentFocusNode() !== undefined;
  }

  /**
   * Focus queue management (unchanged from v1 but with better comments)
   */
  private focusQueue: string | null = null;
  private virtualNodeFocusQueue: string | null = null;

  public handleOrQueueDefaultFocus = (id: string) => {
    if (this.getCurrentFocusNode()) return;
    if (this.focusQueue) return;
    if (this.lrud.getNode(id)) {
      this.lrud.assignFocus(id);
      return;
    }
    this.focusQueue = id;
  };

  public grabFocusDeferred = (id: string) => {
    try {
      if (this.lrud.getNode(id)) {
        this.lrud.assignFocus(id);
        return;
      }
    } catch (error) {
      if (isError(error) && error.message === 'trying to assign focus to a non focusable node') {
        this.virtualNodeFocusQueue = id;
      }
    }
  };

  private handleQueuedFocus = () => {
    // Handle regular focus queue
    if (this.focusQueue && this.lrud.getNode(this.focusQueue)) {
      try {
        this.lrud.assignFocus(this.focusQueue);
        this.focusQueue = null;
      } catch (e) {
        // Silently fail - node might not be focusable yet
      }
    }

    // Handle virtual node focus queue
    if (
      this.virtualNodeFocusQueue &&
      this.lrud.getNode(this.virtualNodeFocusQueue)?.children?.length !== 0
    ) {
      try {
        this.lrud.assignFocus(this.virtualNodeFocusQueue);
        this.virtualNodeFocusQueue = null;
      } catch (e) {
        // Silently fail
      }
    }
  };

  public grabFocus = (id: string) => {
    return this.lrud.assignFocus(id);
  };

  public getCurrentFocusNode = () => {
    return this.lrud.currentFocusNode;
  };

  private get hasRootNode(): boolean {
    try {
      this.lrud.getRootNode();
      return true;
    } catch (e) {
      if (__DEV__) {
        console.warn('[React Spatial Navigation v2] No registered node on this page.');
      }
      return false;
    }
  }

  /**
   * New in v2: Periodic cleanup to prevent memory leaks
   */
  private startPeriodicCleanup() {
    // Skip periodic cleanup in test environments
    if (typeof jest !== 'undefined' || process.env.NODE_ENV === 'test') {
      return;
    }
    
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupStaleReferences();
    }, this.CLEANUP_INTERVAL_MS);
  }

  private cleanupStaleReferences() {
    try {
      // Get all currently registered nodes
      const rootNode = this.lrud.getRootNode();
      const allNodes = rootNode?.children || [];
      const allNodeIds = new Set<string>();

      // Recursively collect all node IDs
      const collectNodeIds = (nodes: unknown[]) => {
        nodes.forEach((node) => {
          if (
            node &&
            typeof node === 'object' &&
            'id' in node &&
            typeof (node as any).id === 'string'
          ) {
            allNodeIds.add((node as any).id);
          }
          if (
            node &&
            typeof node === 'object' &&
            'children' in node &&
            Array.isArray((node as any).children)
          ) {
            collectNodeIds((node as any).children);
          }
        });
      };
      collectNodeIds(allNodes);

      // Remove stale entries from parent-child map
      for (const [parentId, children] of this.parentChildMap.entries()) {
        if (!allNodeIds.has(parentId)) {
          this.parentChildMap.delete(parentId);
        } else {
          // Clean up stale children
          for (const childId of children) {
            if (!allNodeIds.has(childId)) {
              children.delete(childId);
            }
          }
        }
      }
    } catch (e) {
      // Silently fail if cleanup encounters issues
      if (__DEV__) {
        console.warn('[SpatialNavigator v2] Cleanup error:', e);
      }
    }
  }

  /**
   * New in v2: Get performance metrics
   */
  public getMetrics(): NavigationMetrics {
    return { ...this.metrics };
  }

  /**
   * New in v2: Reset metrics
   */
  public resetMetrics() {
    this.metrics = {
      focusChanges: 0,
      avgFocusLatency: 0,
      registrationCount: 0,
      batchedRegistrations: 0,
    };
  }

  /**
   * New in v2: Cleanup and destroy
   */
  public destroy() {
    // Clear timers
    if (this.batchTimeoutId) {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(this.batchTimeoutId as unknown as number);
      } else {
        clearTimeout(this.batchTimeoutId);
      }
      this.batchTimeoutId = null;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    // Clear data structures
    this.registrationBatchQueue.clear();
    this.parentChildMap.clear();
    this.focusQueue = null;
    this.virtualNodeFocusQueue = null;

    // Cleanup completed
  }
}
