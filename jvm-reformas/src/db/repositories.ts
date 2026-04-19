import { execute, queryAll, queryFirst, queueSync, removeById } from '@/db/database';
import type {
  Attachment,
  Budget,
  BudgetItem,
  Client,
  FinanceEntry,
  Material,
  Note,
  Project,
  ProjectStage,
  Worker,
  WorkerLog
} from '@/types/models';
import { uuid } from '@/utils/format';

const stamp = () => new Date().toISOString();

export const clientsRepo = {
  list: () => queryAll<Client>('SELECT * FROM clients ORDER BY createdAt DESC'),
  async save(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO clients (id, name, phone, email, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM clients WHERE id = ?), ?), ?)`,
      id,
      input.name,
      input.phone,
      input.email,
      input.notes,
      id,
      now,
      now
    );
    await queueSync('clients', input.id ? 'update' : 'insert', { ...input, id });
    return id;
  },
  async remove(id: string) {
    const linked = await queryFirst<{ projects: number; budgets: number }>(
      `SELECT
        (SELECT COUNT(*) FROM projects WHERE clientId = ?) AS projects,
        (SELECT COUNT(*) FROM budgets WHERE clientId = ?) AS budgets`,
      id,
      id
    );

    if ((linked?.projects ?? 0) > 0 || (linked?.budgets ?? 0) > 0) {
      throw new Error('Este cliente possui obras ou orçamentos vinculados. Remova os vínculos antes de excluir.');
    }

    await removeById('clients', id);
    await queueSync('clients', 'delete', { id });
  }
};

export const projectsRepo = {
  list: () =>
    queryAll<Project & { clientName: string }>(
      `SELECT p.*, c.name as clientName
       FROM projects p
       INNER JOIN clients c ON c.id = p.clientId
       ORDER BY CASE p.status WHEN 'em_andamento' THEN 0 WHEN 'atrasada' THEN 1 ELSE 2 END, p.createdAt DESC`
    ),
  byId: (id: string) => queryFirst<Project>('SELECT * FROM projects WHERE id = ?', id),
  stages: (projectId: string) => queryAll<ProjectStage>('SELECT * FROM project_stages WHERE projectId = ? ORDER BY createdAt ASC', projectId),
  attachments: (projectId: string) => queryAll<Attachment>('SELECT * FROM attachments WHERE projectId = ? ORDER BY createdAt DESC', projectId),
  async save(input: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO projects
      (id, clientId, title, address, lat, lng, startDate, dueDate, status, totalValue, progress, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM projects WHERE id = ?), ?), ?)`,
      id,
      input.clientId,
      input.title,
      input.address,
      input.lat,
      input.lng,
      input.startDate,
      input.dueDate,
      input.status,
      input.totalValue,
      input.progress,
      input.notes,
      id,
      now,
      now
    );
    await queueSync('projects', input.id ? 'update' : 'insert', { ...input, id });
    return id;
  },
  async saveStage(input: Omit<ProjectStage, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO project_stages
      (id, projectId, stageName, completed, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM project_stages WHERE id = ?), ?), ?)`,
      id,
      input.projectId,
      input.stageName,
      input.completed,
      input.notes,
      id,
      now,
      now
    );
    return id;
  },
  async addAttachment(projectId: string, kind: Attachment['kind'], uri: string) {
    const now = stamp();
    const id = uuid();
    await execute(
      'INSERT INTO attachments (id, projectId, financeEntryId, kind, uri, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id,
      projectId,
      null,
      kind,
      uri,
      now,
      now
    );
  },
  async remove(id: string) {
    const budgetIds = await queryAll<{ id: string }>('SELECT id FROM budgets WHERE projectId = ?', id);
    for (const budget of budgetIds) {
      await execute('DELETE FROM budget_items WHERE budgetId = ?', budget.id);
    }
    await execute('DELETE FROM budgets WHERE projectId = ?', id);
    await execute('DELETE FROM project_stages WHERE projectId = ?', id);
    await execute('DELETE FROM attachments WHERE projectId = ?', id);
    await execute('DELETE FROM finance_entries WHERE projectId = ?', id);
    await execute('DELETE FROM materials WHERE projectId = ?', id);
    await execute('DELETE FROM worker_logs WHERE projectId = ?', id);
    await removeById('projects', id);
    await queueSync('projects', 'delete', { id });
  }
};

export const financeRepo = {
  list: () =>
    queryAll<FinanceEntry & { projectTitle: string | null }>(
      `SELECT f.*, p.title as projectTitle
       FROM finance_entries f
       LEFT JOIN projects p ON p.id = f.projectId
       ORDER BY referenceDate DESC, createdAt DESC`
    ),
  async save(input: Omit<FinanceEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO finance_entries
      (id, projectId, type, category, description, amount, referenceDate, attachmentUri, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM finance_entries WHERE id = ?), ?), ?)`,
      id,
      input.projectId,
      input.type,
      input.category,
      input.description,
      input.amount,
      input.referenceDate,
      input.attachmentUri,
      id,
      now,
      now
    );
    await queueSync('finance_entries', input.id ? 'update' : 'insert', { ...input, id });
    return id;
  },
  remove: (id: string) => removeById('finance_entries', id)
};

export const budgetsRepo = {
  list: () =>
    queryAll<Budget & { clientName: string | null; projectTitle: string | null }>(
      `SELECT b.*, c.name as clientName, p.title as projectTitle
      FROM budgets b
      LEFT JOIN clients c ON c.id = b.clientId
      LEFT JOIN projects p ON p.id = b.projectId
      ORDER BY b.createdAt DESC`
    ),
  items: (budgetId: string) => queryAll<BudgetItem>('SELECT * FROM budget_items WHERE budgetId = ? ORDER BY createdAt ASC', budgetId),
  async saveBudget(input: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'total'> & { items: Array<{ name: string; quantity: number; unitPrice: number }>; id?: string; total?: number }) {
    const now = stamp();
    const id = input.id ?? uuid();
    const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    await execute(
      `INSERT OR REPLACE INTO budgets
      (id, projectId, clientId, title, notes, templateName, signatureDataUrl, total, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM budgets WHERE id = ?), ?), ?)`,
      id,
      input.projectId,
      input.clientId,
      input.title,
      input.notes,
      input.templateName,
      input.signatureDataUrl,
      total,
      id,
      now,
      now
    );

    await execute('DELETE FROM budget_items WHERE budgetId = ?', id);
    for (const item of input.items) {
      await execute(
        'INSERT INTO budget_items (id, budgetId, name, quantity, unitPrice, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        uuid(),
        id,
        item.name,
        item.quantity,
        item.unitPrice,
        now,
        now
      );
    }

    await queueSync('budgets', input.id ? 'update' : 'insert', { ...input, id, total });
    return id;
  },
  async duplicate(id: string) {
    const source = await queryFirst<Budget>('SELECT * FROM budgets WHERE id = ?', id);
    if (!source) return null;
    const items = await queryAll<BudgetItem>('SELECT * FROM budget_items WHERE budgetId = ?', id);
    return this.saveBudget({
      ...source,
      id: undefined,
      title: `${source.title} (cópia)`,
      items: items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice }))
    });
  },
  async remove(id: string) {
    await execute('DELETE FROM budget_items WHERE budgetId = ?', id);
    await removeById('budgets', id);
    await queueSync('budgets', 'delete', { id });
  }
};

export const workersRepo = {
  list: () => queryAll<Worker>('SELECT * FROM workers ORDER BY createdAt DESC'),
  logs: () =>
    queryAll<WorkerLog & { workerName: string; projectTitle: string | null }>(
      `SELECT wl.*, w.name as workerName, p.title as projectTitle
      FROM worker_logs wl
      INNER JOIN workers w ON w.id = wl.workerId
      LEFT JOIN projects p ON p.id = wl.projectId
      ORDER BY workDate DESC, wl.createdAt DESC`
    ),
  async saveWorker(input: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO workers (id, name, phone, dailyRate, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM workers WHERE id = ?), ?), ?)`,
      id,
      input.name,
      input.phone,
      input.dailyRate,
      input.role,
      id,
      now,
      now
    );
    return id;
  },
  async saveLog(input: Omit<WorkerLog, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO worker_logs (id, workerId, projectId, workDate, amountPaid, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM worker_logs WHERE id = ?), ?), ?)`,
      id,
      input.workerId,
      input.projectId,
      input.workDate,
      input.amountPaid,
      input.notes,
      id,
      now,
      now
    );
    return id;
  },
  async remove(id: string) {
    await execute('DELETE FROM worker_logs WHERE workerId = ?', id);
    await removeById('workers', id);
    await queueSync('workers', 'delete', { id });
  }
};

export const materialsRepo = {
  list: () =>
    queryAll<Material & { projectTitle: string }>(
      `SELECT m.*, p.title as projectTitle
      FROM materials m
      INNER JOIN projects p ON p.id = m.projectId
      ORDER BY CASE m.status WHEN 'pendente' THEN 0 ELSE 1 END, m.createdAt DESC`
    ),
  suggestions: () =>
    queryAll<{ name: string; timesUsed: number }>(
      `SELECT name, COUNT(*) as timesUsed
       FROM materials
       GROUP BY name
       ORDER BY timesUsed DESC, name ASC
       LIMIT 8`
    ),
  duplicates: () =>
    queryAll<{ projectId: string; name: string; total: number }>(
      `SELECT projectId, lower(name) as name, COUNT(*) as total
       FROM materials
       GROUP BY projectId, lower(name)
       HAVING COUNT(*) > 1`
    ),
  async save(input: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO materials (id, projectId, name, quantity, unit, status, purchasedQuantity, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM materials WHERE id = ?), ?), ?)`,
      id,
      input.projectId,
      input.name,
      input.quantity,
      input.unit,
      input.status,
      input.purchasedQuantity,
      id,
      now,
      now
    );
    return id;
  },
  remove: (id: string) => removeById('materials', id)
};

export const notesRepo = {
  list: () => queryAll<Note>('SELECT * FROM notes ORDER BY updatedAt DESC, createdAt DESC'),
  async save(input: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = stamp();
    const id = input.id ?? uuid();
    await execute(
      `INSERT OR REPLACE INTO notes (id, title, content, tag, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, COALESCE((SELECT createdAt FROM notes WHERE id = ?), ?), ?)`,
      id,
      input.title,
      input.content,
      input.tag,
      id,
      now,
      now
    );
    await queueSync('notes', input.id ? 'update' : 'insert', { ...input, id });
    return id;
  },
  async remove(id: string) {
    await removeById('notes', id);
    await queueSync('notes', 'delete', { id });
  }
};
