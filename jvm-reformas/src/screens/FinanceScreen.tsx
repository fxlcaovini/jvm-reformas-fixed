import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { ChoicePills } from '@/components/ChoicePills';
import { SummaryChart } from '@/components/SummaryChart';
import { StatCard } from '@/components/StatCard';
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
  const [range, setRange] = useState<'geral' | 'mes' | 'ano'>('geral');

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

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return entries.filter((entry) => {
      if (range === 'geral') return true;
      const date = new Date(entry.referenceDate);
      if (range === 'ano') return date.getFullYear() === year;
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }, [entries, range]);

  const grouped = useMemo(() => {
    const income = filteredEntries.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + item.amount, 0);
    const expenses = filteredEntries.filter((item) => item.type === 'saida').reduce((sum, item) => sum + item.amount, 0);
    const balance = income - expenses;
    const expenseByCategory = ['material', 'mao_de_obra', 'outros'].map((category) => ({
      category,
      total: filteredEntries.filter((entry) => entry.type === 'saida' && entry.category === category).reduce((sum, entry) => sum + entry.amount, 0)
    }));
    const topExpenseCategory = expenseByCategory.sort((a, b) => b.total - a.total)[0];
    const byProject = projects.map((project) => {
      const input = filteredEntries.filter((entry) => entry.projectId === project.id && entry.type === 'entrada').reduce((sum, entry) => sum + entry.amount, 0);
      const output = filteredEntries.filter((entry) => entry.projectId === project.id && entry.type === 'saida').reduce((sum, entry) => sum + entry.amount, 0);
      return { project, input, output, profit: input - output };
    }).filter((item) => item.input > 0 || item.output > 0).sort((a, b) => b.profit - a.profit);

    return {
      income,
      expenses,
      balance,
      topExpenseCategory,
      withAttachment: filteredEntries.filter((entry) => !!entry.attachmentUri).length,
      byProject
    };
  }, [filteredEntries, projects]);

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
    <Screen title="Financeiro" subtitle="Controle por obra, painel de caixa, relatórios e alerta de prejuízo.">
      <SectionCard title="Painel financeiro">
        <Text style={styles.label}>Período</Text>
        <ChoicePills
          value={range}
          options={[
            { label: 'Geral', value: 'geral' },
            { label: 'Mês atual', value: 'mes' },
            { label: 'Ano atual', value: 'ano' }
          ]}
          onChange={setRange}
        />
        <View style={styles.statsWrap}>
          <StatCard label="Entradas" value={money(grouped.income)} accent={colors.success} />
          <StatCard label="Saídas" value={money(grouped.expenses)} accent={colors.warning} />
          <StatCard label="Saldo" value={money(grouped.balance)} accent={grouped.balance < 0 ? colors.danger : colors.primary} />
          <StatCard label="Com comprovante" value={String(grouped.withAttachment)} accent={colors.info} />
        </View>
        <SummaryChart
          entries={[
            { label: 'Recebimentos', value: grouped.income, color: colors.success },
            { label: 'Gastos', value: grouped.expenses, color: colors.warning },
            { label: 'Saldo', value: Math.abs(grouped.balance), color: grouped.balance < 0 ? colors.danger : colors.primary }
          ]}
        />
        <Text style={[styles.resultLabel, grouped.balance < 0 ? { color: colors.danger } : { color: colors.success }]}> 
          {grouped.balance < 0 ? 'Alerta de prejuízo no período selecionado' : 'Resultado positivo no período selecionado'}
        </Text>
        <Text style={styles.meta}>Maior centro de custo: {grouped.topExpenseCategory?.total ? `${grouped.topExpenseCategory.category.replace('_', ' ')} (${money(grouped.topExpenseCategory.total)})` : 'sem saídas registradas'}</Text>
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
        <View style={styles.rowWrap}>
          <View style={styles.flexField}><TextField label="Valor" keyboardType="decimal-pad" value={form.amount} onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))} /></View>
          <View style={styles.flexField}><TextField label="Data (AAAA-MM-DD)" value={form.referenceDate} onChangeText={(referenceDate) => setForm((prev) => ({ ...prev, referenceDate }))} /></View>
        </View>
        <View style={styles.actionsWrap}>
          <PrimaryButton label="Anexar nota" onPress={attachImage} variant="ghost" />
          <PrimaryButton label="Anexar documento" onPress={attachDocument} variant="ghost" />
        </View>
        {form.attachmentUri ? <Text style={styles.attachment}>Anexo selecionado: {form.attachmentUri}</Text> : null}
      </SectionCard>

      <SectionCard title="Rentabilidade por obra">
        {grouped.byProject.length === 0 ? (
          <EmptyState title="Sem obras" subtitle="Cadastre uma obra para acompanhar lucro individual." />
        ) : (
          grouped.byProject.map(({ project, input, output, profit }) => (
            <View key={project.id} style={styles.itemRow}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={styles.itemTitle}>{project.title}</Text>
                <Text style={styles.meta}>Entradas: {money(input)} • Saídas: {money(output)}</Text>
              </View>
              <Text style={[styles.profit, { color: profit < 0 ? colors.danger : colors.success }]}>{money(profit)}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Histórico financeiro">
        {filteredEntries.length === 0 ? (
          <EmptyState title="Sem lançamentos" subtitle="Adicione entradas e saídas para gerar fluxo de caixa e relatórios." />
        ) : (
          filteredEntries.map((entry) => (
            <View key={entry.id} style={styles.itemRow}>
              <View style={{ flex: 1, minWidth: 180 }}>
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
  rowWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  flexField: { flexGrow: 1, flexBasis: 150 },
  statsWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionsWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  resultLabel: { fontWeight: '700', marginTop: 6 },
  itemRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap' },
  itemTitle: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  profit: { fontWeight: '800' },
  attachment: { color: colors.info, fontSize: 12 }
});
