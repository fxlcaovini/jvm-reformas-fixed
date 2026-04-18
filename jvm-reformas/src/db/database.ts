import * as SQLite from 'expo-sqlite';
import type { DashboardStats } from '@/types/models';
import { todayIso, uuid } from '@/utils/format';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const schema = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  clientId TEXT NOT NULL,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  startDate TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  status TEXT NOT NULL,
  totalValue REAL NOT NULL DEFAULT 0,
  progress REAL NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_stages (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL,
  stageName TEXT NOT NULL,
  completed REAL NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT,
  financeEntryId TEXT,
  kind TEXT NOT NULL,
  uri TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  referenceDate TEXT NOT NULL,
  attachmentUri TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT,
  clientId TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  templateName TEXT,
  signatureDataUrl TEXT,
  total REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY NOT NULL,
  budgetId TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unitPrice REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  dailyRate REAL NOT NULL DEFAULT 0,
  role TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS worker_logs (
  id TEXT PRIMARY KEY NOT NULL,
  workerId TEXT NOT NULL,
  projectId TEXT,
  workDate TEXT NOT NULL,
  amountPaid REAL NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  status TEXT NOT NULL DEFAULT 'pendente',
  purchasedQuantity REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entityName TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('jvm-reformas.db');
  }
  return dbPromise;
}

export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(schema);
  await seedIfNeeded(db);
  return db;
}

async function seedIfNeeded(db: SQLite.SQLiteDatabase) {
  const count = (await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM clients'))?.total ?? 0;
  if (count > 0) return;

  const now = new Date().toISOString();
  const clientId = uuid();
  const projectId = uuid();
  const budgetId = uuid();
  const workerId = uuid();

  await db.runAsync(
    'INSERT INTO clients (id, name, phone, email, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    clientId,
    'Marcos Silva',
    '(11) 99999-1234',
    'marcos@email.com',
    'Cliente recorrente. Prefere contato por WhatsApp.',
    now,
    now
  );

  await db.runAsync(
    `INSERT INTO projects (id, clientId, title, address, lat, lng, startDate, dueDate, status, totalValue, progress, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    projectId,
    clientId,
    'Reforma Apartamento Centro',
    'Rua Exemplo, 120 - Guarulhos/SP',
    -23.4629,
    -46.5333,
    todayIso(),
    new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
    'em_andamento',
    18500,
    42,
    'Cliente pediu atenção ao acabamento da cozinha.',
    now,
    now
  );

  for (const stage of ['fundacao', 'alvenaria', 'eletrica', 'hidraulica', 'acabamento']) {
    await db.runAsync(
      'INSERT INTO project_stages (id, projectId, stageName, completed, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(),
      projectId,
      stage,
      stage === 'fundacao' ? 100 : stage === 'alvenaria' ? 70 : 25,
      '',
      now,
      now
    );
  }

  await db.runAsync(
    'INSERT INTO finance_entries (id, projectId, type, category, description, amount, referenceDate, attachmentUri, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    projectId,
    'entrada',
    'pagamento',
    'Entrada inicial do contrato',
    10000,
    todayIso(),
    null,
    now,
    now
  );

  await db.runAsync(
    'INSERT INTO finance_entries (id, projectId, type, category, description, amount, referenceDate, attachmentUri, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    projectId,
    'saida',
    'material',
    'Compra de porcelanato e argamassa',
    3450,
    todayIso(),
    null,
    now,
    now
  );

  await db.runAsync(
    'INSERT INTO budgets (id, projectId, clientId, title, notes, templateName, signatureDataUrl, total, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    budgetId,
    projectId,
    clientId,
    'Orçamento Reforma Apartamento',
    'Prazo estimado de 30 dias.',
    'Apartamento padrão 2 quartos',
    null,
    18500,
    now,
    now
  );

  await db.runAsync(
    'INSERT INTO budget_items (id, budgetId, name, quantity, unitPrice, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    budgetId,
    'Demolição e preparo',
    1,
    2500,
    now,
    now
  );
  await db.runAsync(
    'INSERT INTO budget_items (id, budgetId, name, quantity, unitPrice, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    budgetId,
    'Elétrica e iluminação',
    1,
    4200,
    now,
    now
  );

  await db.runAsync(
    'INSERT INTO workers (id, name, phone, dailyRate, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    workerId,
    'José Pedreiro',
    '(11) 98888-1111',
    180,
    'Pedreiro',
    now,
    now
  );

  await db.runAsync(
    'INSERT INTO worker_logs (id, workerId, projectId, workDate, amountPaid, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    workerId,
    projectId,
    todayIso(),
    180,
    'Diária completa',
    now,
    now
  );

  await db.runAsync(
    'INSERT INTO materials (id, projectId, name, quantity, unit, status, purchasedQuantity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    projectId,
    'Cimento',
    30,
    'sacos',
    'comprado',
    30,
    now,
    now
  );
  await db.runAsync(
    'INSERT INTO materials (id, projectId, name, quantity, unit, status, purchasedQuantity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    projectId,
    'Tinta branca fosca',
    6,
    'latas',
    'pendente',
    0,
    now,
    now
  );
}

export async function queryAll<T>(sql: string, ...params: any[]) {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function queryFirst<T>(sql: string, ...params: any[]) {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params);
}

export async function execute(sql: string, ...params: any[]) {
  const db = await getDb();
  return db.runAsync(sql, params);
}

export async function removeById(table: string, id: string) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
}

export async function queueSync(entityName: string, operation: string, payload: Record<string, unknown>) {
  const now = new Date().toISOString();
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sync_queue (id, entityName, operation, payload, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(),
    entityName,
    operation,
    JSON.stringify(payload),
    'pending',
    now,
    now
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const active = (await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) AS total FROM projects WHERE status='em_andamento'"))?.total ?? 0;
  const delayed = (await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) AS total FROM projects WHERE status='atrasada' OR dueDate < date('now') AND status != 'concluida'"))?.total ?? 0;
  const completed = (await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) AS total FROM projects WHERE status='concluida'"))?.total ?? 0;
  const receivables = (await db.getFirstAsync<{ total: number }>("SELECT COALESCE(SUM(amount),0) AS total FROM finance_entries WHERE type='entrada'"))?.total ?? 0;
  const expenses = (await db.getFirstAsync<{ total: number }>("SELECT COALESCE(SUM(amount),0) AS total FROM finance_entries WHERE type='saida'"))?.total ?? 0;
  const profit = receivables - expenses;
  const alerts: string[] = [];
  if (delayed > 0) alerts.push(`${delayed} obra(s) com prazo vencido ou status atrasado.`);
  if (profit < 0) alerts.push('Fluxo de caixa negativo no consolidado geral.');
  const materialsPending = (await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) AS total FROM materials WHERE status='pendente'"))?.total ?? 0;
  if (materialsPending > 0) alerts.push(`${materialsPending} material(is) pendente(s) de compra.`);

  return { activeProjects: active, delayedProjects: delayed, completedProjects: completed, receivables, expenses, profit, alerts };
}
