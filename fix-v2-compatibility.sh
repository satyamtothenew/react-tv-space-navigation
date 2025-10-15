#!/bin/bash

echo "🔧 Applying v2 compatibility fixes..."

# Fix Node.tsx - Add backward compatibility export
echo "📝 Fixing Node.tsx..."
sed -i '' '/SpatialNavigationNodeV2\.displayName = '\''SpatialNavigationNodeV2'\'';/a\
\
// Backward compatibility export\
export const SpatialNavigationNode = SpatialNavigationNodeV2;' packages/lib/src/spatial-navigation/components/Node.tsx

# Fix VirtualizedList.tsx - Add backward compatibility export
echo "📝 Fixing VirtualizedList.tsx..."
sed -i '' '/VirtualizedListV2\.displayName = '\''VirtualizedListV2'\'';/a\
\
// Backward compatibility export\
export const VirtualizedList = VirtualizedListV2;' packages/lib/src/spatial-navigation/components/virtualizedList/VirtualizedList.tsx

# Fix SpatialNavigator.ts - Add test environment check
echo "📝 Fixing SpatialNavigator.ts..."
sed -i '' 's/private startPeriodicCleanup() {/private startPeriodicCleanup() {\
  \/\/ Skip periodic cleanup in test environments\
  if (typeof jest !== "undefined" || process.env.NODE_ENV === "test") {\
    return;\
  }\
/' packages/lib/src/spatial-navigation/SpatialNavigator.ts

echo "✅ v2 compatibility fixes applied successfully!"
echo "🚀 You can now run: yarn build:core"