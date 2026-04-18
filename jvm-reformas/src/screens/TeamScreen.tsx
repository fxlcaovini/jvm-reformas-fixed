import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { ChoicePills } from '@/components/ChoicePills';
import { projectsRepo, workersRepo } from '@/db/repositories';
import type { Project, Worker, WorkerLog } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money, shortDate, todayIso } from '@/utils/format';

const defaultWorkerForm = {
  id: undefined as string | undefined,
  name: '',
  phone: '',
  dailyRate: '0',
  role: ''
};

const defaultLogForm = {
  id: undefined as string | undefined,
  workerId: '',
  projectId: '',
  workDate: todayIso(),
  amountPaid: '0',
  notes: ''
};

export function TeamScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<(WorkerLog & { workerName: string; projectTitle: string | null })[]>([]);
  const [workerForm, setWorkerForm] = useState(defaultWorkerForm);
  const [logForm, setLogForm] = useState(defaultLogForm);

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
      totalDays: logs.filter((log) => log.workerId === worker.id).length
    }));
  }, [logs, workers]);

  const saveWorker = async () => {
    await workersRepo.saveWorker({
      name: workerForm.name,
      phone: workerForm.phone,
      dailyRate: Number(workerForm.dailyRate || 0),
      role: workerForm.role
    });
    setWorkerForm(defaultWorkerForm);
    await load();
  };

  const saveLog = async () => {
    await workersRepo.saveLog({
      workerId: logForm.workerId,
      projectId: logForm.projectId || null,
      workDate: logForm.workDate,
      amountPaid: Number(logForm.amountPaid || 0),
      notes: logForm.notes
    });
    setLogForm(defaultLogForm);
    await load();
  };

  return (
    <Screen title="Equipe" subtitle="Cadastro de funcionários, diárias, histórico e pagamentos por obra.">
      <SectionCard title="Novo funcionário" action={<PrimaryButton label="Salvar funcionário" onPress={saveWorker} />}>
        <TextField label="Nome" value={workerForm.name} onChangeText={(name) => setWorkerForm((prev) => ({ ...prev, name }))} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label="Telefone" value={workerForm.phone} onChangeText={(phone) => setWorkerForm((prev) => ({ ...prev, phone }))} /></View>
          <View style={{ flex: 1 }}><TextField label="Função" value={workerForm.role} onChangeText={(role) => setWorkerForm((prev) => ({ ...prev, role }))} /></View>
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
        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label="Data (AAAA-MM-DD)" value={logForm.workDate} onChangeText={(workDate) => setLogForm((prev) => ({ ...prev, workDate }))} /></View>
          <View style={{ flex: 1 }}><TextField label="Valor pago" keyboardType="decimal-pad" value={logForm.amountPaid} onChangeText={(amountPaid) => setLogForm((prev) => ({ ...prev, amountPaid }))} /></View>
        </View>
        <TextField label="Observações" multiline value={logForm.notes} onChangeText={(notes) => setLogForm((prev) => ({ ...prev, notes }))} />
      </SectionCard>

      <SectionCard title="Funcionários cadastrados">
        {paymentsByWorker.length === 0 ? (
          <EmptyState title="Nenhum funcionário" subtitle="Cadastre sua equipe para controlar diárias e histórico." />
        ) : (
          paymentsByWorker.map(({ worker, totalPaid, totalDays }) => (
            <View key={worker.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{worker.name}</Text>
                <Text style={styles.meta}>{worker.role} • Diária padrão {money(worker.dailyRate)}</Text>
                <Text style={styles.meta}>Total pago: {money(totalPaid)} • Registros: {totalDays}</Text>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Histórico de trabalho">
        {logs.length === 0 ? (
          <EmptyState title="Sem registros" subtitle="Registre diárias para acompanhar pagamentos e produtividade." />
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{log.workerName}</Text>
                <Text style={styles.meta}>{log.projectTitle ?? 'Sem obra'} • {shortDate(log.workDate)}</Text>
                <Text style={styles.meta}>{log.notes || 'Sem observações'}</Text>
              </View>
              <Text style={styles.amount}>{money(log.amountPaid)}</Text>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  label: { color: colors.text, fontWeight: '600' },
  itemRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  title: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  amount: { color: colors.success, fontWeight: '800' }
});
