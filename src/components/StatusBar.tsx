import React from 'react';
import { useProject } from '../store/projectStore';
import { format } from 'date-fns';

export function StatusBar() {
  const { project, selection } = useProject();

  const selectedTasks = project.tasks.filter((t) => selection.has(t.id));
  const totalTasks = project.tasks.filter((t) => t.type !== 'summary').length;
  const completedTasks = project.tasks.filter((t) => t.type !== 'summary' && t.progress === 100).length;
  const avgProgress = totalTasks > 0
    ? Math.round(project.tasks.filter(t => t.type !== 'summary').reduce((a, t) => a + t.progress, 0) / Math.max(1, totalTasks))
    : 0;

  const projectEnd = project.tasks.reduce((maxDate, t) => {
    return t.endDate > maxDate ? t.endDate : maxDate;
  }, project.startDate);

  return (
    <div className="flex items-center gap-4 px-4 py-1 bg-[#f0f0f0] border-t border-gray-300 text-[11px] text-gray-600 select-none">
      {/* New/Modified */}
      <div className="flex items-center gap-1">
        {project.fileType === 'new' ? (
          <span>New Project</span>
        ) : (
          <span>
            {project.fileType === 'gan' ? '📄 .gan' : project.fileType === 'mpp' ? '📊 .mpp' : project.fileType === 'xml' ? '📄 .xml' : '📁 Project'}
          </span>
        )}
        {project.isDirty && <span className="text-amber-600 font-medium">● Modified</span>}
      </div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Task Count */}
      <div>Tasks: {totalTasks} total, {completedTasks} complete</div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Overall Progress */}
      <div className="flex items-center gap-1.5">
        <span>Progress:</span>
        <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
        <span className="font-medium">{avgProgress}%</span>
      </div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Dates */}
      <div>
        Start: {format(project.startDate, 'MM/dd/yyyy')}
        {' → '}
        End: {format(projectEnd, 'MM/dd/yyyy')}
      </div>

      {/* Selection info */}
      {selection.size > 0 && (
        <>
          <div className="w-px h-4 bg-gray-300" />
          <div className="text-blue-600 font-medium">
            {selection.size} task{selection.size !== 1 ? 's' : ''} selected
            {selectedTasks.length === 1 && ` — ${selectedTasks[0].name}`}
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* Resources */}
      <div>Resources: {project.resources.length}</div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Keyboard shortcuts hint */}
      <div className="text-gray-400">Del: delete • Tab: indent • Shift+Tab: outdent</div>
    </div>
  );
}

