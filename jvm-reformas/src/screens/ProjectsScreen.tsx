import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { ChoicePills } from '@/components/ChoicePills';
import { CollapsibleItemCard } from '@/components/CollapsibleItemCard';
import { clientsRepo, materialsRepo, projectsRepo } from '@/db/repositories';
import type { Client, Material, Project, ProjectStage } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { money, shortDate, todayIso } from '@/utils/format';
import { pickImageOrVideo } from '@/services/media';
import { openAddressInMaps } from '@/services/maps';
import { scheduleDeadlineAlert } from '@/services/notifications';

const defaultProjectForm = {
  id: undefined as string | undefined,
  clientId: '',
  title: '',
  address: '',
  lat: '',
  lng: '',
  startDate: todayIso(),
  dueDate: todayIso(),
  status: 'em_andamento' as Project['status'],
  totalValue: '0',
  progress: '0',
  notes: ''
};

const defaultMaterialForm = {
  id: undefined as string | undefined,
  projectId: '',
  name: '',
  quantity: '1',
  unit: 'un',
  status: 'pendente' as Material['status'],
  purchasedQuantity: '0'
};

export function ProjectsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<(Project & { clientName: string })[]>([]);
  const [stagesMap, setStagesMap] = useState<Record<string, ProjectStage[]>>({});
  const [attachmentsCount, setAttachmentsCount] = useState<Record<string, number>>({});
  const [materials, setMaterials] = useState<(Material & { projectTitle: string })[]>([]);
  const [materialSuggestions, setMaterialSuggestions] = useState<Array<{ name: string; timesUsed: number }>>([]);
  const [duplicateMaterials, setDuplicateMaterials] = useState<Array<{ projectId: string; name: string; total: number }>>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const [materialForm, setMaterialForm] = useState(defaultMaterialForm);

  const load = useCallback(async () => {
    const [loadedClients, loadedProjects, loadedMaterials, suggestions, duplicates] = await Promise.all([
      clientsRepo.list(),
      projectsRepo.list(),
      materialsRepo.list(),
      materialsRepo.suggestions(),
      materialsRepo.duplicates()
    ]);
    setClients(loadedClients);
    setProjects(loadedProjects as (Project & { clientName: string })[]);
    setMaterials(loadedMaterials as (Material & { projectTitle: string })[]);
    setMaterialSuggestions(suggestions);
    setDuplicateMaterials(duplicates);

    const stageEntries = await Promise.all(loadedProjects.map(async (project) => [project.id, await projectsRepo.stages(project.id)] as const));
    const attachmentEntries = await Promise.all(loadedProjects.map(async (project) => [project.id, (await projectsRepo.attachments(project.id)).length] as const));
    setStagesMap(Object.fromEntries(stageEntries));
    setAttachmentsCount(Object.fromEntries(attachmentEntries));

    if (!projectForm.clientId && loadedClients[0]) {
      setProjectForm((prev) => ({ ...prev, clientId: loadedClients[0].id }));
    }
    if (!materialForm.projectId && loadedProjects[0]) {
      setMaterialForm((prev) => ({ ...prev, projectId: loadedProjects[0].id }));
    }
  }, [materialForm.projectId, projectForm.clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusOptions = useMemo(
    () => [
      { label: 'Em andamento', value: 'em_andamento' as const },
      { label: 'Atrasada', value: 'atrasada' as const },
      { label: 'Concluída', value: 'concluida' as const }
    ],
    []
  );

  const saveProject = async () => {
    if (!projectForm.clientId || !projectForm.title.trim()) return;
    const projectId = await projectsRepo.save({
      id: projectForm.id,
      clientId: projectForm.clientId,
      title: projectForm.title,
      address: projectForm.address,
      lat: projectForm.lat ? Number(projectForm.lat) : null,
      lng: projectForm.lng ? Number(projectForm.lng) : null,
      startDate: projectForm.startDate,
      dueDate: projectForm.dueDate,
      status: projectForm.status,
      totalValue: Number(projectForm.totalValue || 0),
      progress: Number(projectForm.progress || 0),
      notes: projectForm.notes
    });

    if (!projectForm.id) {
      for (const stageName of ['fundacao', 'alvenaria', 'eletrica', 'hidraulica', 'acabamento'] as const) {
        await projectsRepo.saveStage({ projectId, stageName, completed: 0, notes: '' });
      }
    }

    await scheduleDeadlineAlert({
      id: projectId,
      clientId: projectForm.clientId,
      title: projectForm.title,
      address: projectForm.address,
      lat: projectForm.lat ? Number(projectForm.lat) : null,
      lng: projectForm.lng ? Number(projectForm.lng) : null,
      startDate: projectForm.startDate,
      dueDate: projectForm.dueDate,
      status: projectForm.status,
      totalValue: Number(projectForm.totalValue || 0),
      progress: Number(projectForm.progress || 0),
      notes: projectForm.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setProjectForm(defaultProjectForm);
    setExpandedProjectId(null);
    await load();
  };

  const editProject = (project: Project & { clientName: string }) => {
    setProjectForm({
      id: project.id,
      clientId: project.clientId,
      title: project.title,
      address: project.address,
      lat: project.lat?.toString() ?? '',
      lng: project.lng?.toString() ?? '',
      startDate: project.startDate,
      dueDate: project.dueDate,
      status: project.status,
      totalValue: String(project.totalValue),
      progress: String(project.progress),
      notes: project.notes || ''
    });
  };

  const removeProject = (project: Project & { clientName: string }) => {
    Alert.alert('Excluir obra', `Deseja excluir a obra "${project.title}"? Os materiais, estágios, anexos, lançamentos financeiros e registros de equipe vinculados serão removidos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await projectsRepo.remove(project.id);
          if (projectForm.id === project.id) {
            setProjectForm(defaultProjectForm);
          }
          setExpandedProjectId((prev) => (prev === project.id ? null : prev));
          await load();
        }
      }
    ]);
  };

  const tweakStage = async (stage: ProjectStage, delta: number) => {
    const completed = Math.max(0, Math.min(100, stage.completed + delta));
    await projectsRepo.saveStage({ ...stage, completed });
    await load();
  };

  const attachMedia = async (projectId: string) => {
    const asset = await pickImageOrVideo();
    if (!asset) return;
    await projectsRepo.addAttachment(projectId, asset.type === 'video' ? 'video' : 'image', asset.uri);
    await load();
  };

  const saveMaterial = async () => {
    if (!materialForm.projectId || !materialForm.name.trim()) return;
    await materialsRepo.save({
      projectId: materialForm.projectId,
      name: materialForm.name,
      quantity: Number(materialForm.quantity || 0),
      unit: materialForm.unit,
      status: materialForm.status,
      purchasedQuantity: Number(materialForm.purchasedQuantity || 0)
    });
    setMaterialForm(defaultMaterialForm);
    await load();
  };

  return (
    <Screen title="Obras" subtitle="Cadastre, acompanhe etapas, mídias e materiais por obra.">
      <SectionCard title={projectForm.id ? 'Editar obra' : 'Nova obra'} action={<PrimaryButton label="Salvar obra" onPress={saveProject} />}>
        <Text style={styles.label}>Cliente</Text>
        <ChoicePills
          value={(projectForm.clientId || null) as string | null}
          options={clients.map((client) => ({ label: client.name, value: client.id }))}
          onChange={(value) => setProjectForm((prev) => ({ ...prev, clientId: value }))}
        />
        <TextField label="Nome da obra" value={projectForm.title} onChangeText={(title) => setProjectForm((prev) => ({ ...prev, title }))} />
        <TextField label="Endereço" value={projectForm.address} onChangeText={(address) => setProjectForm((prev) => ({ ...prev, address }))} />
        <View style={styles.rowWrap}>
          <View style={styles.flexField}><TextField label="Latitude" value={projectForm.lat} onChangeText={(lat) => setProjectForm((prev) => ({ ...prev, lat }))} /></View>
          <View style={styles.flexField}><TextField label="Longitude" value={projectForm.lng} onChangeText={(lng) => setProjectForm((prev) => ({ ...prev, lng }))} /></View>
        </View>
        <View style={styles.rowWrap}>
          <View style={styles.flexField}><TextField label="Início (AAAA-MM-DD)" value={projectForm.startDate} onChangeText={(startDate) => setProjectForm((prev) => ({ ...prev, startDate }))} /></View>
          <View style={styles.flexField}><TextField label="Prazo (AAAA-MM-DD)" value={projectForm.dueDate} onChangeText={(dueDate) => setProjectForm((prev) => ({ ...prev, dueDate }))} /></View>
        </View>
        <Text style={styles.label}>Status</Text>
        <ChoicePills value={projectForm.status} options={statusOptions} onChange={(status) => setProjectForm((prev) => ({ ...prev, status }))} />
        <View style={styles.rowWrap}>
          <View style={styles.flexField}><TextField label="Valor total" keyboardType="decimal-pad" value={projectForm.totalValue} onChangeText={(totalValue) => setProjectForm((prev) => ({ ...prev, totalValue }))} /></View>
          <View style={styles.flexField}><TextField label="Progresso (%)" keyboardType="number-pad" value={projectForm.progress} onChangeText={(progress) => setProjectForm((prev) => ({ ...prev, progress }))} /></View>
        </View>
        <TextField label="Observações" multiline value={projectForm.notes} onChangeText={(notes) => setProjectForm((prev) => ({ ...prev, notes }))} />
      </SectionCard>

      <SectionCard title="Obras cadastradas">
        {projects.length === 0 ? (
          <EmptyState title="Nenhuma obra cadastrada" subtitle="Preencha os dados acima para registrar a primeira obra." />
        ) : (
          projects.map((project) => {
            const expanded = expandedProjectId === project.id;
            const stages = stagesMap[project.id] ?? [];
            return (
              <CollapsibleItemCard
                key={project.id}
                title={project.title}
                subtitle={`${project.clientName} • Prazo ${shortDate(project.dueDate)} • ${project.progress}% concluído`}
                expanded={expanded}
                onToggle={() => setExpandedProjectId((prev) => (prev === project.id ? null : project.id))}
                badge={
                  <Text style={[styles.badge, project.status === 'atrasada' ? styles.badgeWarn : project.status === 'concluida' ? styles.badgeSuccess : styles.badgeInfo]}>
                    {project.status.replace('_', ' ')}
                  </Text>
                }
              >
                <Text style={styles.meta}>{project.address}</Text>
                <Text style={styles.meta}>Valor: {money(project.totalValue)} • Anexos: {attachmentsCount[project.id] ?? 0}</Text>
                <Text style={styles.meta}>{project.notes || 'Sem observações adicionais.'}</Text>

                <View style={styles.actionsWrap}>
                  <PrimaryButton label="Editar" onPress={() => editProject(project)} variant="ghost" />
                  <PrimaryButton label="Mapa" onPress={() => openAddressInMaps(project.address, project.lat, project.lng)} variant="ghost" />
                  <PrimaryButton label="Foto/Vídeo" onPress={() => attachMedia(project.id)} />
                  <PrimaryButton label="Excluir" onPress={() => removeProject(project)} variant="danger" />
                </View>

                <View style={{ gap: 10 }}>
                  <Text style={styles.sectionMiniTitle}>Timeline / etapas</Text>
                  {stages.map((stage) => (
                    <View key={stage.id} style={styles.stageRow}>
                      <View style={{ flex: 1, minWidth: 150 }}>
                        <Text style={styles.stageTitle}>{stage.stageName}</Text>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBar, { width: `${stage.completed}%` }]} />
                        </View>
                      </View>
                      <Text style={styles.meta}>{stage.completed}%</Text>
                      <View style={styles.smallActionsWrap}>
                        <Pressable onPress={() => tweakStage(stage, -10)} style={styles.stageBtn}><Text style={styles.stageBtnText}>-10</Text></Pressable>
                        <Pressable onPress={() => tweakStage(stage, 10)} style={styles.stageBtn}><Text style={styles.stageBtnText}>+10</Text></Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </CollapsibleItemCard>
            );
          })
        )}
      </SectionCard>

      <SectionCard title="Materiais por obra" action={<PrimaryButton label="Salvar material" onPress={saveMaterial} />}>
        <Text style={styles.label}>Obra</Text>
        <ChoicePills
          value={(materialForm.projectId || null) as string | null}
          options={projects.map((project) => ({ label: project.title, value: project.id }))}
          onChange={(projectId) => setMaterialForm((prev) => ({ ...prev, projectId }))}
        />
        <View style={styles.rowWrap}>
          <View style={[styles.flexField, { flexBasis: 180, flexGrow: 2 }]}><TextField label="Material" value={materialForm.name} onChangeText={(name) => setMaterialForm((prev) => ({ ...prev, name }))} /></View>
          <View style={styles.flexField}><TextField label="Qtd." keyboardType="decimal-pad" value={materialForm.quantity} onChangeText={(quantity) => setMaterialForm((prev) => ({ ...prev, quantity }))} /></View>
          <View style={styles.flexField}><TextField label="Unidade" value={materialForm.unit} onChangeText={(unit) => setMaterialForm((prev) => ({ ...prev, unit }))} /></View>
        </View>
        <View style={styles.rowWrap}>
          <View style={styles.flexField}>
            <Text style={styles.label}>Status</Text>
            <ChoicePills
              value={materialForm.status}
              options={[{ label: 'Pendente', value: 'pendente' }, { label: 'Comprado', value: 'comprado' }]}
              onChange={(status) => setMaterialForm((prev) => ({ ...prev, status }))}
            />
          </View>
          <View style={styles.flexField}><TextField label="Qtd. comprada" keyboardType="decimal-pad" value={materialForm.purchasedQuantity} onChangeText={(purchasedQuantity) => setMaterialForm((prev) => ({ ...prev, purchasedQuantity }))} /></View>
        </View>

        <Text style={styles.sectionMiniTitle}>Sugestões baseadas em obras anteriores</Text>
        <View style={styles.chipsWrap}>
          {materialSuggestions.map((item) => (
            <Pressable key={item.name} onPress={() => setMaterialForm((prev) => ({ ...prev, name: item.name }))} style={styles.suggestionChip}>
              <Text style={styles.suggestionText}>{item.name} • {item.timesUsed}x</Text>
            </Pressable>
          ))}
        </View>

        {duplicateMaterials.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.sectionMiniTitle}>Possíveis compras duplicadas</Text>
            {duplicateMaterials.map((item) => (
              <Text key={`${item.projectId}-${item.name}`} style={styles.meta}>• {projects.find((project) => project.id === item.projectId)?.title}: {item.name} ({item.total} registros)</Text>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {materials.map((material) => (
            <View key={material.id} style={styles.materialRow}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={styles.cardTitle}>{material.name}</Text>
                <Text style={styles.meta}>{material.projectTitle} • {material.quantity} {material.unit}</Text>
              </View>
              <Text style={[styles.badge, material.status === 'comprado' ? styles.badgeSuccess : styles.badgeWarn]}>{material.status}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowWrap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', flexWrap: 'wrap' },
  flexField: { flexGrow: 1, flexBasis: 150 },
  label: { color: colors.text, fontWeight: '600' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  badge: { overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, color: 'white', fontSize: 12, textTransform: 'capitalize' },
  badgeWarn: { backgroundColor: colors.warning },
  badgeSuccess: { backgroundColor: colors.success },
  badgeInfo: { backgroundColor: colors.info },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  stageTitle: { color: colors.text, textTransform: 'capitalize', marginBottom: 6 },
  progressBarBg: { height: 10, borderRadius: 999, backgroundColor: colors.card, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  stageBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  stageBtnText: { color: colors.text, fontWeight: '700' },
  sectionMiniTitle: { color: colors.text, fontWeight: '700', marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  suggestionChip: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  suggestionText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap' },
  actionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  smallActionsWrap: { flexDirection: 'row', gap: spacing.xs }
});
