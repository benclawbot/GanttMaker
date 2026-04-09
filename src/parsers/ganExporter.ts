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

function formatMspDate(date: Date): string {
  return format(date, "yyyy-MM-dd'T'00:00:00");
}

function toMspDuration(days: number): string {
  const safeDays = Math.max(0, days);
  return `PT${safeDays * 8}H0M0S`;
}

function escapeXmlText(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function exportToMspXml(project: Project): string {
  const tasks = [...project.tasks].sort((a, b) => a.order - b.order);
  const resources = [...project.resources];
  const assignments = [...project.assignments];

  const idMap = new Map<string, number>();
  tasks.forEach((task, idx) => idMap.set(task.id, idx + 1));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<Project xmlns="http://schemas.microsoft.com/project">\n`;
  xml += `  <Name>${escapeXmlText(project.name)}</Name>\n`;
  xml += `  <StartDate>${formatMspDate(project.startDate)}</StartDate>\n`;
  if (project.author) xml += `  <Author>${escapeXmlText(project.author)}</Author>\n`;
  if (project.company) xml += `  <Company>${escapeXmlText(project.company)}</Company>\n`;
  if (project.currency) xml += `  <CurrencySymbol>${escapeXmlText(project.currency)}</CurrencySymbol>\n`;

  xml += `  <Tasks>\n`;
  xml += `    <Task>\n`;
  xml += `      <UID>0</UID>\n`;
  xml += `      <ID>0</ID>\n`;
  xml += `      <Name>${escapeXmlText(project.name)}</Name>\n`;
  xml += `      <Summary>1</Summary>\n`;
  xml += `    </Task>\n`;

  tasks.forEach((task, idx) => {
    const uid = idMap.get(task.id)!;
    const parentOutline = task.parentId ? tasks.find((t) => t.id === task.parentId)?.wbsCode : undefined;
    const outline = task.wbsCode || (parentOutline ? `${parentOutline}.${idx + 1}` : `${idx + 1}`);
    const priority = task.priority === 'Critical' ? 900 : task.priority === 'High' ? 700 : task.priority === 'Low' ? 300 : 500;

    xml += `    <Task>\n`;
    xml += `      <UID>${uid}</UID>\n`;
    xml += `      <ID>${uid}</ID>\n`;
    xml += `      <Name>${escapeXmlText(task.name)}</Name>\n`;
    xml += `      <OutlineLevel>${task.level + 1}</OutlineLevel>\n`;
    xml += `      <OutlineNumber>${outline}</OutlineNumber>\n`;
    xml += `      <WBS>${outline}</WBS>\n`;
    xml += `      <Start>${formatMspDate(task.startDate)}</Start>\n`;
    xml += `      <Finish>${formatMspDate(task.endDate)}</Finish>\n`;
    xml += `      <Duration>${toMspDuration(task.duration)}</Duration>\n`;
    xml += `      <PercentComplete>${task.progress}</PercentComplete>\n`;
    xml += `      <Priority>${priority}</Priority>\n`;
    xml += `      <Summary>${task.type === 'summary' ? 1 : 0}</Summary>\n`;
    xml += `      <Milestone>${task.isMilestone || task.type === 'milestone' ? 1 : 0}</Milestone>\n`;
    xml += `      <Critical>${task.isCritical ? 1 : 0}</Critical>\n`;
    if (task.notes) xml += `      <Notes>${escapeXmlText(task.notes)}</Notes>\n`;

    const preds = project.dependencies.filter((d) => d.toTaskId === task.id);
    preds.forEach((dep) => {
      const predUid = idMap.get(dep.fromTaskId);
      if (!predUid) return;
      const depType = dep.type === DependencyType.FF ? 0 : dep.type === DependencyType.FS ? 1 : dep.type === DependencyType.SF ? 2 : 3;
      const linkLag = Math.round(dep.lag * 8 * 60);
      xml += `      <PredecessorLink>\n`;
      xml += `        <PredecessorUID>${predUid}</PredecessorUID>\n`;
      xml += `        <Type>${depType}</Type>\n`;
      xml += `        <LinkLag>${linkLag}</LinkLag>\n`;
      xml += `      </PredecessorLink>\n`;
    });

    xml += `    </Task>\n`;
  });
  xml += `  </Tasks>\n`;

  xml += `  <Resources>\n`;
  xml += `    <Resource><UID>0</UID><ID>0</ID><Name>Unassigned</Name></Resource>\n`;
  resources.forEach((res, idx) => {
    const uid = idx + 1;
    xml += `    <Resource>\n`;
    xml += `      <UID>${uid}</UID>\n`;
    xml += `      <ID>${uid}</ID>\n`;
    xml += `      <Name>${escapeXmlText(res.name)}</Name>\n`;
    xml += `      <Type>${res.type === 'Material' ? 1 : res.type === 'Cost' ? 2 : 0}</Type>\n`;
    if (res.email) xml += `      <EmailAddress>${escapeXmlText(res.email)}</EmailAddress>\n`;
    xml += `      <MaxUnits>${Math.max(0, (res.maxUnits || 100) / 100)}</MaxUnits>\n`;
    if (typeof res.standardRate === 'number') xml += `      <StandardRate>${res.standardRate}</StandardRate>\n`;
    xml += `    </Resource>\n`;
  });
  xml += `  </Resources>\n`;

  const resourceUidById = new Map<string, number>();
  resources.forEach((r, idx) => resourceUidById.set(r.id, idx + 1));

  xml += `  <Assignments>\n`;
  assignments.forEach((a, idx) => {
    const taskUid = idMap.get(a.taskId);
    const resourceUid = resourceUidById.get(a.resourceId);
    if (!taskUid || !resourceUid) return;
    xml += `    <Assignment>\n`;
    xml += `      <UID>${idx + 1}</UID>\n`;
    xml += `      <TaskUID>${taskUid}</TaskUID>\n`;
    xml += `      <ResourceUID>${resourceUid}</ResourceUID>\n`;
    xml += `      <Units>${Math.max(0, (a.units || 100) / 100)}</Units>\n`;
    xml += `    </Assignment>\n`;
  });
  xml += `  </Assignments>\n`;

  xml += `</Project>\n`;
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

