import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { EmptyState } from '@/components/EmptyState';
import { CollapsibleItemCard } from '@/components/CollapsibleItemCard';
import { notesRepo } from '@/db/repositories';
import type { Note } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { shortDate } from '@/utils/format';

const createDefaultForm = () => ({
  id: undefined as string | undefined,
  title: '',
  content: '',
  tag: ''
});

export function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [form, setForm] = useState(createDefaultForm());
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setNotes(await notesRepo.list());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveNote = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    await notesRepo.save({
      id: form.id,
      title: form.title,
      content: form.content,
      tag: form.tag
    });
    setForm(createDefaultForm());
    setExpandedNoteId(null);
    await load();
  };

  const editNote = (note: Note) => {
    setForm({ id: note.id, title: note.title, content: note.content, tag: note.tag });
  };

  const removeNote = (note: Note) => {
    Alert.alert('Excluir anotação', `Deseja excluir a anotação "${note.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await notesRepo.remove(note.id);
          if (form.id === note.id) setForm(createDefaultForm());
          setExpandedNoteId((prev) => (prev === note.id ? null : prev));
          await load();
        }
      }
    ]);
  };

  return (
    <Screen title="Anotações" subtitle="Guarde observações gerais, lembretes e informações rápidas do dia a dia.">
      <SectionCard title={form.id ? 'Editar anotação' : 'Nova anotação'} action={<PrimaryButton label="Salvar anotação" onPress={saveNote} />}>
        <TextField label="Título" value={form.title} onChangeText={(title) => setForm((prev) => ({ ...prev, title }))} />
        <TextField label="Tag / categoria" value={form.tag} onChangeText={(tag) => setForm((prev) => ({ ...prev, tag }))} />
        <TextField label="Conteúdo" multiline value={form.content} onChangeText={(content) => setForm((prev) => ({ ...prev, content }))} />
      </SectionCard>

      <SectionCard title="Minhas anotações">
        {notes.length === 0 ? (
          <EmptyState title="Sem anotações" subtitle="Crie sua primeira anotação para organizar lembretes e informações rápidas." />
        ) : (
          notes.map((note) => (
            <CollapsibleItemCard
              key={note.id}
              title={note.title}
              subtitle={`${note.tag || 'Sem categoria'} • Atualizada em ${shortDate(note.updatedAt)}`}
              expanded={expandedNoteId === note.id}
              onToggle={() => setExpandedNoteId((prev) => (prev === note.id ? null : note.id))}
            >
              <Text style={styles.noteText}>{note.content}</Text>
              <Text style={styles.meta}>Criada em {shortDate(note.createdAt)}</Text>
              <View style={styles.actionsWrap}>
                <PrimaryButton label="Editar" onPress={() => editNote(note)} variant="ghost" />
                <PrimaryButton label="Excluir" onPress={() => removeNote(note)} variant="danger" />
              </View>
            </CollapsibleItemCard>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteText: { color: colors.text, lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 13 },
  actionsWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }
});
