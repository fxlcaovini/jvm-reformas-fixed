import * as Notifications from 'expo-notifications';
import type { Project } from '@/types/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function scheduleDeadlineAlert(project: Project) {
  if (!(await ensureNotificationPermission())) return;
  const dueDate = new Date(project.dueDate);
  const triggerAt = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
  if (triggerAt.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Prazo de obra próximo',
      body: `${project.title} vence em breve. Revise o andamento e os custos.`
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt
    }
  });
}
