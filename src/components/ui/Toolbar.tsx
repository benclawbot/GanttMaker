/**
 * Toolbar Component
 * 
 * Main toolbar for file operations and common actions.
 */

import React from 'react';

export interface ToolbarProps {
  onNewProject: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onExport?: () => void;
  canSave: boolean;
  projectName?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onNewProject,
  onOpenFile,
  onSaveFile,
  onExport,
  canSave,
  projectName = 'Untitled Project',
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b border-gray-200">
      {/* Logo/Title */}
      <div className="flex items-center gap-2 mr-4">
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <span className="font-semibold text-gray-800">{projectName}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* File Operations */}
      <ToolbarButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
        label="New"
        onClick={onNewProject}
        title="Create new project (Ctrl+N)"
      />

      <ToolbarButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
            />
          </svg>
        }
        label="Open"
        onClick={onOpenFile}
        title="Open .gan file (Ctrl+O)"
      />

      <ToolbarButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
        }
        label="Save"
        onClick={onSaveFile}
        disabled={!canSave}
        title="Save project (Ctrl+S)"
      />

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Undo/Redo */}
      <ToolbarButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        }
        label="Undo"
        onClick={onUndo || (() => {})}
        disabled={!canUndo || !onUndo}
        title="Undo (Ctrl+Z)"
      />

      <ToolbarButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
            />
          </svg>
        }
        label="Redo"
        onClick={onRedo || (() => {})}
        disabled={!canRedo || !onRedo}
        title="Redo (Ctrl+Y)"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export */}
      {onExport && (
        <ToolbarButton
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          }
          label="Export"
          onClick={onExport}
          title="Export project"
        />
      )}
    </div>
  );
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  title,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
        transition-colors duration-150
        ${
          disabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default Toolbar;