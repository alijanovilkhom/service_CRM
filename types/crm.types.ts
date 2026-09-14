export type UserRole = "admin" | "manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
  avatar_url: string | null;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export type LeadStatus = "new" | "in_progress" | "waiting" | "won" | "lost";
export type LeadSource =
  | "website_form"
  | "telegram_bot"
  | "phone"
  | "referral"
  | "manual"
  | "other";

export interface Lead {
  id: string;
  client_id: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_to: string | null;
  value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "pending" | "done";

export interface Task {
  id: string;
  lead_id: string | null;
  client_id: string | null;
  assigned_to: string;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
}

export interface LeadWithRelations extends Lead {
  client_name: string;
  client_phone: string;
  assignee_name: string | null;
}

export interface ClientWithLeads extends Client {
  leads: LeadWithRelations[];
}

export interface TaskWithRelations extends Task {
  assignee_name: string;
  client_name: string | null;
  lead_status: LeadStatus | null;
}

export interface AnalyticsResponse {
  totalLeads: number;
  conversionRate: number;
  avgCloseTimeDays: number | null;
  overdueTasks: number;
  leadsOverTime: { date: string; count: number }[];
  statusBreakdown: { status: LeadStatus; count: number }[];
  sourceBreakdown: { source: LeadSource; count: number }[];
  teamPerformance?: {
    userId: string;
    userName: string;
    won: number;
    total: number;
  }[];
}
