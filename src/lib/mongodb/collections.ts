import { getDb } from './client';
import type { Collection } from 'mongodb';
import type { Activity, Conflict, Deliverable, Message, Project, Requirement, Revision, Task } from '@/types';

let indexesEnsured = false;

export async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  if (!db) return;

  await Promise.all([
    db.collection('projects').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { updatedAt: -1 } },
      { key: { status: 1, updatedAt: -1 } },
    ]),
    db.collection('messages').createIndexes([
      { key: { id: 1 } },
      { key: { projectId: 1, index: 1 } },
    ]),
    db.collection('requirements').createIndexes([
      { key: { id: 1 } },
      { key: { projectId: 1, category: 1 } },
    ]),
    db.collection('revisions').createIndexes([
      { key: { projectId: 1, timestamp: 1 } },
    ]),
    db.collection('conflicts').createIndexes([
      { key: { projectId: 1, status: 1 } },
    ]),
    db.collection('tasks').createIndexes([
      { key: { id: 1 } },
      { key: { projectId: 1, status: 1 } },
    ]),
    db.collection('deliverables').createIndex({ projectId: 1 }),
    db.collection('activities').createIndexes([
      { key: { projectId: 1, timestamp: -1 } },
      { key: { timestamp: -1 } },
    ]),
    db.collection('users').createIndex({ id: 1 }, { unique: true }),
  ]);

  indexesEnsured = true;
}

export async function getProjectsCollection(): Promise<Collection<Project> | null> {
  const db = await getDb();
  if (db) await ensureIndexes();
  return db ? db.collection<Project>('projects') : null;
}

export async function getMessagesCollection(): Promise<Collection<Message> | null> {
  const db = await getDb();
  return db ? db.collection<Message>('messages') : null;
}

export async function getRequirementsCollection(): Promise<Collection<Requirement> | null> {
  const db = await getDb();
  return db ? db.collection<Requirement>('requirements') : null;
}

export async function getRevisionsCollection(): Promise<Collection<Revision> | null> {
  const db = await getDb();
  return db ? db.collection<Revision>('revisions') : null;
}

export async function getConflictsCollection(): Promise<Collection<Conflict> | null> {
  const db = await getDb();
  return db ? db.collection<Conflict>('conflicts') : null;
}

export async function getTasksCollection(): Promise<Collection<Task> | null> {
  const db = await getDb();
  return db ? db.collection<Task>('tasks') : null;
}

export async function getDeliverablesCollection(): Promise<Collection<Deliverable> | null> {
  const db = await getDb();
  return db ? db.collection<Deliverable>('deliverables') : null;
}

export async function getActivitiesCollection(): Promise<Collection<Activity> | null> {
  const db = await getDb();
  return db ? db.collection<Activity>('activities') : null;
}
