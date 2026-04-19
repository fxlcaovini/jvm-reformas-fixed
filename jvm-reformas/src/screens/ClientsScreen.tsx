import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { CollapsibleItemCard } from '@/components/CollapsibleItemCard';
import { budgetsRepo, clientsRepo, projectsRepo } from '@/db/repositories';
import type { Budget, Client, Project } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money } from '@/utils/format';

const createDefaultForm = () => ({
  id: undefined as string | undefined,
  name: '',
  phone: '',
  email: '',
  notes: ''
});

export function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [form, setForm] = useState(createDefaultForm());
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [loadedClients, loadedProjects, loadedBudgets] = await Promise.all([clientsRepo.list(), projectsRepo.list(), budgetsRepo.list()]);
    setClients(loadedClients);
    setProjects(loadedProjects as Project[]);
    setBudgets(loadedBudgets as Budget[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const historyByClient = useMemo(() => {
    return clients.map((client) => ({
      client,
      projects: projects.filter((project) => project.clientId === client.id),
      budgets: budgets.filter((budget) => budget.clientId === client.id)
    }));
  }, [budgets, clients, projects]);

  const saveClient = async () => {
    if (!form.name.trim()) return;
    await clientsRepo.save({ id: form.id, name: form.name, phone: form.phone, email: form.email, notes: form.notes });
    setForm(createDefaultForm());
    setExpandedClientId(null);
    await load();
  };

  const editClient = (client: Client) => {
    setForm({
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      notes: client.notes
    });
  };

  const removeClient = (client: Client) => {
    Alert.alert('Excluir cliente', `Deseja excluir o cliente "${client.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await clientsRepo.remove(client.id);
            if (form.id === client.id) {
              setForm(createDefaultForm());
            }
            setExpandedClientId((prev) => (prev === client.id ? null : prev));
            await load();
          } catch (error) {
            Alert.alert('Não foi possível excluir', error instanceof Error ? error.message : 'Erro ao excluir cliente.');
          }
        }
      }
    ]);
  };

  const openIfPresent = async (url: string | null) => {
    if (!url) return;
    await Linking.openURL(url);
  };

  const openWhatsApp = async (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return;
    await Linking.openURL(`https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`);
  };

  return (
    <Screen title="Clientes" subtitle="CRM com cadastro, histórico de obras, orçamentos e contato rápido.">
      <SectionCard title={form.id ? 'Editar cliente' : 'Novo cliente'} action={<PrimaryButton label="Salvar cliente" onPress={saveClient} />}>
        <TextField label="Nome" value={form.name} onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} />
        <View style={styles.rowWrap}>
          <View style={styles.flexField}><TextField label="Telefone" value={form.phone} onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))} /></View>
          <View style={styles.flexField}><TextField label="Email" value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} /></View>
        </View>
        <TextField label="Anotações" multiline value={form.notes} onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))} />
      </SectionCard>

      <SectionCard title="Base de clientes">
        {historyByClient.length === 0 ? (
          <EmptyState title="Sem clientes" subtitle="Cadastre seus clientes para centralizar obras e orçamentos." />
        ) : (
          historyByClient.map(({ client, projects: clientProjects, budgets: clientBudgets }) => {
            const totalContracts = clientProjects.reduce((sum, project) => sum + project.totalValue, 0);
            const expanded = expandedClientId === client.id;
            return (
              <CollapsibleItemCard
                key={client.id}
                title={client.name}
                subtitle={`${client.phone || 'Sem telefone'} • ${clientProjects.length} obra(s) • ${clientBudgets.length} orçamento(s)`}
                expanded={expanded}
                onToggle={() => setExpandedClientId((prev) => (prev === client.id ? null : client.id))}
              >
                <Text style={styles.meta}>{client.email || 'Sem email'}</Text>
                <Text style={styles.meta}>Contratos: {money(totalContracts)}</Text>
                <Text style={styles.meta}>{client.notes || 'Sem observações'}</Text>

                <View style={styles.actionsWrap}>
                  <PrimaryButton label="Editar" onPress={() => editClient(client)} variant="ghost" />
                  <PrimaryButton label="Ligar" onPress={() => openIfPresent(client.phone ? `tel:${client.phone}` : null)} variant="ghost" />
                  <PrimaryButton label="WhatsApp" onPress={() => openWhatsApp(client.phone)} variant="ghost" />
                  <PrimaryButton label="Email" onPress={() => openIfPresent(client.email ? `mailto:${client.email}` : null)} variant="ghost" />
                  <PrimaryButton label="Excluir" onPress={() => removeClient(client)} variant="danger" />
                </View>

                {clientProjects.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.subheading}>Histórico de obras</Text>
                    {clientProjects.map((project) => (
                      <Text key={project.id} style={styles.meta}>• {project.title} — {project.status.replace('_', ' ')} — {money(project.totalValue)}</Text>
                    ))}
                  </View>
                ) : null}

                {clientBudgets.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.subheading}>Orçamentos enviados</Text>
                    {clientBudgets.map((budget) => (
                      <Text key={budget.id} style={styles.meta}>• {budget.title} — {money(budget.total)}</Text>
                    ))}
                  </View>
                ) : null}
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
  subheading: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  actionsWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }
});
