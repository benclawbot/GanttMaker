/**
 * Task Manager Context
 * 
 * React Context for managing task and dependency state across the application.
 * Provides a centralized store for project data.
 */

import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
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
  | { type: 'RESET_PROJECT' };

// ============================================================================
// Initial State
// ============================================================================

const initialState: ProjectState = {
  id: crypto.randomUUID(),
  name: 'Untitled Project',
  tasks: [],
  links: [],
  isDirty: false,
  fileHandle: null,
};

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
      return { ...initialState, id: crypto.randomUUID() };
    
    default:
      return state;
  }
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
  const [state, dispatch] = useReducer(projectReducer, {
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