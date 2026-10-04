import { generateId } from './utils';
import {
  getProjectsCollection,
  getMessagesCollection,
  getRequirementsCollection,
  getRevisionsCollection,
  getConflictsCollection,
  getTasksCollection,
  getDeliverablesCollection,
  getActivitiesCollection,
} from './mongodb/collections';
import {
  getDemoProject,
  getDemoMessages,
  getDemoRequirements,
  getDemoRevisions,
  getDemoConflicts,
  getDemoTasks,
  getDemoDeliverables,
  getDemoActivities,
  getSecondaryDemoBundle,
} from './demo/data';
import type {
  Project, Message, Requirement, Revision, Conflict,
  Task, Deliverable, Activity, TaskStatus,
} from '@/types';

// ============================================================
// In-memory store for demo / no-DB mode
// ============================================================
const mem: {
  projects: Project[];
  messages: Message[];
  requirements: Requirement[];
  revisions: Revision[];
  conflicts: Conflict[];
  tasks: Task[];
  deliverables: Deliverable[];
  activities: Activity[];
  initialized: boolean;
} = {
  projects: [],
  messages: [],
  requirements: [],
  revisions: [],
  conflicts: [],
  tasks: [],
  deliverables: [],
  activities: [],
  initialized: false,
};

function initMem() {
  if (mem.initialized) return;
  const secondary = getSecondaryDemoBundle();
  mem.projects = [getDemoProject(), secondary.project];
  mem.messages = [...getDemoMessages(), ...secondary.messages];
  mem.requirements = [...getDemoRequirements(), ...secondary.requirements];
  mem.revisions = [...getDemoRevisions(), ...secondary.revisions];
  mem.conflicts = [...getDemoConflicts(), ...secondary.conflicts];
  mem.tasks = [...getDemoTasks(), ...secondary.tasks];
  mem.deliverables = [...getDemoDeliverables(), ...secondary.deliverables];
  mem.activities = [...getDemoActivities(), ...secondary.activities];
  mem.initialized = true;
}

async function seedMongoIfEmpty(): Promise<void> {
  const col = await getProjectsCollection();
  if (!col) return;
  const count = await col.countDocuments();
  if (count > 0) return;

  const secondary = getSecondaryDemoBundle();
  await col.insertMany([getDemoProject(), secondary.project] as never[]);
  await (await getMessagesCollection())?.insertMany([...getDemoMessages(), ...secondary.messages] as never[]);
  await (await getRequirementsCollection())?.insertMany([...getDemoRequirements(), ...secondary.requirements] as never[]);
  await (await getRevisionsCollection())?.insertMany([...getDemoRevisions(), ...secondary.revisions] as never[]);
  await (await getConflictsCollection())?.insertMany([...getDemoConflicts(), ...secondary.conflicts] as never[]);
  await (await getTasksCollection())?.insertMany([...getDemoTasks(), ...secondary.tasks] as never[]);
  await (await getDeliverablesCollection())?.insertMany([...getDemoDeliverables(), ...secondary.deliverables] as never[]);
  await (await getActivitiesCollection())?.insertMany([...getDemoActivities(), ...secondary.activities] as never[]);
}

// ============================================================
// Projects
// ============================================================
export async function getProjects(): Promise<Project[]> {
  const col = await getProjectsCollection();
  if (col) {
    await seedMongoIfEmpty();
    return col.find({}).sort({ updatedAt: -1 }).toArray() as unknown as Project[];
  }
  initMem();
  return [...mem.projects];
}

export async function getProject(id: string): Promise<Project | null> {
  const col = await getProjectsCollection();
  if (col) {
    return col.findOne({ id }) as unknown as Project | null;
  }
  initMem();
  return mem.projects.find((p) => p.id === id) || null;
}

export async function createProject(data: {
  name: string;
  clientName: string;
  description?: string;
  deadline?: string | null;
}): Promise<Project> {
  const project: Project = {
    id: generateId(),
    name: data.name,
    clientName: data.clientName,
    description: data.description || '',
    status: 'active',
    deadline: data.deadline || null,
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const col = await getProjectsCollection();
  if (col) {
    await col.insertOne(project as any);
  } else {
    initMem();
    mem.projects.push(project);
  }

  // Add activity
  await addActivity(project.id, 'project_created', `${project.name} project created`);

  return project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const col = await getProjectsCollection();
  if (col) {
    await col.updateOne({ id }, { $set: { ...data, updatedAt: new Date().toISOString() } });
  } else {
    initMem();
    const idx = mem.projects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      mem.projects[idx] = { ...mem.projects[idx], ...data, updatedAt: new Date().toISOString() };
    }
  }
}

// ============================================================
// Messages
// ============================================================
export async function getMessages(projectId: string): Promise<Message[]> {
  const col = await getMessagesCollection();
  if (col) {
    return col.find({ projectId }).sort({ index: 1 }).toArray() as unknown as Message[];
  }
  initMem();
  return mem.messages.filter((m) => m.projectId === projectId).sort((a, b) => a.index - b.index);
}

export async function addMessages(projectId: string, messages: Message[]): Promise<void> {
  const col = await getMessagesCollection();
  if (col) {
    await col.insertMany(messages as any[]);
  } else {
    initMem();
    mem.messages.push(...messages);
  }
}

// ============================================================
// Requirements
// ============================================================
export async function getRequirements(projectId: string): Promise<Requirement[]> {
  const col = await getRequirementsCollection();
  if (col) {
    return col.find({ projectId }).toArray() as unknown as Requirement[];
  }
  initMem();
  return mem.requirements.filter((r) => r.projectId === projectId);
}

export async function addRequirements(projectId: string, items: Omit<Requirement, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]): Promise<Requirement[]> {
  const now = new Date().toISOString();
  const requirements: Requirement[] = items.map((item) => ({
    ...item,
    id: generateId(),
    projectId,
    createdAt: now,
    updatedAt: now,
  }));

  const col = await getRequirementsCollection();
  if (col) {
    await col.insertMany(requirements as any[]);
  } else {
    initMem();
    mem.requirements.push(...requirements);
  }
  return requirements;
}

// ============================================================
// Revisions
// ============================================================
export async function getRevisions(projectId: string): Promise<Revision[]> {
  const col = await getRevisionsCollection();
  if (col) {
    return col.find({ projectId }).sort({ timestamp: 1 }).toArray() as unknown as Revision[];
  }
  initMem();
  return mem.revisions.filter((r) => r.projectId === projectId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function addRevisions(projectId: string, items: Omit<Revision, 'id' | 'projectId'>[]): Promise<Revision[]> {
  const revisions: Revision[] = items.map((item) => ({
    ...item,
    id: generateId(),
    projectId,
  }));

  const col = await getRevisionsCollection();
  if (col) {
    await col.insertMany(revisions as any[]);
  } else {
    initMem();
    mem.revisions.push(...revisions);
  }
  return revisions;
}

// ============================================================
// Conflicts
// ============================================================
export async function getConflicts(projectId: string): Promise<Conflict[]> {
  const col = await getConflictsCollection();
  if (col) {
    return col.find({ projectId }).toArray() as unknown as Conflict[];
  }
  initMem();
  return mem.conflicts.filter((c) => c.projectId === projectId);
}

export async function addConflicts(projectId: string, items: Omit<Conflict, 'id' | 'projectId' | 'createdAt' | 'resolvedAt'>[]): Promise<Conflict[]> {
  const now = new Date().toISOString();
  const conflicts: Conflict[] = items.map((item) => ({
    ...item,
    id: generateId(),
    projectId,
    createdAt: now,
    resolvedAt: null,
  }));

  const col = await getConflictsCollection();
  if (col) {
    await col.insertMany(conflicts as any[]);
  } else {
    initMem();
    mem.conflicts.push(...conflicts);
  }
  return conflicts;
}

// ============================================================
// Tasks
// ============================================================
export async function getTasks(projectId: string): Promise<Task[]> {
  const col = await getTasksCollection();
  if (col) {
    return col.find({ projectId }).toArray() as unknown as Task[];
  }
  initMem();
  return mem.tasks.filter((t) => t.projectId === projectId);
}

export async function addTasks(projectId: string, items: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'completedAt'>[]): Promise<Task[]> {
  const now = new Date().toISOString();
  const tasks: Task[] = items.map((item) => ({
    ...item,
    id: generateId(),
    projectId,
    createdAt: now,
    completedAt: null,
  }));

  const col = await getTasksCollection();
  if (col) {
    await col.insertMany(tasks as any[]);
  } else {
    initMem();
    mem.tasks.push(...tasks);
  }
  return tasks;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const col = await getTasksCollection();
  if (col) {
    await col.updateOne(
      { id: taskId },
      { $set: { status, completedAt: status === 'done' ? new Date().toISOString() : null } }
    );
  } else {
    initMem();
    const task = mem.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      task.completedAt = status === 'done' ? new Date().toISOString() : null;
    }
  }
}

// ============================================================
// Deliverables
// ============================================================
export async function getDeliverables(projectId: string): Promise<Deliverable[]> {
  const col = await getDeliverablesCollection();
  if (col) {
    return col.find({ projectId }).toArray() as unknown as Deliverable[];
  }
  initMem();
  return mem.deliverables.filter((d) => d.projectId === projectId);
}

export async function addDeliverables(projectId: string, items: Omit<Deliverable, 'id' | 'projectId'>[]): Promise<Deliverable[]> {
  const deliverables: Deliverable[] = items.map((item) => ({
    ...item,
    id: generateId(),
    projectId,
  }));

  const col = await getDeliverablesCollection();
  if (col) {
    await col.insertMany(deliverables as any[]);
  } else {
    initMem();
    mem.deliverables.push(...deliverables);
  }
  return deliverables;
}

// ============================================================
// Activities
// ============================================================
export async function getActivities(projectId?: string): Promise<Activity[]> {
  const col = await getActivitiesCollection();
  if (col) {
    const filter = projectId ? { projectId } : {};
    return col.find(filter).sort({ timestamp: -1 }).limit(20).toArray() as unknown as Activity[];
  }
  initMem();
  const filtered = projectId
    ? mem.activities.filter((a) => a.projectId === projectId)
    : mem.activities;
  return [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
}

export async function addActivity(projectId: string, type: Activity['type'], description: string): Promise<void> {
  const activity: Activity = {
    id: generateId(),
    projectId,
    type,
    description,
    timestamp: new Date().toISOString(),
  };

  const col = await getActivitiesCollection();
  if (col) {
    await col.insertOne(activity as any);
  } else {
    initMem();
    mem.activities.push(activity);
  }
}

// ============================================================
// Full project loader
// ============================================================
export async function getFullProject(id: string) {
  const project = await getProject(id);
  if (!project) return null;

  const [messages, requirements, revisions, conflicts, tasks, deliverables, activities] = await Promise.all([
    getMessages(id),
    getRequirements(id),
    getRevisions(id),
    getConflicts(id),
    getTasks(id),
    getDeliverables(id),
    getActivities(id),
  ]);

  return {
    ...project,
    messages,
    requirements,
    revisions,
    conflicts,
    tasks,
    deliverables,
    activities,
  };
}

export async function getAllTasks(): Promise<(Task & { projectName?: string })[]> {
  const projects = await getProjects();
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const nested = await Promise.all(projects.map((p) => getTasks(p.id)));
  return nested.flat().map((t) => ({ ...t, projectName: names.get(t.projectId) }));
}

export async function getAllRevisions(): Promise<(Revision & { projectName?: string })[]> {
  const projects = await getProjects();
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const nested = await Promise.all(projects.map((p) => getRevisions(p.id)));
  return nested
    .flat()
    .map((r) => ({ ...r, projectName: names.get(r.projectId) }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getAllMessages(): Promise<(Message & { projectName?: string })[]> {
  const projects = await getProjects();
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const nested = await Promise.all(projects.map((p) => getMessages(p.id)));
  return nested
    .flat()
    .map((m) => ({ ...m, projectName: names.get(m.projectId) }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
