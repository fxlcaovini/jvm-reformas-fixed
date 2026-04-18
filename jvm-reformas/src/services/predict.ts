import type { Project } from '@/types/models';

export function predictRemainingDays(project: Project, historicalProjects: Project[]) {
  const progress = Math.max(1, project.progress || 1);
  const elapsedDays = Math.max(
    1,
    Math.floor((Date.now() - new Date(project.startDate).getTime()) / 86400000)
  );
  const baseline = Math.round((elapsedDays / progress) * 100 - elapsedDays);

  const completed = historicalProjects.filter((item) => item.status === 'concluida');
  if (completed.length === 0) return baseline;

  const averageDuration =
    completed.reduce((acc, item) => {
      const diff = Math.max(1, Math.floor((new Date(item.dueDate).getTime() - new Date(item.startDate).getTime()) / 86400000));
      return acc + diff;
    }, 0) / completed.length;

  const predicted = Math.round((averageDuration * (100 - progress)) / 100);
  return Math.max(1, Math.round((baseline + predicted) / 2));
}
