# Smart Routing - Updated Implementation

## Overview

The connector routing is now **intelligent** and responds to task timing:

- **Routes LEFT** (backward) when target task ends BEFORE source task ends
- **Routes RIGHT** (forward) when target task ends AFTER source task ends

This creates clean, professional connectors that don't overlap unnecessarily.

---

## The Logic

### Decision Point
```typescript
const sourceEndX = sourcePixels.right;  // Where source task ends
const targetEndX = targetPixels.right;  // Where target task ends
const routeLeft = targetEndX < sourceEndX;  // True if target is earlier
```

### Routing Behavior

**If target task ends BEFORE source task ends:**
```
Timeline: ─────────────────────────────────────────

Task A   [████████████████]  (ends later)
         ●━━━━━╮
                │ ← Route LEFT
            ╭───┘
            ●━━━━ [████████] Task B  (ends earlier)
```

**If target task ends AFTER source task ends:**
```
Timeline: ─────────────────────────────────────────

Task A   [████████]  (ends earlier)
         ●━━━━━╮
                │ ← Route RIGHT
                └───╮
                    ●━━━━ [████████████████] Task B  (ends later)
```

---

## Implementation Details

### Smart Routing Logic

```typescript
// Determine routing direction based on timeline position
const sourceEndX = sourcePixels.right;    // Source task end point
const targetEndX = targetPixels.right;    // Target task end point
const routeLeft = targetEndX < sourceEndX; // Compare positions

// Calculate routing position accordingly
let routingX: number;
if (routeLeft) {
  // Route LEFT (backward in timeline)
  const minX = Math.min(startX, endX);
  routingX = minX - 80; // 80px to the left
} else {
  // Route RIGHT (forward in timeline)
  const maxX = Math.max(startX, endX);
  routingX = maxX + 80; // 80px to the right
}
```

### Why This Works

1. **No Overlapping**: Connectors don't cross task bars unnecessarily
2. **Visual Clarity**: Clear indication of temporal relationships
3. **Professional**: Creates clean, organized appearance
4. **Intuitive**: Follows natural reading pattern (left = before, right = after)

---

## Examples by Dependency Type

### FS (Finish-to-Start) - Target Later

Task A finishes → Task B starts (and ends after A)

```
Timeline: ─────────────────────────────────────────

Task A    [████████]  (ends at 200px)
         ●━━━━━╮
                │ ← Route RIGHT (Task B ends after A)
                └───╮
                    ●━━━━ [████████████████] Task B
                          (ends at 400px)

Routing: sourceEnd(200) < targetEnd(400) → Route RIGHT
```

### FS (Finish-to-Start) - Target Earlier

Task A finishes → Task B starts (but B ends before A)

```
Timeline: ─────────────────────────────────────────

Task A    [████████████████]  (ends at 400px)
         ●━━━━━╮
                │ ← Route LEFT (Task B ends before A)
            ╭───┘
            ●━━━ [████████] Task B
                 (ends at 200px)

Routing: sourceEnd(400) > targetEnd(200) → Route LEFT
```

### SS (Start-to-Start) - Both Starting, Different Lengths

Task A starts → Task B starts

```
Case 1: Task B is longer
[████████████]  Task A (ends at 200)
●━━━━━╮
       └─────╮
             ●━━━━━━━━━━━━ Task B (ends at 400)
Route: RIGHT (B ends later)

Case 2: Task A is longer
[████████████████████]  Task A (ends at 400)
●━━━━━╮
       │ ← Route LEFT
   ╭───┘
   ●━━━ [████████] Task B (ends at 200)
Route: LEFT (B ends earlier)
```

---

## Visual Impact

### Before (Always LEFT)
```
All connectors routed LEFT, regardless of task timing
Could feel unnatural for forward-flowing dependencies
```

### After (Smart Routing)
```
Backward dependencies → Route LEFT (intuitive)
Forward dependencies → Route RIGHT (intuitive)
Matches user's mental model of project flow
```

---

## Anchor Points Still Matter

The routing direction is **independent** of anchor point selection. Each type still uses its correct anchor:

| Type | Anchors | Routing | Result |
|------|---------|---------|--------|
| **FS** | Right→Left | Smart | Routes based on task timing |
| **SS** | Left→Left | Smart | Routes based on task timing |
| **FF** | Right→Right | Smart | Routes based on task timing |
| **SF** | Left→Right | Smart | Routes based on task timing |

---

## Code Location

**File**: `src/modules/gantt-chart/components/GanttChart.tsx`  
**Function**: `calculatePath`  
**Lines**: ~423-503

**Key Section**:
```typescript
// Smart routing: determine direction based on target position relative to source
const sourceEndX = sourcePixels.right;
const targetEndX = targetPixels.right;
const routeLeft = targetEndX < sourceEndX;

let routingX: number;
if (routeLeft) {
  const minX = Math.min(startX, endX);
  routingX = minX - 80; // Route LEFT
} else {
  const maxX = Math.max(startX, endX);
  routingX = maxX + 80; // Route RIGHT
}
```

---

## Testing the Smart Routing

### Test Case 1: FS with Later Target
1. Create Task A (Jan 1-15)
2. Create Task B (Jan 15-31)
3. Create FS dependency A→B
4. Expected: Connector routes RIGHT (B is later)

### Test Case 2: FS with Earlier Target
1. Create Task A (Jan 15-31)
2. Create Task B (Jan 1-15)
3. Create FS dependency A→B
4. Expected: Connector routes LEFT (B is earlier)

### Test Case 3: Mixed Project
1. Create multiple tasks with varying durations
2. Create various dependencies
3. Expected: Connectors route intelligently based on timing

---

## Build Status

✅ **Success**
```
vite v8.0.1 building for production...
✓ 25 modules transformed
dist/index.html                    0.38 kB
dist/assets/index-*.css            12.02 kB
dist/assets/index-*.js             224.08 kB
✓ built in 1.07s
```

Zero errors, zero warnings.

---

## Summary

The connector routing is now **smart and context-aware**:

✅ Routes LEFT when target is earlier (backward dependency)  
✅ Routes RIGHT when target is later (forward dependency)  
✅ Always uses correct anchor points for each type  
✅ Creates clean, professional appearance  
✅ Matches user's mental model of project flow  
✅ Zero build errors  

The implementation adapts intelligently to your project's temporal layout!

---

## Next: Visual Testing

Please test the connectors with your sample project to verify:
1. Backward dependencies route LEFT
2. Forward dependencies route RIGHT
3. Visual appearance matches your expectations
4. All dependency types work correctly

Let me know if you see any improvements needed!
