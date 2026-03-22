# Dependency Connector Types - Visual Guide

## Quick Reference

This guide explains how each of the 4 dependency types works in the connector implementation.

---

## 1. FS (Finish-to-Start) - Most Common

**Definition:** Source task must FINISH before target task can START

**Anchor Points:**
- Source: RIGHT edge of source task bar
- Target: LEFT edge of target task bar

**Visual Pattern:**
```
Timeline ────────────────────────────────────────────
         
Task A   [████████████]  ← Finish here
                 ↘
                  └──► [████████████] Task B ← Start here
                  
         (Optional gap between end of A and start of B)
```

**Example Use Cases:**
- Phase 1 Planning → Phase 2 Design
- Frontend Development → Testing
- Architecture Design → Development Start

**In Code:**
```typescript
case 'fs':
  startX = sourcePixels.right;  // Task A's right edge
  endX = targetPixels.left;     // Task B's left edge
```

---

## 2. SS (Start-to-Start) - Parallel Work

**Definition:** Source task must START, then target task can START
(Typically work happens in parallel)

**Anchor Points:**
- Source: LEFT edge of source task bar
- Target: LEFT edge of target task bar

**Visual Pattern:**
```
Timeline ────────────────────────────────────────────

Task A   [████████████]  ← Start here
         ↓
         └──► [████████████] Task B ← Start here
         
         (Both can progress in parallel)
```

**Example Use Cases:**
- Development starts → Testing can start (parallel work)
- Phase 1 starts → Phase 2 can start (overlapping phases)
- Sprint starts → Daily standups can start

**In Code:**
```typescript
case 'ss':
  startX = sourcePixels.left;   // Task A's left edge
  endX = targetPixels.left;     // Task B's left edge
```

---

## 3. FF (Finish-to-Finish) - Synchronized Completion

**Definition:** Source task must FINISH, then target task can FINISH
(Both tasks complete at the same time or source finishes first)

**Anchor Points:**
- Source: RIGHT edge of source task bar
- Target: RIGHT edge of target task bar

**Visual Pattern:**
```
Timeline ────────────────────────────────────────────

Task A   [████████████]  ← Finish here
                      ↓
                      └──► [████████████] Task B ← Finish here
                      
                      (Both finish around the same time)
```

**Example Use Cases:**
- Code development → Code review (review completes when dev completes)
- Main module dev → Integration testing (both finish together)
- Feature development → Feature documentation (doc done when feature done)

**In Code:**
```typescript
case 'ff':
  startX = sourcePixels.right;  // Task A's right edge
  endX = targetPixels.right;    // Task B's right edge
```

---

## 4. SF (Start-to-Finish) - Reverse Dependency

**Definition:** Source task must START before target task can FINISH
(Uncommon, reverse dependency)

**Anchor Points:**
- Source: LEFT edge of source task bar
- Target: RIGHT edge of target task bar

**Visual Pattern:**
```
Timeline ────────────────────────────────────────────

Task A   [████████████]  ← Start here
         ↓
         └──► [████████████] Task B ← Finish here
         
         (A must start before B can finish)
```

**Example Use Cases:**
- QA sign-off starts → Release can finish
- Approval process starts → Deployment can complete
- Security review starts → Product launch can finish

**In Code:**
```typescript
case 'sf':
  startX = sourcePixels.left;   // Task A's left edge
  endX = targetPixels.right;    // Task B's right edge
```

---

## Routing Direction - LEFT (Backward)

All connector types route to the **LEFT** (backwards in timeline):

```
Timeline: ────────────────────────────────────────────
                    ↑
                    │ routing direction (LEFT = backward)
                    │
Task A   [████]     │      [████] Task B
           └────────┘

Connector leaves right edge of A,
routes LEFT and backward,
arrives at left edge of B.

The routing point is always:
routingX = min(startX, endX) - 80px
```

This creates clean, organized connectors that don't overlap with task bars.

---

## Comparison Table

| Type | Source Point | Target Point | Direction | Use Case |
|------|-------------|-------------|-----------|----------|
| **FS** | Right | Left | Sequential | Task B starts when A finishes |
| **SS** | Left | Left | Parallel Start | Task B starts when A starts |
| **FF** | Right | Right | Parallel Finish | Task B finishes when A finishes |
| **SF** | Left | Right | Reverse | Task B finishes when A starts |

---

## Real-World Example: Software Development Project

```
Timeline: Jan   Feb   Mar   Apr   May
          ├─────┼─────┼─────┼─────┤

Planning  [███]
Planning completes Jan 15 ↓
           ├──────→ Design [██████]  (FS: Design starts after Planning)
Design starts Feb 1 ↓
           ├──────→ Dev [████████]   (SS: Dev can start when Design starts)
Dev starts Feb 1 ↓
           ├──────→ Test [████████]  (SS: Testing starts when Dev starts)
Dev finishes Apr 15 ↓
                        └────→ Doc [███]  (FF: Docs finish when Dev finishes)
Test finishes Apr 30 ↓
                             └──→ Release [█]  (FS: Release after Testing)
```

---

## Technical Implementation Details

### Anchor Point Calculation

The `calculatePath` function determines anchor points dynamically:

```typescript
switch (dependencyType) {
  case 'fs': // Finish-to-Start
    startX = sourcePixels.right;  // Source finishes here
    endX = targetPixels.left;     // Target starts here
    break;
    
  case 'ss': // Start-to-Start
    startX = sourcePixels.left;   // Source starts here
    endX = targetPixels.left;     // Target starts here (aligned)
    break;
    
  case 'ff': // Finish-to-Finish
    startX = sourcePixels.right;  // Source finishes here
    endX = targetPixels.right;    // Target finishes here (aligned)
    break;
    
  case 'sf': // Start-to-Finish
    startX = sourcePixels.left;   // Source starts here
    endX = targetPixels.right;    // Target finishes here
    break;
}
```

### Path Generation

All types use the same orthogonal (right-angle) path structure:

```
M  {startX} {startY}        ← Move to source anchor point
L  {routingX} {startY}      ← Line left (backward) to routing position
L  {routingX} {endY}        ← Line down/up to target row
L  {endX} {endY}            ← Line right to target anchor point
```

Where:
- `routingX = min(startX, endX) - 80` (route backwards, outside both tasks)
- `startY = sourceIndex * ROW_HEIGHT + ROW_HEIGHT/2` (center of row)
- `endY = targetIndex * ROW_HEIGHT + ROW_HEIGHT/2` (center of row)

---

## Visual Elements

### Connection Points
- Small **circles** (r=4) at source and target anchor points
- Color matches connector type (blue shades)
- Always visible and attached to task bars

### Connector Line
- Solid line (not dashed)
- 2-3px stroke width (3px when selected)
- Blue color: #3b82f6 (darker when selected: #1e40af)
- Arrow marker at the target end

### Selection Highlight
- Glow effect (light blue) appears when connector is selected
- Endpoint circles become more prominent
- Stroke width increases

---

## Debugging Tips

If a connector doesn't look right:

1. **Check the Type**: Verify correct relationship type in task dependencies
2. **Check Bar Positions**: Ensure both tasks are visible and rendered
3. **Check Anchor Points**: Look for circles at correct edges:
   - FS: Right-to-Left
   - SS: Left-to-Left
   - FF: Right-to-Right
   - SF: Left-to-Right
4. **Check Routing**: Path should go LEFT (backward), never RIGHT
5. **Check for Floating**: All endpoints must touch task bars, not float

---

## Summary

- **4 Types**: FS, SS, FF, SF (each with specific meaning)
- **Type-Specific Anchors**: Attachment points depend on relationship semantics
- **Orthogonal Routing**: Right-angle paths for clarity
- **LEFT Direction**: Routes backward in timeline
- **Clean Visuals**: Circles at anchors, solid lines, arrow markers
