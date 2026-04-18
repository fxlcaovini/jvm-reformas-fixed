export type ProjectStatus = 'em_andamento' | 'atrasada' | 'concluida';
export type StageName = 'fundacao' | 'alvenaria' | 'eletrica' | 'hidraulica' | 'acabamento';
export type FinanceType = 'entrada' | 'saida';
export type FinanceCategory = 'pagamento' | 'material' | 'mao_de_obra' | 'outros';
export type MaterialStatus = 'comprado' | 'pendente';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client extends BaseEntity {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export interface Project extends BaseEntity {
  clientId: string;
  title: string;
  address: string;
  lat: number | null;
  lng: number | null;
  startDate: string;
  dueDate: string;
  status: ProjectStatus;
  totalValue: number;
  progress: number;
  notes: string;
}

export interface ProjectStage extends BaseEntity {
  projectId: string;
  stageName: StageName;
  completed: number;
  notes: string;
}

export interface Attachment extends BaseEntity {
  projectId: string | null;
  financeEntryId: string | null;
  kind: 'image' | 'video' | 'document';
  uri: string;
}

export interface FinanceEntry extends BaseEntity {
  projectId: string | null;
  type: FinanceType;
  category: FinanceCategory;
  description: string;
  amount: number;
  referenceDate: string;
  attachmentUri: string | null;
}

export interface Budget extends BaseEntity {
  projectId: string | null;
  clientId: string | null;
  title: string;
  notes: string;
  templateName: string | null;
  signatureDataUrl: string | null;
  total: number;
}

export interface BudgetItem extends BaseEntity {
  budgetId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Worker extends BaseEntity {
  name: string;
  phone: string;
  dailyRate: number;
  role: string;
}

export interface WorkerLog extends BaseEntity {
  workerId: string;
  projectId: string | null;
  workDate: string;
  amountPaid: number;
  notes: string;
}

export interface Material extends BaseEntity {
  projectId: string;
  name: string;
  quantity: number;
  unit: string;
  status: MaterialStatus;
  purchasedQuantity: number;
}

export interface DashboardStats {
  activeProjects: number;
  delayedProjects: number;
  completedProjects: number;
  receivables: number;
  expenses: number;
  profit: number;
  alerts: string[];
}
