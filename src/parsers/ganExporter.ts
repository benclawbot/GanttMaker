/**
 * GanttProject .gan File Exporter
 * Converts our internal Project to .gan XML format.
 * Reference: GanttProject TaskSaver.kt and XmlSerializer.kt
 *
 * Key GAN format rules:
 * - Dates: YYYY-MM-DD
 * - Duration: in working days. GAN computes endDate = startDate + duration - 1.
 *   e.g. start=Jan 13, duration=5 → task spans Jan 13-17 (5 days).
 *   When exporting: duration = (endDate - startDate) + 1
 * - Milestones: always meeting="true" duration="0"
 * - Project tasks: project="true"
 */

import type { Project, Task, Dependency, Resource } from '../types';
import { DependencyType, TaskType } from '../types';
import { differenceInDays } from 'date-fns';

function depTypeToGan(type: DependencyType): string {
  switch (type) {
    case DependencyType.SS: return '0';
    case DependencyType.SF: return '1';
    case DependencyType.FS: return '2';
    case DependencyType.FF: return '3';
    default: return '2';
  }
}

function ganDepTypeToDep(type: string): DependencyType {
  switch (type) {
    case '0': return DependencyType.SS;
    case '1': return DependencyType.SF;
    case '2': return DependencyType.FS;
    case '3': return DependencyType.FF;
    default: return DependencyType.FS;
  }
}

function priorityToGan(priority: Task['priority']): string {
  switch (priority) {
    case 'Low': return '0';
    case 'Normal': return '1';
    case 'High': return '2';
    case 'Critical': return '3';
    default: return '1';
  }
}

function constraintToGanThirdDateConstraint(
  constraint: Task['customFields'] extends Record<string, infer V> ? V : never
): number | undefined {
  if (!constraint) return undefined;
  switch (constraint) {
    case 'FNET': return 0; // finish no earlier than
    case 'SNET': return 1; // start no earlier than
    case 'MSO':  return 2; // must start on
    case 'MFO':  return 3; // must finish on
    case 'FNLT': return 5; // finish no later
    default: return undefined;
  }
}

function formatGanDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeXml(str: string | undefined): string {
  if (!str) return '';
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

    const childTaskEls = tasks.filter((t) => t.parentId === task.id);
    const childXml = childTaskEls.length > 0 ? renderTasks(tasks, task.id, deps) : '';

    // Duration: GAN computes endDate = startDate + duration - 1.
    // So duration = (endDate - startDate) + 1.
    // Milestones always use duration=0.
    const dur = task.type === TaskType.Milestone
      ? 0
      : Math.max(1, differenceInDays(task.endDate, task.startDate) + 1);

    // Build attribute string conditionally (only include attributes with values)
    const attrs: string[] = [];
    attrs.push(`id="${escapeXml(task.id)}"`);
    if (task.uid) attrs.push(`uid="${escapeXml(task.uid)}"`);
    attrs.push(`name="${escapeXml(task.name)}"`);
    if (task.color) attrs.push(`color="${escapeXml(task.color)}"`);
    if (task.shape) attrs.push(`shape="${escapeXml(task.shape)}"`);
    // Milestone marker
    attrs.push(`meeting="${task.type === TaskType.Milestone ? 'true' : 'false'}"`);
    // Project task marker
    if (task.type === TaskType.Project) attrs.push(`project="true"`);
    attrs.push(`start="${formatGanDate(task.startDate)}"`);
    attrs.push(`duration="${dur}"`);
    attrs.push(`complete="${task.progress}"`);
    if (task.priority && task.priority !== 'Normal') {
      attrs.push(`priority="${priorityToGan(task.priority)}"`);
    }
    if (task.webLink) attrs.push(`webLink="${escapeXml(task.webLink)}"`);
    // expand: false when collapsed
    attrs.push(`expand="${task.isCollapsed ? 'false' : 'true'}"`);

    // thirdDate (baseline earliest start)
    const thirdDate = task.customFields?.thirdDate as Date | undefined;
    if (thirdDate) {
      attrs.push(`thirdDate="${formatGanDate(thirdDate)}"`);
      const c = constraintToGanThirdDateConstraint(task.customFields?.thirdDateConstraint as any);
      if (c !== undefined) attrs.push(`thirdDate-constraint="${c}"`);
    }

    // cost
    const cost = task.customFields?.cost as number | undefined;
    if (cost !== undefined) {
      attrs.push(`cost-manual-value="${cost}"`);
    }

    xml += `    <task ${attrs.join(' ')}>\n`;

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
  xml += `webLink="${escapeXml(project.webLink || '')}" view-date="${projectStart}" view-index="0" `;
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
      formatGanDate(task.startDate),
      formatGanDate(task.endDate),
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
