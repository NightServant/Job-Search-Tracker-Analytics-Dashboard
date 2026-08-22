// Job status type
export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export type WorkMode = 'remote' | 'hybrid' | 'onsite';

// Job interface matching database schema
export interface Job {
  id: string;
  user_id: string;
  company: string;
  role: string;
  salary_min: number | null;
  salary_max: number | null;
  url: string | null;
  status: JobStatus;
  date_applied: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  contact_notes: string | null;
  location: string | null;
  work_mode: WorkMode | null;
  source: string | null;
  is_referral: boolean;
  tags: string[];
  tech_stack: string[];
  created_at: string;
  updated_at: string;
}

// Form data for creating/updating jobs
export interface JobFormData {
  company: string;
  role: string;
  salary_min?: number | null;
  salary_max?: number | null;
  url?: string | null;
  status: JobStatus;
  date_applied?: string | null;
  notes?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_linkedin?: string | null;
  contact_notes?: string | null;
  location?: string | null;
  work_mode?: WorkMode | null;
  source?: string | null;
  is_referral?: boolean;
  tags?: string[];
  tech_stack?: string[];
}

export interface JobStatusHistoryEntry {
  id: string;
  job_id: string;
  user_id: string;
  from_status: JobStatus;
  to_status: JobStatus;
  changed_at: string;
}

// User from Supabase auth
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Job statistics for dashboard
export interface JobStats {
  totalJobs: number;
  totalApplications: number;
  interviews: number;
  offers: number;
  rejections: number;
  conversionRate: number;
  offerRate: number;
  statusDistribution: Record<JobStatus, number>;
}

// Chart data types
export interface TimeSeriesDataPoint {
  date: string;
  count: number;
}

export interface StatusDataPoint {
  status: JobStatus;
  count: number;
  color: string;
}

// Status configuration with colors and labels
export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bgColor: string }> = {
  wishlist: {
    label: 'Wishlist',
    color: '#71717a',
    bgColor: 'bg-zinc-500',
  },
  applied: {
    label: 'Applied',
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
  },
  interviewing: {
    label: 'Interviewing',
    color: '#eab308',
    bgColor: 'bg-yellow-500',
  },
  offer: {
    label: 'Offer',
    color: '#22c55e',
    bgColor: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgColor: 'bg-red-500',
  },
};

// View mode for jobs page
export type ViewMode = 'list' | 'kanban';

export type JobAutofillField =
  | 'company'
  | 'role'
  | 'location'
  | 'source'
  | 'salary_min'
  | 'salary_max'
  | 'url';

export interface JobAutofillResult {
  values: Partial<
    Pick<
      JobFormData,
      'company' | 'role' | 'location' | 'source' | 'salary_min' | 'salary_max' | 'url'
    >
  >;
  confidence: Partial<Record<JobAutofillField, number>>;
  warnings: string[];
}
