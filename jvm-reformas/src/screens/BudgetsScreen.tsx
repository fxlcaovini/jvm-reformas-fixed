import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { ChoicePills } from '@/components/ChoicePills';
import { budgetsRepo, clientsRepo, projectsRepo } from '@/db/repositories';
import type { Budget, BudgetItem, Client, Project } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money } from '@/utils/format';
import { exportBudgetPdf } from '@/services/pdf';
import { parseVoiceCommand } from '@/services/voice';

const defaultForm = {
  id: undefined as string | undefined,
  projectId: '',
  clientId: '',
  title: '',
  notes: '',
  templateName: '',
  signatureDataUrl: null as string | null,
  voiceCommand: '',
  items: [{ name: '', quantity: '1', unitPrice: '0' }]
};

const signatureWebStyle = `.m-signature-pad--footer {display:flex; justify-content:space-between;}
.m-signature-pad {box-shadow:none; border:none;}
.m-signature-pad--body {border:1px solid #d1d5db;}`;

export function BudgetsScreen() {
  const signatureRef = useRef<any>(null);
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<(Budget & { clientName: string | null; projectTitle: string | null })[]>([]);
  const [budgetItemsMap, setBudgetItemsMap] = useState<Record<string, BudgetItem[]>>({});
  const [form, setForm] = useState(defaultForm);

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
    setForm(defaultForm);
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
      items: items.map((item) => ({ name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice) }))
    });
  };

  const applyVoiceCommand = () => {
    const parsed = parseVoiceCommand(form.voiceCommand);
    if (parsed.module === 'orcamento' && parsed.intent === 'adicionar_item') {
      setForm((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            name: String(parsed.payload.nome ?? ''),
            quantity: String(parsed.payload.quantidade ?? 1),
            unitPrice: String(parsed.payload.valor ?? 0)
          }
        ],
        voiceCommand: ''
      }));
    }
  };

  const duplicateBudget = async (id: string) => {
    await budgetsRepo.duplicate(id);
    await load();
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
            <View key={`${index}-${item.name}`} style={styles.itemEditor}>
              <TextField label={`Item ${index + 1}`} value={item.name} onChangeText={(name) => setForm((prev) => ({ ...prev, items: prev.items.map((current, i) => i === index ? { ...current, name } : current) }))} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><TextField label="Quantidade" keyboardType="decimal-pad" value={item.quantity} onChangeText={(quantity) => setForm((prev) => ({ ...prev, items: prev.items.map((current, i) => i === index ? { ...current, quantity } : current) }))} /></View>
                <View style={{ flex: 1 }}><TextField label="Valor unitário" keyboardType="decimal-pad" value={item.unitPrice} onChangeText={(unitPrice) => setForm((prev) => ({ ...prev, items: prev.items.map((current, i) => i === index ? { ...current, unitPrice } : current) }))} /></View>
              </View>
              <PrimaryButton label="Remover item" onPress={() => setForm((prev) => {
                const nextItems = prev.items.filter((_, i) => i !== index);
                return { ...prev, items: nextItems.length ? nextItems : [{ name: '', quantity: '1', unitPrice: '0' }] };
              })} variant="danger" />
            </View>
          ))}
        </View>
        <PrimaryButton label="Adicionar item" onPress={() => setForm((prev) => ({ ...prev, items: [...prev.items, { name: '', quantity: '1', unitPrice: '0' }] }))} variant="ghost" />

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
          budgets.map((budget) => (
            <View key={budget.id} style={styles.budgetRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.itemTitle}>{budget.title}</Text>
                <Text style={styles.muted}>{budget.clientName ?? 'Sem cliente'} • {budget.projectTitle ?? 'Sem obra'}</Text>
                <Text style={styles.muted}>Template: {budget.templateName ?? '—'} • Total: {money(budget.total)}</Text>
                <Text style={styles.muted}>Itens: {(budgetItemsMap[budget.id] ?? []).length}</Text>
              </View>
              <View style={styles.actionsCol}>
                <PrimaryButton label="Editar" onPress={() => editBudget(budget)} variant="ghost" />
                <PrimaryButton label="Duplicar" onPress={() => duplicateBudget(budget.id)} variant="ghost" />
                <PrimaryButton label="PDF / compartilhar" onPress={() => shareBudget(budget)} />
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <Modal visible={signatureVisible} animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assinatura do cliente</Text>
            <PrimaryButton label="Fechar" onPress={() => setSignatureVisible(false)} variant="ghost" />
          </View>
          <SignatureCanvas
            ref={signatureRef}
            onOK={(signature) => {
              setForm((prev) => ({ ...prev, signatureDataUrl: signature }));
              setSignatureVisible(false);
            }}
            onEmpty={() => setSignatureVisible(false)}
            descriptionText="Assine abaixo"
            clearText="Limpar"
            confirmText="Salvar"
            penColor="#111827"
            backgroundColor="rgba(255,255,255,1)"
            webStyle={signatureWebStyle}
            webviewProps={{ cacheEnabled: true, androidLayerType: 'hardware' }}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  itemEditor: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 16, gap: spacing.sm, backgroundColor: colors.cardAlt },
  total: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  signatureBox: { gap: 10, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt },
  signaturePreview: { width: '100%', height: 120, backgroundColor: 'white', borderRadius: 10 },
  muted: { color: colors.muted, fontSize: 13 },
  budgetRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitle: { color: colors.text, fontWeight: '700' },
  actionsCol: { width: 160, gap: 8 },
  modalWrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 56 },
  modalHeader: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' }
});
