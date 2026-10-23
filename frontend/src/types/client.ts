export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export interface ClientSummaryCounts {
  contentPlans: number;
  tasks: number;
  contentItems: number;
}

export interface Client {
  id: string;
  name: string;
  category: string;
  onboardingDate: string;
  status: ClientStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: ClientSummaryCounts;
}

export interface ClientFormData {
  name: string;
  category: string;
  onboardingDate: string; // YYYY-MM-DD format for HTML date input
  status: ClientStatus;
  notes: string;
}
