/**
 * GAN File Serializer
 * 
 * Serializes internal ProjectData structure to GanttProject .gan XML format.
 * 
 * Output Format:
 * - XML-based format compatible with GanttProject
 * - UTF-8 encoded
 * - Follows GanttProject 3.x schema
 */

import type { ProjectData, Task, Link } from '../types';

/**
 * Serialize ProjectData to .gan XML format
 */
export function serializeGanFile(projectData: ProjectData): Blob {
  const xml = buildGanXml(projectData);
  return new Blob([xml], { type: 'application/x-ganttproject;charset=utf-8' });
}

/**
 * Build the complete .gan XML document
 */
function buildGanXml(projectData: ProjectData): string {
  const lines: string[] = [];
  
  // XML declaration and project start
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  
  const projectAttrs = [
    `name="${escapeXml(projectData.name)}"`,
    `company="${escapeXml(projectData.metadata?.company || '')}"`,
    `webLink=""`,
    `view-date="${formatDate(new Date())}"`,
    'view-index="0"',
    'gantt-divider-location="693"',
    'resource-divider-location="322"',
    `version="${projectData.metadata?.version || '3.3'}"`,
    `locale="${projectData.metadata?.locale || 'en'}"`,
  ];
  
  lines.push(`<project ${projectAttrs.join(' ')}>`);
  
  // Description
  lines.push('  <description/>');
  
  // Views (Gantt chart and resource table configuration)
  lines.push(...buildViewsSection());
  
  // Calendars
  lines.push(...buildCalendarsSection());
  
  // Tasks
  lines.push(...buildTasksSection(projectData.tasks, projectData.links));
  
  // Resources
  if (projectData.resources && projectData.resources.length > 0) {
    lines.push(...buildResourcesSection(projectData.resources));
  }
  
  // Allocations
  if (projectData.assignments && projectData.assignments.length > 0) {
    lines.push(...buildAllocationsSection(projectData.assignments));
  }
  
  // Previous (for upgrades)
  lines.push('  <previous/>');
  
  // Roles
  lines.push(...buildRolesSection());
  
  lines.push('</project>');
  
  return lines.join('\n');
}

/**
 * Build the views section
 */
function buildViewsSection(): string[] {
  return [
    '  <view zooming-state="default:6" id="gantt-chart">',
    '    <field id="tpd3" name="Name" width="257" order="0"/>',
    '    <field id="tpd4" name="Begin date" width="139" order="1"/>',
    '    <field id="tpd5" name="End date" width="130" order="2"/>',
    '    <field id="tpd12" name="Cost" width="63" order="3"/>',
    '    <field id="tpc0" name="Is done" width="88" order="4"/>',
    '    <option id="taskLabelRight" value="name"/>',
    '    <option id="taskLabelLeft" value=""/>',
    '    <option id="taskLabelTop" value=""/>',
    '    <option id="taskLabelBottom" value=""/>',
    '    <option id="showProgress" value="true"/>',
    '    <option id="showArrows" value="true"/>',
    '    <option id="showColors" value="true"/>',
    '    <option id="combineTasks" value="true"/>',
    '    <option id="showDeps" value="true"/>',
    '    <option id="color.recent"><![CDATA[#ff0066]]></option>',
    '  </view>',
    '  <view id="resource-table">',
    '    <field id="0" name="Name" width="160" order="0"/>',
    '    <field id="1" name="Default role" width="158" order="1"/>',
    '  </view>',
  ];
}

/**
 * Build the calendars section
 */
function buildCalendarsSection(): string[] {
  return [
    '  <!-- -->',
    '  <calendars>',
    '    <day-types>',
    '      <day-type id="0"/>',
    '      <day-type id="1"/>',
    '      <default-week id="1" name="default" sun="1" mon="0" tue="0" wed="0" thu="0" fri="0" sat="1"/>',
    '      <only-show-weekends value="false"/>',
    '      <overriden-day-types/>',
    '      <days/>',
    '    </day-types>',
    '  </calendars>',
  ];
}

/**
 * Build the tasks section
 */
function buildTasksSection(tasks: Task[], links: Link[]): string[] {
  const lines: string[] = ['  <tasks empty-milestones="true">'];
  
  // Task properties (custom fields definition)
  lines.push('    <taskproperties>');
  lines.push('      <taskproperty id="tpd0" name="type" type="default" valuetype="icon"/>');
  lines.push('      <taskproperty id="tpd1" name="priority" type="default" valuetype="icon"/>');
  lines.push('      <taskproperty id="tpd2" name="info" type="default" valuetype="icon"/>');
  lines.push('      <taskproperty id="tpd3" name="name" type="default" valuetype="text"/>');
  lines.push('      <taskproperty id="tpd4" name="begindate" type="default" valuetype="date"/>');
  lines.push('      <taskproperty id="tpd5" name="enddate" type="default" valuetype="date"/>');
  lines.push('      <taskproperty id="tpd6" name="duration" type="default" valuetype="duration"/>');
  lines.push('      <taskproperty id="tpd7" name="completion" type="default" valuetype="percent"/>');
  lines.push('      <taskproperty id="tpd8" name="coordinator" type="default" valuetype="text"/>');
  lines.push('      <taskproperty id="tpd9" name="dependencies" type="default" valuetype="relation"/>');
  lines.push('      <taskproperty id="tpd10" name="ID" type="default" valuetype="icon"/>');
  lines.push('      <taskproperty id="tpd12" name="cost" type="default" valuetype="currency"/>');
  lines.push('      <taskproperty id="tpd13" name="est.start" type="default" valuetype="date"/>');
  lines.push('      <taskproperty id="tpd14" name="color" type="default" valuetype="color"/>');
  lines.push('      <taskproperty id="tpc0" name="Is done" type="default" valuetype="boolean"/>');
  lines.push('    </taskproperties>');
  
  // Separate root tasks from child tasks
  const rootTasks = tasks.filter(t => !t.parentId);
  
  // Build task elements
  rootTasks.forEach(task => {
    lines.push(...buildTaskElement(task, tasks, links, 1));
  });
  
  lines.push('  </tasks>');
  return lines;
}

/**
 * Build a single task element and its children recursively
 */
function buildTaskElement(
  task: Task, 
  allTasks: Task[], 
  links: Link[], 
  indent: number
): string[] {
  const indentStr = '    '.repeat(indent);
  const lines: string[] = [];
  
  // Calculate duration in days
  const durationMs = task.duration || calculateDuration(task.start, task.end);
  const durationDays = Math.round(durationMs / (24 * 60 * 60 * 1000));
  
  // Determine task attributes
  const attrs: string[] = [
    `id="${task.id}"`,
    `name="${escapeXml(task.text)}"`,
    `start="${formatDate(task.start)}"`,
    `duration="${durationDays}"`,
    `complete="${task.progress || 0}"`,
  ];
  
  // Add type-specific attributes
  if (task.type === 'milestone') {
    attrs.push('meeting="false"');
  } else if (task.customFields?.['meeting'] === 'true') {
    attrs.push('meeting="true"');
  }
  
  // Add color if specified
  if (task.customFields?.['color']) {
    attrs.push(`color="${task.customFields['color']}"`);
  }
  
  // Add expand attribute for parent tasks
  const children = allTasks.filter(t => t.parentId === task.id);
  if (children.length > 0) {
    attrs.push('expand="true"');
  }
  
  lines.push(`${indentStr}<task ${attrs.join(' ')}>`);
  
  // Add notes if present
  if (task.notes) {
    lines.push(`${indentStr}  <notes><![CDATA[${task.notes}]]></notes>`);
  }
  
  // Add custom properties
  if (task.customFields) {
    Object.entries(task.customFields).forEach(([key, value]) => {
      if (key !== 'color' && key !== 'meeting') {
        lines.push(`${indentStr}  <customproperty taskproperty-id="${key}" value="${escapeXml(String(value))}"/>`);
      }
    });
  }
  
  // Add dependencies (only for leaf tasks at this level)
  const taskLinks = links.filter(l => String(l.target) === String(task.id));
  taskLinks.forEach(link => {
    const typeNum = dependencyTypeToNumber(link.type);
    const lagDays = link.lag ? Math.round((link.lag as number) / (24 * 60 * 60 * 1000)) : 0;
    lines.push(`${indentStr}  <depend id="${link.source}" type="${typeNum}" difference="${lagDays}" hardness="Normal"/>`);
  });
  
  // Add child tasks recursively
  children.forEach(child => {
    lines.push(...buildTaskElement(child, allTasks, links, indent + 1));
  });
  
  lines.push(`${indentStr}</task>`);
  
  return lines;
}

/**
 * Build the resources section
 */
function buildResourcesSection(resources: ProjectData['resources']): string[] {
  const lines: string[] = ['  <resources>'];
  
  resources?.forEach(resource => {
    const attrs = [
      `id="${resource.id}"`,
      `name="${escapeXml(resource.name as string)}"`,
    ];
    
    if (resource.role) {
      attrs.push(`function="${escapeXml(resource.role)}"`);
    }
    
    lines.push(`    <resource ${attrs.join(' ')}/>`);
  });
  
  lines.push('  </resources>');
  return lines;
}

/**
 * Build the allocations section
 */
function buildAllocationsSection(assignments: ProjectData['assignments']): string[] {
  const lines: string[] = ['  <allocations>'];
  
  assignments?.forEach(assignment => {
    const load = assignment.units !== undefined ? assignment.units * 100 : 100;
    lines.push(`    <allocation task-id="${assignment.taskId}" resource-id="${assignment.resourceId}" function="1" responsible="true" load="${load}"/>`);
  });
  
  lines.push('  </allocations>');
  return lines;
}

/**
 * Build the roles section
 */
function buildRolesSection(): string[] {
  return [
    '  <roles roleset-name="Default"/>',
    '  <roles>',
    '    <role id="0" name="Architect"/>',
    '    <role id="1" name="Developer"/>',
    '    <role id="2" name="Tester"/>',
    '    <role id="3" name="Manager"/>',
    '  </roles>',
  ];
}

/**
 * Convert dependency type string to GanttProject number
 */
function dependencyTypeToNumber(type?: string): number {
  switch (type) {
    case 'fs': return 0; // Finish-to-Start
    case 'ss': return 1; // Start-to-Start
    case 'ff': return 2; // Finish-to-Finish
    case 'sf': return 3; // Start-to-Finish
    default: return 0;
  }
}

/**
 * Calculate duration between two dates in milliseconds
 */
function calculateDuration(start: Date, end: Date): number {
  return Math.max(0, end.getTime() - start.getTime());
}

/**
 * Format date for GanttProject format (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}