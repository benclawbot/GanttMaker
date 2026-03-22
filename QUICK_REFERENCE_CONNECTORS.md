# Quick Reference - Connector Implementation

## Files Changed
- **Main**: `src/modules/gantt-chart/components/GanttChart.tsx`
- **Test**: `sample_simple.gan` (new 2-task test file)

## The Core Change

### Old (WRONG)
```typescript
const midX = Math.max(startX, endX) + 60;  // Routes RIGHT!
return `M ${startX} ${sourceY}
        L ${midX} ${sourceY}
        L ${midX} ${targetY}
        L ${endX} ${targetY}`;
```

### New (CORRECT)
```typescript
// Type-aware anchor selection
switch (dependencyType) {
  case 'fs': startX = sourcePixels.right; endX = targetPixels.left; break;
  case 'ss': startX = sourcePixels.left;  endX = targetPixels.left; break;
  case 'ff': startX = sourcePixels.right; endX = targetPixels.right; break;
  case 'sf': startX = sourcePixels.left;  endX = targetPixels.right; break;
}

// Route LEFT
const routingX = Math.min(startX, endX) - 80;  // Routes LEFT!
return `M ${startX} ${startY}
        L ${routingX} ${startY}
        L ${routingX} ${endY}
        L ${endX} ${endY}`;
```

## The 4 Dependency Types

```
FS: [████]━→[████]    Finish-to-Start (most common)
SS: [████]━→[████]    Start-to-Start (parallel)
FF: [████]━→[████]    Finish-to-Finish (sync end)
SF: [████]━→[████]    Start-to-Finish (rare)
```

## Anchor Point Selection

| Type | Source Point | Target Point |
|------|--------------|--------------|
| FS | RIGHT | LEFT |
| SS | LEFT | LEFT |
| FF | RIGHT | RIGHT |
| SF | LEFT | RIGHT |

## How the Function Works

```
Step 1: Get task row positions
  startY = sourceIndex * ROW_HEIGHT + ROW_HEIGHT/2
  endY = targetIndex * ROW_HEIGHT + ROW_HEIGHT/2

Step 2: Select anchor points by type
  switch(dependencyType) { ... }

Step 3: Calculate routing position
  routingX = Math.min(startX, endX) - 80

Step 4: Create orthogonal path
  Start → Routing → End (3 segments)

Step 5: Return all coordinates
  { path, startX, startY, endX, endY }
```

## What's Rendered

For each dependency:

1. **Path** (invisible, 20px wide) - for clicking
2. **Glow** (optional) - when selected
3. **Line** (2-3px, blue) - the visible connector
4. **Arrow** - at target end
5. **Circles** (r=4) - at both endpoints

## Testing

Open `sample_simple.gan`:
- Task A (2024-01-01 to 2024-01-11)
- Task B (2024-01-15 to 2024-01-25)
- Dependency: A → B (FS)

Expected: Connector from A's right to B's left, routing LEFT.

## Build Status

✅ **SUCCESS**
```
vite v8.0.1 building for production...
✓ 25 modules transformed.
✓ built in 1.07s
```

## Key Improvements

| Issue | Solution |
|-------|----------|
| Routes RIGHT | Routes LEFT with -80px offset |
| Floats in space | Anchors to task bar edges |
| Ignores types | 4-case switch by dependency type |
| Complex code | ~70 lines, clear & documented |
| No docs | Full JSDoc comments |

## Next: Visual Validation

1. Open application
2. Load `sample_simple.gan`
3. Check connector appearance
4. Test other types by dragging handles
5. Compare to reference image
6. Report findings

## Code Locations

- **Main function**: Line ~423-493 in GanttChart.tsx
- **Rendering**: Line ~500-580 in GanttChart.tsx
- **Drag preview**: Line ~580-610 in GanttChart.tsx

---

**Status**: ✅ Ready for testing
