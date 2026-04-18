import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { StatCard } from '@/components/StatCard';
import { SummaryChart } from '@/components/SummaryChart';
import { EmptyState } from '@/components/EmptyState';
import { getDashboardStats } from '@/db/database';
import { projectsRepo } from '@/db/repositories';
import type { DashboardStats, Project } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money, shortDate } from '@/utils/format';
import { predictRemainingDays } from '@/services/predict';
import { getPendingSyncCount } from '@/services/sync';

export function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingSync, setPendingSync] = useState(0);

  const load = useCallback(async () => {
    const [dashboardStats, loadedProjects, queueCount] = await Promise.all([
      getDashboardStats(),
      projectsRepo.list() as Promise<Project[]>,
      getPendingSyncCount()
    ]);
    setStats(dashboardStats);
    setProjects(loadedProjects);
    setPendingSync(queueCount);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen title="JVM Reformas" subtitle="Resumo geral das obras, caixa e alertas.">
      <View style={styles.rowWrap}>
        <StatCard label="Obras ativas" value={String(stats?.activeProjects ?? 0)} />
        <StatCard label="Lucro geral" value={money(stats?.profit ?? 0)} accent={stats && stats.profit < 0 ? colors.danger : colors.success} />
      </View>

      <View style={styles.rowWrap}>
        <StatCard label="Atrasadas" value={String(stats?.delayedProjects ?? 0)} accent={colors.warning} />
        <StatCard label="Fila de sync" value={String(pendingSync)} accent={pendingSync > 0 ? colors.info : colors.primary} />
      </View>

      <SectionCard title="Financeiro consolidado">
        <SummaryChart
          entries={[
            { label: 'Recebimentos', value: stats?.receivables ?? 0, color: colors.success },
            { label: 'Saídas', value: stats?.expenses ?? 0, color: colors.warning },
            { label: 'Lucro', value: Math.abs(stats?.profit ?? 0), color: stats && stats.profit < 0 ? colors.danger : colors.primary }
          ]}
        />
      </SectionCard>

      <SectionCard title="Alertas inteligentes">
        {stats?.alerts.length ? (
          stats.alerts.map((alert) => (
            <View key={alert} style={styles.alertBox}>
              <Text style={styles.alertText}>{alert}</Text>
            </View>
          ))
        ) : (
          <EmptyState title="Tudo sob controle" subtitle="Nenhum alerta crítico encontrado no momento." />
        )}
      </SectionCard>

      <SectionCard title="Próximas entregas">
        {projects.length === 0 ? (
          <EmptyState title="Sem obras" subtitle="Cadastre sua primeira obra para começar a acompanhar prazo e progresso." />
        ) : (
          projects.slice(0, 5).map((project) => (
            <View key={project.id} style={styles.projectRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <Text style={styles.projectMeta}>Prazo: {shortDate(project.dueDate)} • Progresso: {Math.round(project.progress)}%</Text>
                <Text style={styles.projectMeta}>Previsão restante: {predictRemainingDays(project, projects)} dias</Text>
              </View>
              <Text style={[styles.badge, project.status === 'atrasada' ? styles.badgeWarn : project.status === 'concluida' ? styles.badgeSuccess : styles.badgeInfo]}>
                {project.status.replace('_', ' ')}
              </Text>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowWrap: { flexDirection: 'row', gap: spacing.sm },
  alertBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    padding: spacing.md,
    borderRadius: 16
  },
  alertText: { color: colors.text, lineHeight: 20 },
  projectRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingVertical: 8 },
  projectTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  projectMeta: { color: colors.muted, fontSize: 13 },
  badge: { overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, color: 'white', fontSize: 12, textTransform: 'capitalize' },
  badgeWarn: { backgroundColor: colors.warning },
  badgeSuccess: { backgroundColor: colors.success },
  badgeInfo: { backgroundColor: colors.info }
});
