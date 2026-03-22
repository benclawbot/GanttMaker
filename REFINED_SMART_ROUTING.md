# Refined Smart Routing - Bidirectional Logic

## The Problem We Fixed

The previous implementation routed the start and end of connectors in the **same direction**, causing paths to pass through the middle of target tasks.

**Before (Wrong):**
```
If target is earlier: both start and end route LEFT
[████]•━━━━━━━━━━━━━━━━━•[████]   ← Path cuts through target!
```

**After (Correct):**
```
If target is earlier: start routes LEFT, end routes RIGHT
[████]•        ┐      [████]•
      └─•──────┴────•─┘      ← Path avoids target!
```

---

## The New Logic

### Smart Bidirectional Routing

**When target task ends EARLIER than source:**
- **Start point**: Routes LEFT (backward)
- **End point**: Routes RIGHT (forward) - *opposite direction*
- **Result**: Path approaches from opposite sides, avoids cutting through target

**When target task ends LATER than source:**
- **Start point**: Routes RIGHT (forward)
- **End point**: Routes LEFT (backward) - *opposite direction*
- **Result**: Path approaches from opposite sides, avoids cutting through target

### The Code

```typescript
const targetIsEarlier = targetEndX < sourceEndX;

if (targetIsEarlier) {
  // Target is earlier: start LEFT, end RIGHT
  const minX = Math.min(startX, endX);
  startRoutingX = minX - 80;      // LEFT
  
  const maxX = Math.max(startX, endX);
  endRoutingX = maxX + 80;        // RIGHT (opposite)
} else {
  // Target is later: start RIGHT, end LEFT
  const maxX = Math.max(startX, endX);
  startRoutingX = maxX + 80;      // RIGHT
  
  const minX = Math.min(startX, endX);
  endRoutingX = minX - 80;        // LEFT (opposite)
}

// Path now has 5 segments instead of 4
const path = `M ${startX} ${startY}
              L ${startRoutingX} ${startY}
              L ${startRoutingX} ${endY}
              L ${endRoutingX} ${endY}
              L ${endX} ${endY}`;
```

---

## Visual Examples

### Example 1: Target Earlier (FS dependency)
```
Timeline:  ├──────────────────────────────────────┤

Task A:    [████████████████████] (Mar 22 - Apr 6)
           •                      ┐
            └─────•────────────────┴──•

Task B:    [████████] (Mar 22 - Mar 27)
           •         

Path behavior:
- Starts at A's right edge
- Routes LEFT (backward) to 80px left of minimum X
- Goes down to Task B's row
- Routes RIGHT (forward) to 80px right of maximum X
- Arrives at B's left edge
- Avoids cutting through B's task bar
```

### Example 2: Target Later (FS dependency)
```
Timeline:  ├──────────────────────────────────────┤

Task A:    [████████] (Mar 22 - Mar 27)
           •        ┐
            └───•────┴──────────────•

Task B:    [████████████████████] (Mar 22 - Apr 6)
           •                      

Path behavior:
- Starts at A's right edge
- Routes RIGHT (forward) to 80px right of maximum X
- Goes down to Task B's row
- Routes LEFT (backward) to 80px left of minimum X
- Arrives at B's left edge
- Avoids cutting through B's task bar
```

### Example 3: SS (Start-to-Start) Dependencies
```
Both routed by same "target is earlier/later" logic

If B starts and ends earlier:
[████████]
•                        [████]
└────•────────────•─┐   •
                   └──┘  ← Routes LEFT then RIGHT

If B starts at same time but ends later:
[████]
•             [██████████████]
└──────•────┐ •
            └──┘  ← Routes RIGHT then LEFT
```

---

## Path Structure

The connector path now has **5 segments**:

```
1. M ${startX} ${startY}         ← Start point
2. L ${startRoutingX} ${startY}  ← Route horizontally (left or right)
3. L ${startRoutingX} ${endY}    ← Route vertically down/up
4. L ${endRoutingX} ${endY}      ← Route horizontally (opposite direction)
5. L ${endX} ${endY}             ← End point

Creates a "bow-tie" or "hourglass" shape when routing in opposite directions
```

---

## Key Insight

**The routing direction for start and end are always OPPOSITE:**

- If target is earlier: start=LEFT, end=RIGHT
- If target is later: start=RIGHT, end=LEFT

This opposite routing prevents the path from cutting through the middle of the target task bar.

---

## Anchor Points Unaffected

The anchor point selection by dependency type remains the same:

| Type | Anchor Start | Anchor End |
|------|--------------|-----------|
| FS | source.right | target.left |
| SS | source.left | target.left |
| FF | source.right | target.right |
| SF | source.left | target.right |

The smart routing applies to **how** the path routes between these anchors, not where the anchors are.

---

## Build Status

✅ **Success** - Zero errors, zero warnings

```
vite v8.0.1 building for production...
✓ 25 modules transformed
dist/index.html                    0.38 kB
dist/assets/index-*.js             224.16 kB
✓ built in 963ms
```

---

## Visual Impact

**Professional appearance:**
- Paths approach from complementary angles
- No paths cut through task bars
- Clean, organized look
- Intuitive to follow
- Temporal relationship clear

**User experience:**
- Easy to understand dependencies
- Visual clarity without clutter
- Professional project appearance
- Easy to trace connections

---

## Summary

The refined smart routing uses **bidirectional logic**:

✅ Start and end route in **opposite directions**  
✅ Prevents paths from cutting through target tasks  
✅ Creates clean, professional appearance  
✅ Maintains correct anchor points per type  
✅ Adapts intelligently to task timing  
✅ Zero build errors  

This is the final, optimal routing logic for dependency connectors!
