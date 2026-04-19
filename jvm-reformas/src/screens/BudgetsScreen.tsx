import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, View } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { ChoicePills } from '@/components/ChoicePills';
import { CollapsibleItemCard } from '@/components/CollapsibleItemCard';
import { budgetsRepo, clientsRepo, projectsRepo } from '@/db/repositories';
import type { Budget, BudgetItem, Client, Project } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money, uuid } from '@/utils/format';
import { exportBudgetPdf } from '@/services/pdf';
import { parseVoiceCommand } from '@/services/voice';

type LocalBudgetItem = {
  key: string;
  name: string;
  quantity: string;
  unitPrice: string;
};

const createBudgetItem = (input?: Partial<Omit<LocalBudgetItem, 'key'>>): LocalBudgetItem => ({
  key: uuid(),
  name: input?.name ?? '',
  quantity: input?.quantity ?? '1',
  unitPrice: input?.unitPrice ?? '0'
});

const createDefaultForm = () => ({
  id: undefined as string | undefined,
  projectId: '',
  clientId: '',
  title: '',
  notes: '',
  templateName: '',
  signatureDataUrl: null as string | null,
  voiceCommand: '',
  items: [createBudgetItem()]
});

const signatureWebStyle = `.m-signature-pad--footer {display:flex; justify-content:space-between;}
.m-signature-pad {box-shadow:none; border:none;}
.m-signature-pad--body {border:1px solid #d1d5db;}`;

export function BudgetsScreen() {
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<(Budget & { clientName: string | null; projectTitle: string | null })[]>([]);
  const [budgetItemsMap, setBudgetItemsMap] = useState<Record<string, BudgetItem[]>>({});
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultForm());

  const load = useCallback(async () => {
    const [loadedClients, loadedProjects, loadedBudgets] = await Promise.all([clientsRepo.list(), projectsRepo.list(), budgetsRepo.list()]);
    setClients(loadedClients);
    setProjects(loadedProjects as Project[]);
    setBudgets(loadedBudgets as (Budget & { clientName: string | null; projectTitle: string | null })[]);
    const entries = await Promise.all(loadedBudgets.map(async (budget) => [budget.id, await budgetsRepo.items(budget.id)] as const));
    setBudgetItemsMap(Object.fromEntries(entries));
    if (!form.clientId && loadedClients[0]) setForm((prev) => ({ ...prev, clientId: loadedClients[0].id }));
    if (!form.projectId && loadedProjects[0]) setForm((prev) => ({ ...prev, projectId: loadedProjects[0].id }));
  }, [form.clientId, form.projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
    [form.items]
  );

  const saveBudget = async () => {
    if (!form.title.trim()) return;
    await budgetsRepo.saveBudget({
      id: form.id,
      projectId: form.projectId || null,
      clientId: form.clientId || null,
      title: form.title,
      notes: form.notes,
      templateName: form.templateName || null,
      signatureDataUrl: form.signatureDataUrl,
      items: form.items.filter((item) => item.name.trim()).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0)
      }))
    });
    setForm(createDefaultForm());
    setExpandedBudgetId(null);
    await load();
  };

  const editBudget = async (budget: Budget) => {
    const items = await budgetsRepo.items(budget.id);
    setForm({
      id: budget.id,
      projectId: budget.projectId ?? '',
      clientId: budget.clientId ?? '',
      title: budget.title,
      notes: budget.notes,
      templateName: budget.templateName ?? '',
      signatureDataUrl: budget.signatureDataUrl,
      voiceCommand: '',
      items: items.length ? items.map((item) => createBudgetItem({ name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })) : [createBudgetItem()]
    });
  };

  const updateItem = (key: string, patch: Partial<Omit<LocalBudgetItem, 'key'>>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, ...patch } : item))
    }));
  };

  const applyVoiceCommand = () => {
    const parsed = parseVoiceCommand(form.voiceCommand);
    if (parsed.module === 'orcamento' && parsed.intent === 'adicionar_item') {
      setForm((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          createBudgetItem({
            name: String(parsed.payload.nome ?? ''),
            quantity: String(parsed.payload.quantidade ?? 1),
            unitPrice: String(parsed.payload.valor ?? 0)
          })
        ],
        voiceCommand: ''
      }));
    }
  };

  const duplicateBudget = async (id: string) => {
    await budgetsRepo.duplicate(id);
    await load();
  };

  const removeBudget = (budget: Budget & { clientName: string | null; projectTitle: string | null }) => {
    Alert.alert('Excluir orçamento', `Deseja excluir o orçamento "${budget.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await budgetsRepo.remove(budget.id);
          if (form.id === budget.id) {
            setForm(createDefaultForm());
          }
          setExpandedBudgetId((prev) => (prev === budget.id ? null : prev));
          await load();
        }
      }
    ]);
  };

  const shareBudget = async (budget: Budget & { clientName: string | null; projectTitle: string | null }) => {
    const items = budgetItemsMap[budget.id] ?? [];
    const client = clients.find((item) => item.id === budget.clientId);
    const project = projects.find((item) => item.id === budget.projectId);
    await exportBudgetPdf(budget, items, client, project);
  };

  return (
    <Screen title="Orçamentos" subtitle="Criação detalhada, duplicação, assinatura digital e PDF profissional.">
      <SectionCard title={form.id ? 'Editar orçamento' : 'Novo orçamento'} action={<PrimaryButton label="Salvar orçamento" onPress={saveBudget} />}>
        <Text style={styles.label}>Cliente</Text>
        <ChoicePills value={(form.clientId || null) as string | null} options={clients.map((client) => ({ label: client.name, value: client.id }))} onChange={(clientId) => setForm((prev) => ({ ...prev, clientId }))} />
        <Text style={styles.label}>Obra</Text>
        <ChoicePills value={(form.projectId || null) as string | null} options={projects.map((project) => ({ label: project.title, value: project.id }))} onChange={(projectId) => setForm((prev) => ({ ...prev, projectId }))} />
        <TextField label="Título" value={form.title} onChangeText={(title) => setForm((prev) => ({ ...prev, title }))} />
        <TextField label="Template reutilizável" value={form.templateName} onChangeText={(templateName) => setForm((prev) => ({ ...prev, templateName }))} />
        <TextField label="Observações" multiline value={form.notes} onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))} />

        <TextField label="Entrada por voz (cole o texto reconhecido)" value={form.voiceCommand} onChangeText={(voiceCommand) => setForm((prev) => ({ ...prev, voiceCommand }))} placeholder="Ex.: orçamento item porcelanato quantidade 20 valor 89,90" />
        <PrimaryButton label="Interpretar comando" onPress={applyVoiceCommand} variant="ghost" />

        <View style={{ gap: 10 }}>
          {form.items.map((item, index) => (
            <View key={item.key} style={styles.itemEditor}>
              <TextField label={`Item ${index + 1}`} value={item.name} onChangeText={(name) => updateItem(item.key, { name })} />
              <View style={styles.rowWrap}>
                <View style={styles.flexField}><TextField label="Quantidade" keyboardType="decimal-pad" value={item.quantity} onChangeText={(quantity) => updateItem(item.key, { quantity })} /></View>
                <View style={styles.flexField}><TextField label="Valor unitário" keyboardType="decimal-pad" value={item.unitPrice} onChangeText={(unitPrice) => updateItem(item.key, { unitPrice })} /></View>
              </View>
              <PrimaryButton label="Remover item" onPress={() => setForm((prev) => {
                const nextItems = prev.items.filter((current) => current.key !== item.key);
                return { ...prev, items: nextItems.length ? nextItems : [createBudgetItem()] };
              })} variant="danger" />
            </View>
          ))}
        </View>
        <PrimaryButton label="Adicionar item" onPress={() => setForm((prev) => ({ ...prev, items: [...prev.items, createBudgetItem()] }))} variant="ghost" />

        <View style={styles.signatureBox}>
          <Text style={styles.label}>Assinatura digital</Text>
          {form.signatureDataUrl ? <Image source={{ uri: form.signatureDataUrl }} style={styles.signaturePreview} resizeMode="contain" /> : <Text style={styles.muted}>Nenhuma assinatura capturada.</Text>}
          <PrimaryButton label="Capturar assinatura" onPress={() => setSignatureVisible(true)} />
        </View>

        <Text style={styles.total}>Total atual: {money(total)}</Text>
      </SectionCard>

      <SectionCard title="Orçamentos cadastrados">
        {budgets.length === 0 ? (
          <EmptyState title="Nenhum orçamento ainda" subtitle="Crie o primeiro orçamento com itens detalhados e PDF compartilhável." />
        ) : (
          budgets.map((budget) => {
            const items = budgetItemsMap[budget.id] ?? [];
            const expanded = expandedBudgetId === budget.id;
            return (
              <CollapsibleItemCard
                key={budget.id}
                title={budget.title}
                subtitle={`${budget.clientName ?? 'Sem cliente'} • ${budget.projectTitle ?? 'Sem obra'} • ${items.length} item(ns)`}
                expanded={expanded}
                onToggle={() => setExpandedBudgetId((prev) => (prev === budget.id ? null : budget.id))}
                badge={<Text style={styles.totalBadge}>{money(budget.total)}</Text>}
              >
                <Text style={styles.muted}>{budget.notes || 'Sem observações.'}</Text>
                <View style={{ gap: 6 }}>
                  {items.map((item) => (
                    <Text key={item.id} style={styles.muted}>• {item.name} — {item.quantity} x {money(item.unitPrice)} = {money(item.quantity * item.unitPrice)}</Text>
                  ))}
                </View>
                <View style={styles.actionsWrap}>
                  <PrimaryButton label="Editar" onPress={() => editBudget(budget)} variant="ghost" />
                  <PrimaryButton label="Duplicar" onPress={() => duplicateBudget(budget.id)} variant="ghost" />
                  <PrimaryButton label="PDF" onPress={() => shareBudget(budget)} />
                  <PrimaryButton label="Excluir" onPress={() => removeBudget(budget)} variant="danger" />
                </View>
              </CollapsibleItemCard>
            );
          })
        )}
      </SectionCard>

      <Modal visible={signatureVisible} animationType="slide" onRequestClose={() => setSignatureVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assinatura digital</Text>
            <PrimaryButton label="Fechar" onPress={() => setSignatureVisible(false)} variant="ghost" />
          </View>
          <SignatureCanvas
            webStyle={signatureWebStyle}
            onOK={(signature) => {
              setForm((prev) => ({ ...prev, signatureDataUrl: signature }));
              setSignatureVisible(false);
            }}
            onEmpty={() => setSignatureVisible(false)}
            descriptionText="Assine na área abaixo"
            clearText="Limpar"
            confirmText="Salvar"
            autoClear={false}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '600' },
  rowWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  flexField: { flexGrow: 1, flexBasis: 150 },
  itemEditor: { gap: spacing.sm, padding: spacing.sm, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt },
  signatureBox: { gap: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  signaturePreview: { width: '100%', height: 120, backgroundColor: 'white', borderRadius: 12 },
  total: { color: colors.success, fontSize: 18, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  budgetRow: { gap: 10 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  actionsWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  modalWrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  modalTitle: { color: colors.text, fontWeight: '800', fontSize: 20 },
  totalBadge: { color: colors.success, fontWeight: '800' }
});
