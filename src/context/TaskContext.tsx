/**
 * Task Manager Context
 * 
 * React Context for managing task and dependency state across the application.
 * Provides a centralized store for project data with undo/redo support.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import type { Task, Link } from '../modules/task-manager/types';

// ============================================================================
// Types
// ============================================================================

export interface ProjectState {
  id: string;
  name: string;
  tasks: Task[];
  links: Link[];
  isDirty: boolean;
  fileHandle: FileSystemFileHandle | null;
}

interface HistoryState extends ProjectState {
  past: ProjectSnapshot[];
  future: ProjectSnapshot[];
}

interface ProjectSnapshot {
  id: string;
  name: string;
  tasks: Task[];
  links: Link[];
}

type ProjectAction =
  | { type: 'SET_PROJECT'; payload: Partial<ProjectState> }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string | number; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string | number }
  | { type: 'SET_LINKS'; payload: Link[] }
  | { type: 'ADD_LINK'; payload: Link }
  | { type: 'DELETE_LINK'; payload: string | number }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_FILE_HANDLE'; payload: FileSystemFileHandle | null }
  | { type: 'RESET_PROJECT' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ============================================================================
// Initial State
// ============================================================================

const initialState: HistoryState = {
  id: crypto.randomUUID(),
  name: 'Untitled Project',
  tasks: [],
  links: [],
  isDirty: false,
  fileHandle: null,
  past: [],
  future: [],
};

// ============================================================================
// History Helpers
// ============================================================================

const MAX_HISTORY_SIZE = 10;

function createSnapshot(state: ProjectState): ProjectSnapshot {
  return {
    id: state.id,
    name: state.name,
    tasks: state.tasks,
    links: state.links,
  };
}

function statesEqual(a: ProjectSnapshot, b: ProjectSnapshot): boolean {
  if (a.id !== b.id) return false;
  if (a.name !== b.name) return false;
  if (a.tasks.length !== b.tasks.length) return false;
  if (a.links.length !== b.links.length) return false;
  
  for (let i = 0; i < a.tasks.length; i++) {
    if (a.tasks[i].id !== b.tasks[i].id) return false;
  }
  
  for (let i = 0; i < a.links.length; i++) {
    if (a.links[i].id !== b.links[i].id) return false;
  }
  
  return true;
}

function pushHistory(past: ProjectSnapshot[], snapshot: ProjectSnapshot): ProjectSnapshot[] {
  const newPast = [...past, snapshot];
  if (newPast.length > MAX_HISTORY_SIZE) {
    return newPast.slice(newPast.length - MAX_HISTORY_SIZE);
  }
  return newPast;
}

// ============================================================================
// Reducer
// ============================================================================

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, ...action.payload, isDirty: true };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, isDirty: true };
    
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload], isDirty: true };
    
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id
            ? { ...task, ...action.payload.updates, updatedAt: new Date() }
            : task
        ),
        isDirty: true,
      };
    
    case 'DELETE_TASK': {
      const taskId = action.payload;
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== taskId),
        links: state.links.filter(
          (link) => link.source !== taskId && link.target !== taskId
        ),
        isDirty: true,
      };
    }
    
    case 'SET_LINKS':
      return { ...state, links: action.payload, isDirty: true };
    
    case 'ADD_LINK':
      return { ...state, links: [...state.links, action.payload], isDirty: true };
    
    case 'DELETE_LINK':
      return {
        ...state,
        links: state.links.filter((link) => link.id !== action.payload),
        isDirty: true,
      };
    
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    
    case 'SET_FILE_HANDLE':
      return { ...state, fileHandle: action.payload };
    
    case 'RESET_PROJECT':
      return { 
        id: crypto.randomUUID(),
        name: 'Untitled Project',
        tasks: [],
        links: [],
        isDirty: false,
        fileHandle: null,
      };
    
    default:
      return state;
  }
}

// ============================================================================
// History Wrapper Reducer
// ============================================================================

function historyReducer(state: HistoryState, action: ProjectAction): HistoryState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    
    return {
      ...state,
      id: previous.id,
      name: previous.name,
      tasks: previous.tasks,
      links: previous.links,
      isDirty: true,
      past: newPast,
      future: [createSnapshot(state), ...state.future],
    };
  }
  
  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    
    return {
      ...state,
      id: next.id,
      name: next.name,
      tasks: next.tasks,
      links: next.links,
      isDirty: true,
      past: pushHistory(state.past, createSnapshot(state)),
      future: newFuture,
    };
  }
  
  const newProjectState = projectReducer(state, action);
  
  const skipHistoryActions = ['SET_DIRTY', 'SET_FILE_HANDLE', 'RESET_PROJECT', 'UNDO', 'REDO'];
  if (skipHistoryActions.includes(action.type)) {
    return { ...newProjectState, past: state.past, future: state.future };
  }
  
  const currentSnapshot = createSnapshot(state);
  const newSnapshot = createSnapshot(newProjectState);
  
  if (statesEqual(currentSnapshot, newSnapshot)) {
    return { ...newProjectState, past: state.past, future: state.future };
  }
  
  return {
    ...newProjectState,
    past: pushHistory(state.past, currentSnapshot),
    future: [],
  };
}

// ============================================================================
// Context
// ============================================================================

interface TaskContextValue {
  state: ProjectState;
  // Task operations
  addTask: (task: Omit<Task, 'id'>) => Task;
  updateTask: (id: string | number, updates: Partial<Task>) => void;
  deleteTask: (id: string | number) => void;
  getTask: (id: string | number) => Task | undefined;
  // Link operations
  addLink: (link: Omit<Link, 'id'>) => Link;
  deleteLink: (id: string | number) => void;
  // Project operations
  setProjectName: (name: string) => void;
  setTasks: (tasks: Task[]) => void;
  setLinks: (links: Link[]) => void;
  markDirty: (dirty: boolean) => void;
  setFileHandle: (handle: FileSystemFileHandle | null) => void;
  resetProject: () => void;
  loadProject: (data: { name: string; tasks: Task[]; links: Link[] }) => void;
  // Undo/Redo operations
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface TaskProviderProps {
  children: ReactNode;
  initialTasks?: Task[];
  initialLinks?: Link[];
  initialName?: string;
}

export function TaskProvider({
  children,
  initialTasks = [],
  initialLinks = [],
  initialName = 'Untitled Project',
}: TaskProviderProps) {
  const [state, dispatch] = useReducer(historyReducer, {
    ...initialState,
    name: initialName,
    tasks: initialTasks,
    links: initialLinks,
  });

  // Task operations
  const addTask = useCallback((taskData: Omit<Task, 'id'>): Task => {
    const id = crypto.randomUUID();
    const task: Task = { ...taskData, id, createdAt: new Date(), updatedAt: new Date() };
    dispatch({ type: 'ADD_TASK', payload: task });
    return task;
  }, []);

  const updateTask = useCallback((id: string | number, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
  }, []);

  const deleteTask = useCallback((id: string | number) => {
    dispatch({ type: 'DELETE_TASK', payload: id });
  }, []);

  const getTask = useCallback(
    (id: string | number): Task | undefined => {
      return state.tasks.find((task) => task.id === id);
    },
    [state.tasks]
  );

  // Link operations
  const addLink = useCallback((linkData: Omit<Link, 'id'>): Link => {
    // Check for existing link to prevent duplicates
    const exists = state.links.some(
      (l) =>
        l.source === linkData.source &&
        l.target === linkData.target &&
        l.type === linkData.type
    );
    if (exists) {
      throw new Error('Link already exists');
    }
    const id = crypto.randomUUID();
    const link: Link = { ...linkData, id };
    dispatch({ type: 'ADD_LINK', payload: link });
    return link;
  }, [state.links]);

  const deleteLink = useCallback((id: string | number) => {
    dispatch({ type: 'DELETE_LINK', payload: id });
  }, []);

  // Project operations
  const setProjectName = useCallback((name: string) => {
    dispatch({ type: 'SET_PROJECT', payload: { name } });
  }, []);

  const setTasks = useCallback((tasks: Task[]) => {
    dispatch({ type: 'SET_TASKS', payload: tasks });
  }, []);

  const setLinks = useCallback((links: Link[]) => {
    dispatch({ type: 'SET_LINKS', payload: links });
  }, []);

  const markDirty = useCallback((dirty: boolean) => {
    dispatch({ type: 'SET_DIRTY', payload: dirty });
  }, []);

  const setFileHandle = useCallback((handle: FileSystemFileHandle | null) => {
    dispatch({ type: 'SET_FILE_HANDLE', payload: handle });
  }, []);

  const resetProject = useCallback(() => {
    dispatch({ type: 'RESET_PROJECT' });
  }, []);

  const loadProject = useCallback(
    (data: { name: string; tasks: Task[]; links: Link[] }) => {
      dispatch({
        type: 'SET_PROJECT',
        payload: {
          name: data.name,
          tasks: data.tasks,
          links: data.links,
          isDirty: false,
        },
      });
    },
    []
  );

  // Undo/Redo operations
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  // Keyboard event listener for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputElement = 
        e.target instanceof HTMLElement && 
        (e.target.tagName === 'INPUT' || 
         e.target.tagName === 'TEXTAREA' || 
         e.target.isContentEditable);
      
      if (isInputElement) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      
      if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const value: TaskContextValue = {
    state,
    addTask,
    updateTask,
    deleteTask,
    getTask,
    addLink,
    deleteLink,
    setProjectName,
    setTasks,
    setLinks,
    markDirty,
    setFileHandle,
    resetProject,
    loadProject,
    canUndo,
    canRedo,
    undo,
    redo,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTaskManager(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskManager must be used within a TaskProvider');
  }
  return context;
}

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export function useTask(id: string | number): Task | undefined {
  const { getTask } = useTaskManager();
  return getTask(id);
}

export function useTasks(): Task[] {
  const { state } = useTaskManager();
  return state.tasks;
}

export function useLinks(): Link[] {
  const { state } = useTaskManager();
  return state.links;
}

export function useProjectName(): string {
  const { state } = useTaskManager();
  return state.name;
}

export function useIsDirty(): boolean {
  const { state } = useTaskManager();
  return state.isDirty;
}