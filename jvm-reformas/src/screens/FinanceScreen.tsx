import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { ChoicePills } from '@/components/ChoicePills';
import { SummaryChart } from '@/components/SummaryChart';
import { financeRepo, projectsRepo } from '@/db/repositories';
import type { FinanceEntry, Project } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money, shortDate, todayIso } from '@/utils/format';
import { pickDocument, pickImageOrVideo } from '@/services/media';

const defaultFinanceForm = {
  id: undefined as string | undefined,
  projectId: '',
  type: 'entrada' as FinanceEntry['type'],
  category: 'pagamento' as FinanceEntry['category'],
  description: '',
  amount: '0',
  referenceDate: todayIso(),
  attachmentUri: null as string | null
};

export function FinanceScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<(FinanceEntry & { projectTitle: string | null })[]>([]);
  const [form, setForm] = useState(defaultFinanceForm);

  const load = useCallback(async () => {
    const [loadedProjects, loadedEntries] = await Promise.all([projectsRepo.list(), financeRepo.list()]);
    setProjects(loadedProjects as Project[]);
    setEntries(loadedEntries as (FinanceEntry & { projectTitle: string | null })[]);
    if (!form.projectId && loadedProjects[0]) {
      setForm((prev) => ({ ...prev, projectId: loadedProjects[0].id }));
    }
  }, [form.projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const income = entries.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + item.amount, 0);
    const expenses = entries.filter((item) => item.type === 'saida').reduce((sum, item) => sum + item.amount, 0);
    const byProject = projects.map((project) => {
      const input = entries.filter((entry) => entry.projectId === project.id && entry.type === 'entrada').reduce((sum, entry) => sum + entry.amount, 0);
      const output = entries.filter((entry) => entry.projectId === project.id && entry.type === 'saida').reduce((sum, entry) => sum + entry.amount, 0);
      return { project, input, output, profit: input - output };
    });
    return { income, expenses, byProject };
  }, [entries, projects]);

  const saveEntry = async () => {
    await financeRepo.save({
      projectId: form.projectId || null,
      type: form.type,
      category: form.category,
      description: form.description,
      amount: Number(form.amount || 0),
      referenceDate: form.referenceDate,
      attachmentUri: form.attachmentUri
    });
    setForm(defaultFinanceForm);
    await load();
  };

  const attachImage = async () => {
    const file = await pickImageOrVideo();
    if (!file) return;
    setForm((prev) => ({ ...prev, attachmentUri: file.uri }));
  };

  const attachDocument = async () => {
    const file = await pickDocument();
    if (!file) return;
    setForm((prev) => ({ ...prev, attachmentUri: file.uri }));
  };

  return (
    <Screen title="Financeiro" subtitle="Controle por obra, fluxo de caixa, relatórios e alerta de prejuízo.">
      <SectionCard title="Resumo financeiro">
        <SummaryChart
          entries={[
            { label: 'Recebimentos', value: grouped.income, color: colors.success },
            { label: 'Gastos', value: grouped.expenses, color: colors.warning },
            { label: 'Resultado', value: Math.abs(grouped.income - grouped.expenses), color: grouped.income - grouped.expenses < 0 ? colors.danger : colors.primary }
          ]}
        />
        <Text style={[styles.resultLabel, grouped.income - grouped.expenses < 0 ? { color: colors.danger } : { color: colors.success }]}>
          {grouped.income - grouped.expenses < 0 ? 'Alerta de prejuízo no consolidado geral' : 'Resultado positivo no consolidado geral'}
        </Text>
      </SectionCard>

      <SectionCard title="Novo lançamento" action={<PrimaryButton label="Salvar" onPress={saveEntry} />}>
        <Text style={styles.label}>Tipo</Text>
        <ChoicePills
          value={form.type}
          options={[{ label: 'Entrada', value: 'entrada' }, { label: 'Saída', value: 'saida' }]}
          onChange={(type) => setForm((prev) => ({ ...prev, type, category: type === 'entrada' ? 'pagamento' : 'material' }))}
        />

        <Text style={styles.label}>Categoria</Text>
        <ChoicePills
          value={form.category}
          options={form.type === 'entrada'
            ? [{ label: 'Pagamento', value: 'pagamento' }]
            : [
                { label: 'Material', value: 'material' },
                { label: 'Mão de obra', value: 'mao_de_obra' },
                { label: 'Outros', value: 'outros' }
              ]}
          onChange={(category) => setForm((prev) => ({ ...prev, category }))}
        />

        <Text style={styles.label}>Obra vinculada</Text>
        <ChoicePills
          value={(form.projectId || null) as string | null}
          options={projects.map((project) => ({ label: project.title, value: project.id }))}
          onChange={(projectId) => setForm((prev) => ({ ...prev, projectId }))}
        />

        <TextField label="Descrição" value={form.description} onChangeText={(description) => setForm((prev) => ({ ...prev, description }))} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label="Valor" keyboardType="decimal-pad" value={form.amount} onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))} /></View>
          <View style={{ flex: 1 }}><TextField label="Data (AAAA-MM-DD)" value={form.referenceDate} onChangeText={(referenceDate) => setForm((prev) => ({ ...prev, referenceDate }))} /></View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><PrimaryButton label="Anexar nota (imagem)" onPress={attachImage} variant="ghost" /></View>
          <View style={{ flex: 1 }}><PrimaryButton label="Anexar documento" onPress={attachDocument} variant="ghost" /></View>
        </View>
        {form.attachmentUri ? <Text style={styles.attachment}>Anexo selecionado: {form.attachmentUri}</Text> : null}
      </SectionCard>

      <SectionCard title="Lucro por obra">
        {grouped.byProject.length === 0 ? (
          <EmptyState title="Sem obras" subtitle="Cadastre uma obra para acompanhar lucro individual." />
        ) : (
          grouped.byProject.map(({ project, input, output, profit }) => (
            <View key={project.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{project.title}</Text>
                <Text style={styles.meta}>Entradas: {money(input)} • Saídas: {money(output)}</Text>
              </View>
              <Text style={[styles.profit, { color: profit < 0 ? colors.danger : colors.success }]}>{money(profit)}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Histórico financeiro">
        {entries.length === 0 ? (
          <EmptyState title="Sem lançamentos" subtitle="Adicione entradas e saídas para gerar fluxo de caixa e relatórios." />
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{entry.description}</Text>
                <Text style={styles.meta}>{entry.projectTitle ?? 'Geral'} • {entry.category.replace('_', ' ')} • {shortDate(entry.referenceDate)}</Text>
              </View>
              <Text style={[styles.profit, { color: entry.type === 'entrada' ? colors.success : colors.warning }]}>
                {entry.type === 'entrada' ? '+' : '-'} {money(entry.amount)}
              </Text>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  resultLabel: { fontWeight: '700', marginTop: 6 },
  itemRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitle: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  profit: { fontWeight: '800' },
  attachment: { color: colors.info, fontSize: 12 }
});
