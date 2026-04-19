import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { ChoicePills } from '@/components/ChoicePills';
import { CollapsibleItemCard } from '@/components/CollapsibleItemCard';
import { projectsRepo, workersRepo } from '@/db/repositories';
import type { Project, Worker, WorkerLog } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money, shortDate, todayIso } from '@/utils/format';

const createDefaultWorkerForm = () => ({
  id: undefined as string | undefined,
  name: '',
  phone: '',
  dailyRate: '0',
  role: ''
});

const createDefaultLogForm = () => ({
  id: undefined as string | undefined,
  workerId: '',
  projectId: '',
  workDate: todayIso(),
  amountPaid: '0',
  notes: ''
});

export function TeamScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<(WorkerLog & { workerName: string; projectTitle: string | null })[]>([]);
  const [workerForm, setWorkerForm] = useState(createDefaultWorkerForm());
  const [logForm, setLogForm] = useState(createDefaultLogForm());
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [loadedWorkers, loadedProjects, loadedLogs] = await Promise.all([workersRepo.list(), projectsRepo.list(), workersRepo.logs()]);
    setWorkers(loadedWorkers);
    setProjects(loadedProjects as Project[]);
    setLogs(loadedLogs as (WorkerLog & { workerName: string; projectTitle: string | null })[]);
    if (!logForm.workerId && loadedWorkers[0]) setLogForm((prev) => ({ ...prev, workerId: loadedWorkers[0].id, amountPaid: String(loadedWorkers[0].dailyRate) }));
    if (!logForm.projectId && loadedProjects[0]) setLogForm((prev) => ({ ...prev, projectId: loadedProjects[0].id }));
  }, [logForm.projectId, logForm.workerId]);

  useEffect(() => {
    load();
  }, [load]);

  const paymentsByWorker = useMemo(() => {
    return workers.map((worker) => ({
      worker,
      totalPaid: logs.filter((log) => log.workerId === worker.id).reduce((sum, log) => sum + log.amountPaid, 0),
      totalDays: logs.filter((log) => log.workerId === worker.id).length,
      recentLogs: logs.filter((log) => log.workerId === worker.id).slice(0, 5)
    }));
  }, [logs, workers]);

  const saveWorker = async () => {
    if (!workerForm.name.trim()) return;
    await workersRepo.saveWorker({
      id: workerForm.id,
      name: workerForm.name,
      phone: workerForm.phone,
      dailyRate: Number(workerForm.dailyRate || 0),
      role: workerForm.role
    });
    setWorkerForm(createDefaultWorkerForm());
    setExpandedWorkerId(null);
    await load();
  };

  const editWorker = (worker: Worker) => {
    setWorkerForm({
      id: worker.id,
      name: worker.name,
      phone: worker.phone,
      dailyRate: String(worker.dailyRate),
      role: worker.role
    });
  };

  const saveLog = async () => {
    if (!logForm.workerId) return;
    await workersRepo.saveLog({
      workerId: logForm.workerId,
      projectId: logForm.projectId || null,
      workDate: logForm.workDate,
      amountPaid: Number(logForm.amountPaid || 0),
      notes: logForm.notes
    });
    setLogForm(createDefaultLogForm());
    await load();
  };

  const removeWorker = (worker: Worker) => {
    Alert.alert('Excluir funcionário', `Deseja excluir "${worker.name}"? Os registros de diárias desse funcionário também serão removidos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await workersRepo.remove(worker.id);
          if (workerForm.id === worker.id) {
            setWorkerForm(createDefaultWorkerForm());
          }
          setExpandedWorkerId((prev) => (prev === worker.id ? null : prev));
          await load();
        }
      }
    ]);
  };

  return (
    <Screen title="Equipe" subtitle="Cadastro de funcionários, diárias, histórico e pagamentos por obra.">
      <SectionCard title={workerForm.id ? 'Editar funcionário' : 'Novo funcionário'} action={<PrimaryButton label="Salvar funcionário" onPress={saveWorker} />}>
        <TextField label="Nome" value={workerForm.name} onChangeText={(name) => setWorkerForm((prev) => ({ ...prev, name }))} />
        <View style={styles.rowWrap}>
          <View style={styles.flexField}><TextField label="Telefone" value={workerForm.phone} onChangeText={(phone) => setWorkerForm((prev) => ({ ...prev, phone }))} /></View>
          <View style={styles.flexField}><TextField label="Função" value={workerForm.role} onChangeText={(role) => setWorkerForm((prev) => ({ ...prev, role }))} /></View>
        </View>
        <TextField label="Valor da diária" keyboardType="decimal-pad" value={workerForm.dailyRate} onChangeText={(dailyRate) => setWorkerForm((prev) => ({ ...prev, dailyRate }))} />
      </SectionCard>

      <SectionCard title="Registrar diária" action={<PrimaryButton label="Salvar diária" onPress={saveLog} />}>
        <Text style={styles.label}>Funcionário</Text>
        <ChoicePills value={(logForm.workerId || null) as string | null} options={workers.map((worker) => ({ label: worker.name, value: worker.id }))} onChange={(workerId) => {
          const worker = workers.find((item) => item.id === workerId);
          setLogForm((prev) => ({ ...prev, workerId, amountPaid: String(worker?.dailyRate ?? prev.amountPaid) }));
        }} />
        <Text style={styles.label}>Obra</Text>
        <ChoicePills value={(logForm.projectId || null) as string | null} options={projects.map((project) => ({ label: project.title, value: project.id }))} onChange={(projectId) => setLogForm((prev) => ({ ...prev, projectId }))} />
        <View style={styles.rowWrap}>
          <View style={styles.flexField}><TextField label="Data (AAAA-MM-DD)" value={logForm.workDate} onChangeText={(workDate) => setLogForm((prev) => ({ ...prev, workDate }))} /></View>
          <View style={styles.flexField}><TextField label="Valor pago" keyboardType="decimal-pad" value={logForm.amountPaid} onChangeText={(amountPaid) => setLogForm((prev) => ({ ...prev, amountPaid }))} /></View>
        </View>
        <TextField label="Observações" multiline value={logForm.notes} onChangeText={(notes) => setLogForm((prev) => ({ ...prev, notes }))} />
      </SectionCard>

      <SectionCard title="Funcionários cadastrados">
        {paymentsByWorker.length === 0 ? (
          <EmptyState title="Nenhum funcionário" subtitle="Cadastre sua equipe para controlar diárias e histórico." />
        ) : (
          paymentsByWorker.map(({ worker, totalPaid, totalDays, recentLogs }) => {
            const expanded = expandedWorkerId === worker.id;
            return (
              <CollapsibleItemCard
                key={worker.id}
                title={worker.name}
                subtitle={`${worker.role || 'Sem função'} • Diária ${money(worker.dailyRate)} • ${totalDays} diária(s)`}
                expanded={expanded}
                onToggle={() => setExpandedWorkerId((prev) => (prev === worker.id ? null : worker.id))}
              >
                <Text style={styles.meta}>{worker.phone || 'Sem telefone informado'}</Text>
                <Text style={styles.meta}>Total pago: {money(totalPaid)}</Text>

                <View style={styles.actionsWrap}>
                  <PrimaryButton label="Editar" onPress={() => editWorker(worker)} variant="ghost" />
                  <PrimaryButton label="Excluir" onPress={() => removeWorker(worker)} variant="danger" />
                </View>

                {recentLogs.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.subheading}>Últimos registros</Text>
                    {recentLogs.map((log) => (
                      <Text key={log.id} style={styles.meta}>• {shortDate(log.workDate)} — {log.projectTitle ?? 'Sem obra'} — {money(log.amountPaid)}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.meta}>Nenhuma diária registrada ainda.</Text>
                )}
              </CollapsibleItemCard>
            );
          })
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  flexField: { flexGrow: 1, flexBasis: 150 },
  label: { color: colors.text, fontWeight: '600' },
  subheading: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  actionsWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }
});
