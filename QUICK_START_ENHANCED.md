# GanttMaker Enhanced Features - Quick Start

## 🎯 What's New?

Your GanttMaker now displays dependencies exactly like your reference diagram with three major enhancements:

### 1. **Progress Percentages** 📊
Each task bar now shows its completion percentage to the right:
```
[████████░░░░] 85%
```
- Shows 0-100% for all tasks
- Updates in real-time as progress changes
- Positioned outside the task bar for clarity

### 2. **Orthogonal Connectors** ➡️
Dependency connections use clean right-angle routing instead of diagonal curves:
```
Before: Task1 ╲       After:  Task1 │
              ╲                   ├─┐
            Task2              Task2 │
```
Benefits:
- Cleaner, more professional appearance
- Easier to follow dependency flow
- Matches standard project management visualizations

### 3. **Junction Boxes** 🔲
Small boxes appear at connector corners:
```
        Task1
         │
        [■]  ← Junction box
         │
        Task2
```
- Visual reference points for path routing
- Shows where dependencies turn
- Color-coded to match dependency lines

---

## 📁 Opening Your First Project

### Option 1: Use Sample Project
```
1. Launch GanttMaker
2. Click "Open File" or File → Open
3. Select "sample.gan"
4. See 11 tasks with dependencies already configured
```

### Option 2: Create New Project
```
1. Click "New Project" or File → New
2. Add tasks with dates
3. Drag from task handles to create dependencies
4. Progress percentages appear automatically
```

---

## 🎮 How to Use

### View Progress Percentages
- Open any project
- Look to the right of each task bar
- You'll see: `100%`, `85%`, `63%`, `0%`, etc.
- Percentage updates immediately with progress

### Create Dependencies
```
1. Hover over a task bar
2. Small circles (●) appear at start and end
3. Drag from one task's handle to another
4. Connection appears with junction box
5. Progress percentages still visible
```

### Select & Edit Dependencies
```
1. Click on any dependency line
2. Line becomes solid (instead of dashed)
3. Junction boxes become more visible
4. Press Delete to remove
5. Or drag new connections over it
```

### Understand Dependency Types
- **FS** (Finish→Start): Source must finish before target starts
- **SS** (Start→Start): Source and target start together
- **FF** (Finish→Finish): Source and target finish together
- **SF** (Start→Finish): Source start triggers target finish

---

## 🎨 Visual Elements Explained

### Task Bar Components
```
[████████░░░░░░░] 85%
 │      │       │   │
 │      │       │   └─ Progress percentage
 │      │       └───── Unfilled portion
 │      └────────────── Filled portion (progress)
 └───────────────────── Task bar
```

### Dependency Line
```
Task1 ●───┐
        [■] ← Junction box (corner)
        │
        ●─── Task2
        └─ Arrow marker (target)
```

### Color Coding
- **Gray**: Unselected dependencies
- **Light Blue**: Connected to selected task
- **Bright Blue**: Selected dependency
- **Yellow**: Milestones
- **Purple**: Project/summary tasks

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Click` | Select task or dependency |
| `Ctrl+Click` | Multi-select (toggle) |
| `Shift+Click` | Range select |
| `Escape` | Deselect all |
| `Delete` | Remove selected items |
| `Ctrl+N` | New project |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save file |

---

## 📊 Sample Project Structure

The included `sample.gan` demonstrates a complete project flow:

```
Master Task (100%)
│
├─→ Phase 1: Planning (100%)
│   │
│   └─→ Phase 2: Design (85%)
│       │
│       ├─→ Architecture Design (100%)
│       │
│       └─→ UI/UX Design (63%)
│           │
│           └─→ Development Prep (0%)
│               │
│               └─→ Phase 3: Development (100%)
│                   │
│                   ├─→ Frontend Dev (100%)
│                   │
│                   └─→ Backend Dev (100%)
│                       │
│                       └─→ Phase 4: Testing (85%)
│                           │
│                           └─→ Project Complete (0%)
```

**Total**: 11 tasks, 10 dependencies, showing realistic progression

---

## 🔍 Tips & Tricks

### 1. **Percentage Alignment**
- Percentages appear to the right of bars
- They don't overlap with dependency lines
- Makes it easy to read both at once

### 2. **Following Dependencies**
- Start at 100% tasks (completed)
- Follow orthogonal connectors down
- Look for junction boxes at turns
- End at 0% or in-progress tasks

### 3. **Identifying Critical Path**
- Tasks at 0% are upcoming
- Tasks at 0-50% are in progress
- Tasks at 100% are complete
- Follow the flow to see project timeline

### 4. **Working with Complex Diagrams**
- Click dependencies to highlight them
- Hover over task handles to see snap points
- Use Escape key to reset if needed
- Scroll horizontally for wider timelines

---

## 🐛 Troubleshooting

### Percentages Not Showing?
```
1. Open your .gan file
2. Check that each task has a "complete" attribute
3. If missing, you can add: complete="0" (or 0-100)
4. Re-open the file
```

### Dependencies Look Odd?
```
1. This might be a zoom/resolution issue
2. Try zooming in on the browser (Ctrl + or Cmd +)
3. Or resize your window larger
4. Dependencies should appear with right angles
```

### Can't Create Dependency?
```
1. Hover over a task bar
2. Look for small circles (●) at start and end
3. If not visible, task might be a milestone
4. Try dragging from/to a regular task instead
```

---

## 📈 Common Workflows

### Creating a New Project
```
1. Click "New Project"
2. Add first task with start/end dates
3. Add more tasks below it
4. Drag to create dependencies
5. Watch percentages appear (default 0%)
6. Edit progress as work continues
7. Save as .gan file
```

### Updating Progress
```
1. Open your project
2. Find task with percentage you want to change
3. Right-click task (if available) to edit
4. Or manually edit percentage in .gan file
5. Percentage updates in visualization immediately
```

### Sharing Your Diagram
```
1. Save your project as sample.gan or yourname.gan
2. Send the .gan file to others
3. They can open it in GanttMaker
4. All percentages, dependencies, dates preserved
```

---

## 🎓 Understanding the Diagram Better

### Left Side (Task Names)
Shows what each task is with proper hierarchy and nesting

### Right Side (Timeline)
Shows when each task occurs with start/end dates

### Dependency Lines
Show which tasks must complete before others can start

### Percentages
Show how complete each task is (0% = not started, 100% = done)

### Junction Boxes
Help your eye follow complex dependency paths around corners

---

## 💡 Best Practices

### 1. Keep Percentages Current
- Update regularly (daily or weekly)
- Helps spot delays early
- Makes projections more accurate

### 2. Follow Dependency Types
- Use FS (Finish-Start) for most normal sequences
- Use SS (Start-Start) for parallel tasks
- Avoid circular dependencies (app prevents them)

### 3. Organize Task Hierarchy
- Group related tasks under parent tasks
- Use projects for major phases
- Use milestones for completion markers

### 4. Review Dependencies Regularly
- Follow the percentage and date flow
- Identify bottlenecks (tasks at 0%)
- Adjust timeline as needed

---

## 🚀 Next Steps

### Short Term
- [x] Load sample.gan
- [x] Review the diagram layout
- [x] Understand percentage display
- [x] Try creating a new dependency

### Medium Term
- [ ] Create your own project
- [ ] Add 5-10 tasks with dependencies
- [ ] Update progress percentages
- [ ] Track project status

### Long Term
- [ ] Export project as image (coming soon)
- [ ] Add resource allocation
- [ ] Track multiple projects
- [ ] Generate reports

---

## 📞 Need Help?

### Common Questions

**Q: Why are some percentages at 0%?**
A: Those are upcoming tasks that haven't started yet. As work progresses, update the percentage.

**Q: Can I change the colors?**
A: Not in the UI yet, but you can edit the .gan file directly or this feature coming soon.

**Q: How do I make tasks appear side-by-side?**
A: Use Start-Start (SS) dependencies instead of Finish-Start (FS) dependencies.

**Q: Can I export as PDF or image?**
A: Not yet, but you can take a screenshot or this feature is planned.

---

## ✨ Summary

GanttMaker now shows your project with:
- ✅ Crystal clear orthogonal dependency paths
- ✅ Progress percentages on every task
- ✅ Junction boxes showing path routing
- ✅ Professional project management appearance
- ✅ Easy-to-follow timeline visualization

Start by opening `sample.gan` to see it in action!

---

**Version**: GanttMaker 1.0.0 Enhanced  
**Last Updated**: 2024  
**Status**: Ready to Use ✅
