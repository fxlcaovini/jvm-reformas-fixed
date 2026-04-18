import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { budgetsRepo, clientsRepo, projectsRepo } from '@/db/repositories';
import type { Budget, Client, Project } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money } from '@/utils/format';

const defaultForm = {
  id: undefined as string | undefined,
  name: '',
  phone: '',
  email: '',
  notes: ''
};

export function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [form, setForm] = useState(defaultForm);

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
    await clientsRepo.save({ name: form.name, phone: form.phone, email: form.email, notes: form.notes });
    setForm(defaultForm);
    await load();
  };

  const openWhatsApp = async (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return;
    await Linking.openURL(`https://wa.me/55${digits.startsWith('55') ? digits.slice(2) : digits}`);
  };

  return (
    <Screen title="Clientes" subtitle="CRM com cadastro, histórico de obras, orçamentos e contato rápido.">
      <SectionCard title="Novo cliente" action={<PrimaryButton label="Salvar cliente" onPress={saveClient} />}>
        <TextField label="Nome" value={form.name} onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label="Telefone" value={form.phone} onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))} /></View>
          <View style={{ flex: 1 }}><TextField label="Email" value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} /></View>
        </View>
        <TextField label="Anotações" multiline value={form.notes} onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))} />
      </SectionCard>

      <SectionCard title="Base de clientes">
        {historyByClient.length === 0 ? (
          <EmptyState title="Sem clientes" subtitle="Cadastre seus clientes para centralizar obras e orçamentos." />
        ) : (
          historyByClient.map(({ client, projects: clientProjects, budgets: clientBudgets }) => {
            const totalContracts = clientProjects.reduce((sum, project) => sum + project.totalValue, 0);
            return (
              <View key={client.id} style={styles.clientCard}>
                <View style={{ gap: 6 }}>
                  <Text style={styles.title}>{client.name}</Text>
                  <Text style={styles.meta}>{client.phone || 'Sem telefone'} • {client.email || 'Sem email'}</Text>
                  <Text style={styles.meta}>Obras: {clientProjects.length} • Orçamentos: {clientBudgets.length} • Contratos: {money(totalContracts)}</Text>
                  <Text style={styles.meta}>{client.notes || 'Sem observações'}</Text>
                </View>

                <View style={styles.actions}>
                  <PrimaryButton label="Ligar" onPress={() => Linking.openURL(`tel:${client.phone}`)} variant="ghost" />
                  <PrimaryButton label="WhatsApp" onPress={() => openWhatsApp(client.phone)} variant="ghost" />
                  <PrimaryButton label="Email" onPress={() => Linking.openURL(`mailto:${client.email}`)} variant="ghost" />
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
              </View>
            );
          })
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  clientCard: { gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  subheading: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }
});
