/**
 * GanttProject .gan File Exporter
 * Converts our internal Project to .gan XML format
 */

import type { Project, Task, Dependency, Resource } from '../types';
import { DependencyType } from '../types';
import { format } from 'date-fns';

function depTypeToGan(type: DependencyType): string {
  switch (type) {
    case DependencyType.SS: return '0';
    case DependencyType.SF: return '1';
    case DependencyType.FS: return '2';
    case DependencyType.FF: return '3';
    default: return '2';
  }
}

function formatGanDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderTasks(tasks: Task[], parentId: string | undefined, deps: Dependency[]): string {
  const children = tasks.filter((t) => t.parentId === parentId);
  let xml = '';

  children.forEach((task) => {
    const taskDeps = deps.filter((d) => d.fromTaskId === task.id);
    const depXml = taskDeps.map((d) =>
      `      <depend id="${escapeXml(d.toTaskId)}" type="${depTypeToGan(d.type)}" difference="${d.lag}" hardness="Strong"/>`
    ).join('\n');

    const hasChildren = tasks.some((t) => t.parentId === task.id);
    const childXml = hasChildren ? renderTasks(tasks, task.id, deps) : '';

    xml += `    <task id="${escapeXml(task.id)}" name="${escapeXml(task.name)}" ` +
      `color="${task.color || '#8cb6ce'}" ` +
      `meeting="${task.isMilestone ? 'true' : 'false'}" ` +
      `start="${formatGanDate(task.startDate)}" ` +
      `duration="${task.duration}" ` +
      `complete="${task.progress}" ` +
      `expand="true">\n`;

    if (depXml) xml += depXml + '\n';
    if (task.notes) xml += `      <notes><![CDATA[${task.notes}]]></notes>\n`;
    if (childXml) xml += childXml;

    xml += `    </task>\n`;
  });

  return xml;
}

export function exportToGan(project: Project): string {
  const projectStart = formatGanDate(project.startDate);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<project name="${escapeXml(project.name)}" company="${escapeXml(project.company || '')}" `;
  xml += `webLink="" view-date="${projectStart}" view-index="0" `;
  xml += `gantt-divider-location="374" resource-divider-location="322" `;
  xml += `version="3.3" locale="en">\n`;

  // Description
  xml += `  <description/>\n`;

  // View
  xml += `  <view zooming-state="default:6" id="gantt-chart"/>\n`;
  xml += `  <view id="resource-table"/>\n`;

  // Calendars
  xml += `  <calendars>\n`;
  xml += `    <day-types>\n`;
  xml += `      <day-type id="0"/>\n`;
  xml += `      <day-type id="1"/>\n`;
  xml += `      <default-week id="1" name="default" sun="1" mon="0" tue="0" wed="0" thu="0" fri="0" sat="1"/>\n`;
  xml += `      <only-show-weekdays value="false"/>\n`;
  xml += `    </day-types>\n`;
  xml += `  </calendars>\n`;

  // Tasks section
  xml += `  <tasks empty-milestones="true">\n`;
  xml += renderTasks(project.tasks, undefined, project.dependencies);
  xml += `  </tasks>\n`;

  // Resources
  xml += `  <resources>\n`;
  project.resources.forEach((r) => {
    xml += `    <resource id="${escapeXml(r.id)}" name="${escapeXml(r.name)}" `;
    xml += `function="Default:0" contacts="" phone=""/>\n`;
  });
  xml += `  </resources>\n`;

  // Allocations
  xml += `  <allocations>\n`;
  project.assignments.forEach((a) => {
    xml += `    <allocation task-id="${escapeXml(a.taskId)}" `;
    xml += `resource-id="${escapeXml(a.resourceId)}" `;
    xml += `function="Default:0" responsible="false" `;
    xml += `load="${a.units}"/>\n`;
  });
  xml += `  </allocations>\n`;

  xml += `</project>\n`;
  return xml;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCsv(project: Project): string {
  const headers = ['ID', 'WBS', 'Name', 'Type', 'Start', 'End', 'Duration', 'Progress', 'Priority', 'Resources', 'Notes'];
  const rows = [headers.join(',')];

  project.tasks.forEach((task) => {
    const resourceNames = task.resources
      .map((rid) => project.resources.find((r) => r.id === rid)?.name || rid)
      .join('; ');

    const row = [
      task.id,
      task.wbsCode || '',
      `"${task.name.replace(/"/g, '""')}"`,
      task.type,
      task.startDate.toLocaleDateString(),
      task.endDate.toLocaleDateString(),
      task.duration,
      task.progress,
      task.priority,
      `"${resourceNames}"`,
      `"${(task.notes || '').replace(/"/g, '""')}"`,
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}
