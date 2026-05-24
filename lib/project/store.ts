// Single-user localStorage store for projects. The earlier multi-user
// keyspace (`spc:index:<userId>`) is gone now that Clerk has been
// removed; everything lives under a fixed 'local' bucket so the keys
// look the same regardless of whether auth comes back later.
//
//   spc:index:local       -> ProjectSummary[]   (cheap list for /projects)
//   spc:project:local:<id> -> Project           (full project body)
//
// All functions are no-ops when called server-side
// (typeof window === 'undefined') so they're safe to import from
// components that render in both environments.

import type { Project } from './types';
import { createSeedProject } from './seed';

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

const SCOPE = 'local';
const INDEX_KEY = `spc:index:${SCOPE}`;
const projectKey = (id: string) => `spc:project:${SCOPE}:${id}`;

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readIndex(): ProjectSummary[] {
  if (!hasStorage()) return [];
  const raw = window.localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(list: ProjectSummary[]): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export function listProjects(): ProjectSummary[] {
  // Sort by most-recently-updated so the list reads as a recency feed.
  return [...readIndex()].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  );
}

export function getProject(id: string): Project | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(projectKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function saveProject(project: Project): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(projectKey(project.id), JSON.stringify(project));
  const list = readIndex();
  const updatedAt = new Date().toISOString();
  const existing = list.findIndex((p) => p.id === project.id);
  const summary: ProjectSummary = { id: project.id, name: project.name, updatedAt };
  if (existing >= 0) list[existing] = summary;
  else list.push(summary);
  writeIndex(list);
}

export function deleteProject(id: string): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(projectKey(id));
  writeIndex(readIndex().filter((p) => p.id !== id));
}

export function createProject(name: string): Project {
  const seed = createSeedProject();
  // Replace seed identity so each created project gets a fresh id + name.
  const project: Project = { ...seed, id: cryptoId(), name: name.trim() || 'Untitled project' };
  saveProject(project);
  return project;
}

export function renameProject(id: string, name: string): void {
  const project = getProject(id);
  if (!project) return;
  saveProject({ ...project, name: name.trim() || project.name });
}

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
