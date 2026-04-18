import { queryAll } from '@/db/database';

export async function getPendingSyncCount() {
  const rows = await queryAll<{ total: number }>("SELECT COUNT(*) as total FROM sync_queue WHERE status='pending'");
  return rows[0]?.total ?? 0;
}
