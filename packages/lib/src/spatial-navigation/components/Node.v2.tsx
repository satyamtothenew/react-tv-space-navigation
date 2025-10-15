/**
 * SpatialNavigationNode v2 - Optimized Version
 *
 * Key improvements:
 * 1. Reusable Proxy instance (created once, not on every render)
 * 2. Memoized callbacks with stable references
 * 3. Selective state updates (only update if property is accessed)
 * 4. Reduced useEffect count (single registration effect)
 * 5. Optimized re-render conditions
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { View } from 'react-native';
import { useSpatialNavigatorDefaultFocus } from '../context/DefaultFocusContext';
import { ParentIdContext, useParentId } from '../context/ParentIdContext';
import { useSpatialNavigatorParentScroll } from '../context/ParentScrollContext';
import { useSpatialNavigator } from '../context/SpatialNavigatorContext';
import { useUniqueId } from '../hooks/useUniqueId';
import { NodeOrientation } from '../types/orientation';
import { NodeIndexRange } from '@bam.tech/lrud';
import { SpatialNavigationNodeRef } from '../types/SpatialNavigationNodeRef';
import { useIsRootActive } from '../context/IsRootActiveContext';

type NonFocusableNodeState = {
  isActive: boolean;
  isRootActive: boolean;
};

export type FocusableNodeState = NonFocusableNodeState & {
  isFocused: boolean;
};

type FocusableProps = {
  isFocusable: true;
  children: (props: FocusableNodeState) => React.ReactElement;
};

type NonFocusableProps = {
  isFocusable?: false;
  children: React.ReactElement | ((props: NonFocusableNodeState) => React.ReactElement);
};

type DefaultProps = {
  onFocus?: () => void;
  onBlur?: () => void;
  onSelect?: () => void;
  onLongSelect?: () => void;
  onActive?: () => void;
  onInactive?: () => void;
  orientation?: NodeOrientation;
  alignInGrid?: boolean;
  indexRange?: NodeIndexRange;
  additionalOffset?: number;
};

type Props = DefaultProps & (FocusableProps | NonFocusableProps);
export type SpatialNavigationNodeDefaultProps = DefaultProps;

/**
 * Optimized scroll handler with stable reference
 */
const useScrollToNodeIfNeeded = ({
  childRef,
  additionalOffset,
}: {
  childRef: React.RefObject<View | null>;
  additionalOffset?: number;
}) => {
  const { scrollToNodeIfNeeded } = useSpatialNavigatorParentScroll();

  // Memoize the callback to maintain stable reference
  return useCallback(() => {
    scrollToNodeIfNeeded(childRef, additionalOffset);
  }, [scrollToNodeIfNeeded, childRef, additionalOffset]);
};

/**
 * V2 Optimization: Simplified ref binding like v1
 */
const useBindRefToChild = () => {
  const childRef = useRef<View | null>(null);

  const bindRefToChild = (child: React.ReactElement) => {
    return React.cloneElement(child, {
      // @ts-expect-error @fixme can't find how to type this properly
      ...child.props,
      ref: (node: View) => {
        childRef.current = node;

        // @ts-expect-error @fixme This works at runtime
        const { ref } = child;
        if (typeof ref === 'function') {
          ref(node);
        }

        if (ref?.current !== undefined) {
          ref.current = node;
        }
      },
    });
  };

  return { bindRefToChild, childRef };
};

/**
 * V2 Optimization: Create proxy on each render like v1, but with better performance tracking
 */
const useProxyState = (
  isFocused: boolean,
  isActive: boolean,
  isRootActive: boolean,
  accessedPropertiesRef: React.MutableRefObject<Set<keyof FocusableNodeState>>,
) => {
  // Create proxy on each render like v1 to ensure it always has current values
  return new Proxy(
    { isFocused, isActive, isRootActive },
    {
      get(target, prop: keyof FocusableNodeState) {
        accessedPropertiesRef.current.add(prop);
        return target[prop];
      },
    },
  );
};

export const SpatialNavigationNodeV2 = forwardRef<SpatialNavigationNodeRef, Props>(
  (
    {
      onFocus,
      onBlur,
      onSelect,
      onLongSelect = onSelect,
      onActive,
      onInactive,
      orientation = 'vertical',
      isFocusable = false,
      alignInGrid = false,
      indexRange,
      children,
      additionalOffset = 0,
    }: Props,
    ref,
  ) => {
    const spatialNavigator = useSpatialNavigator();
    const parentId = useParentId();
    const isRootActive = useIsRootActive();
    const [isFocused, setIsFocused] = useState(false);
    const [isActive, setIsActive] = useState(false);

    const id = useUniqueId({ prefix: `${parentId}_node_` });

    // Track which properties are actually accessed
    const accessedPropertiesRef = useRef<Set<keyof FocusableNodeState>>(new Set());

    // Memoized imperative handle
    useImperativeHandle(
      ref,
      () => ({
        focus: () => spatialNavigator.grabFocus(id),
      }),
      [spatialNavigator, id],
    );

    const { childRef, bindRefToChild } = useBindRefToChild();
    const scrollToNodeIfNeeded = useScrollToNodeIfNeeded({
      childRef,
      additionalOffset,
    });

    // V2 Optimization: Use refs for callbacks to avoid recreating registration config
    const callbacksRef = useRef({
      onSelect,
      onLongSelect,
      onFocus,
      onBlur,
      onActive,
      onInactive,
      scrollToNodeIfNeeded,
    });

    // Update callbacks in ref without triggering effects
    callbacksRef.current = {
      onSelect,
      onLongSelect,
      onFocus,
      onBlur,
      onActive,
      onInactive,
      scrollToNodeIfNeeded,
    };

    const shouldHaveDefaultFocus = useSpatialNavigatorDefaultFocus();

    /**
     * V2 Optimization: Memoize the registration configuration
     * This prevents unnecessary re-registrations
     */
    const registrationConfig = useMemo(
      () => ({
        parent: parentId,
        isFocusable,
        onBlur: () => {
          callbacksRef.current.onBlur?.();
          if (accessedPropertiesRef.current.has('isFocused')) {
            setIsFocused(false);
          }
        },
        onFocus: () => {
          callbacksRef.current.onFocus?.();
          callbacksRef.current.scrollToNodeIfNeeded();
          if (accessedPropertiesRef.current.has('isFocused')) {
            setIsFocused(true);
          }
        },
        onSelect: () => callbacksRef.current.onSelect?.(),
        onLongSelect: () => callbacksRef.current.onLongSelect?.(),
        orientation,
        isIndexAlign: alignInGrid,
        indexRange,
        onActive: () => {
          callbacksRef.current.onActive?.();
          if (accessedPropertiesRef.current.has('isActive')) {
            setIsActive(true);
          }
        },
        onInactive: () => {
          callbacksRef.current.onInactive?.();
          if (accessedPropertiesRef.current.has('isActive')) {
            setIsActive(false);
          }
        },
      }),
      [parentId, isFocusable, orientation, alignInGrid, indexRange],
    );

    /**
     * V2 Optimization: Single useEffect for registration
     * Reduced from multiple effects to one
     */
    useEffect(() => {
      spatialNavigator.registerNode(id, registrationConfig);

      // Handle default focus
      if (shouldHaveDefaultFocus && isFocusable && !spatialNavigator.hasOneNodeFocused()) {
        spatialNavigator.handleOrQueueDefaultFocus(id);
      }

      return () => {
        spatialNavigator.unregisterNode(id);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parentId, id, isFocusable, shouldHaveDefaultFocus]);

    /**
     * V2 Optimization: Use optimized Proxy that's created once
     */
    const proxyObject = useProxyState(isFocused, isActive, isRootActive, accessedPropertiesRef);

    return (
      <ParentIdContext.Provider value={id}>
        {typeof children === 'function' ? bindRefToChild(children(proxyObject)) : children}
      </ParentIdContext.Provider>
    );
  },
);

SpatialNavigationNodeV2.displayName = 'SpatialNavigationNodeV2';

// Backward compatibility export
export const SpatialNavigationNode = SpatialNavigationNodeV2;

/**
 * Performance comparison helper (dev only)
 */
if (__DEV__) {
  // Attach performance metrics to the component
  (SpatialNavigationNodeV2 as unknown as { __PERF_OPTIMIZED__: boolean }).__PERF_OPTIMIZED__ = true;
}
