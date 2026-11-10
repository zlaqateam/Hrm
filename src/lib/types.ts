// ------------------------------------------------------------------
// Domain types. Mirrors supabase/migrations/0001_schema.sql 1:1.
// If you add a column in SQL, add it here too.
// ------------------------------------------------------------------

export type ID = string;
export type Role = 'super_admin' | 'admin' | 'member';

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Manager',
  member: 'Member',
};

export type ModuleId = 'okrs' | 'performance' | 'tasks' | 'chat' | 'leave' | 'announcements' | 'kudos' | 'calendar';
export const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'okrs', label: 'OKRs & Templates' },
  { id: 'performance', label: 'Performance' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'chat', label: 'Team Chat' },
  { id: 'leave', label: 'Leave' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'kudos', label: 'Kudos & recognition' },
  { id: 'calendar', label: 'Calendar & holidays' },
];

export type WidgetId =
  | 'welcome'
  | 'my_shift'
  | 'org_stats'
  | 'team_status'
  | 'attendance_trend'
  | 'okr_progress'
  | 'my_okrs'
  | 'leaderboard'
  | 'dept_breakdown'
  | 'announcements'
  | 'my_tasks'
  | 'leave_pending'
  | 'my_performance'
  | 'insights'
  | 'team_pulse'
  | 'standup'
  | 'kudos'
  | 'celebrations';

export const WIDGETS: { id: WidgetId; label: string; description: string }[] = [
  { id: 'welcome', label: 'Welcome banner', description: 'Greeting, date and tagline' },
  { id: 'my_shift', label: 'My shift', description: 'Today check-in, worked time, break status' },
  { id: 'org_stats', label: 'Team stats', description: 'Headcount, present %, on break, late, OKR avg' },
  { id: 'team_status', label: 'Live team status', description: 'Who is working, on break, out' },
  { id: 'attendance_trend', label: 'Attendance trend', description: 'Last 14 working days, present %' },
  { id: 'okr_progress', label: 'OKR progress', description: 'Company + team objectives this cycle' },
  { id: 'my_okrs', label: 'My OKRs', description: 'My objectives and progress' },
  { id: 'leaderboard', label: 'Leaderboard', description: 'Top performance scores' },
  { id: 'dept_breakdown', label: 'Department breakdown', description: 'Headcount, present %, OKR % by department' },
  { id: 'announcements', label: 'Announcements', description: 'Latest announcements' },
  { id: 'my_tasks', label: 'My tasks', description: 'Open tasks assigned to me' },
  { id: 'leave_pending', label: 'Leave requests', description: 'Pending approvals / my pending requests' },
  { id: 'my_performance', label: 'My performance', description: 'Score with breakdown' },
  { id: 'insights', label: 'Smart insights', description: 'Late patterns, missing check-outs, OKRs at risk, break overuse' },
  { id: 'team_pulse', label: 'Team pulse', description: 'Average mood shared at check-in, last 7 days' },
  { id: 'standup', label: 'Daily standup', description: "Today's focus and wrap-ups from the team" },
  { id: 'kudos', label: 'Kudos', description: 'Latest recognition across the team' },
  { id: 'celebrations', label: 'Celebrations', description: 'Work anniversaries and upcoming holidays' },
];

export type BreakType = 'tea' | 'lunch' | 'personal';
export const BREAK_LABEL: Record<BreakType, string> = { tea: 'Tea break', lunch: 'Lunch break', personal: 'Personal break' };

export interface OrgSettings {
  id: number;
  company_name: string;
  tagline: string;
  primary_color: string;
  timezone: string;
  work_start: string; // "09:30"
  work_end: string; // "18:30"
  late_after_minutes: number;
  half_day_minutes: number;
  full_day_minutes: number;
  weekly_off: number[]; // 0 = Sunday
  selfie_on_check_in: boolean;
  selfie_on_check_out: boolean;
  capture_location: boolean;
  break_limits: Record<BreakType, number>;
  max_tea_breaks: number;
  daily_plan_prompt: boolean;
  mood_pulse: boolean;
  geofence_mode: 'off' | 'flag' | 'block';
  office_lat: number | null;
  office_lng: number | null;
  office_radius_m: number;
  kudos_values: string[];
  modules: Record<ModuleId, boolean>;
  performance_weights: { attendance: number; punctuality: number; okr: number; tasks: number };
  okr_cycles: string[];
  current_cycle: string;
  members_can_create_okrs: boolean;
  members_see_team: boolean;
  leave_types: string[];
  leave_quota: Record<string, number>;
  dashboard_widgets: Record<Role, WidgetId[]>;
  updated_at: string;
}

export interface Department {
  id: ID;
  name: string;
  description: string;
  color: string;
  head_id: ID | null;
  dashboard_widgets: WidgetId[] | null; // null = use role default
  created_at: string;
}

export interface Profile {
  id: ID;
  email: string;
  full_name: string;
  role: Role;
  department_id: ID | null;
  manager_id: ID | null;
  designation: string;
  phone: string;
  employee_code: string;
  join_date: string;
  avatar_url: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';

export interface Attendance {
  id: ID;
  user_id: ID;
  date: string; // YYYY-MM-DD (local)
  check_in: string | null;
  check_out: string | null;
  check_in_selfie: string | null;
  check_out_selfie: string | null;
  check_in_location: string | null;
  check_out_location: string | null;
  status: AttendanceStatus;
  work_minutes: number;
  break_minutes: number;
  notes: string;
  plan: string; // today's focus (shared at check-in)
  summary: string; // wrap-up (shared at check-out)
  mood: number | null; // 1-5 pulse, optional
  created_at: string;
}

export interface BreakRow {
  id: ID;
  attendance_id: ID;
  user_id: ID;
  type: BreakType;
  start_at: string;
  end_at: string | null;
  created_at: string;
}

export type OkrLevel = 'company' | 'department' | 'individual';
export type OkrStatus = 'on_track' | 'at_risk' | 'off_track' | 'done';
export type MetricType = 'number' | 'percent' | 'currency' | 'boolean';

export interface Objective {
  id: ID;
  title: string;
  description: string;
  level: OkrLevel;
  owner_id: ID | null;
  department_id: ID | null;
  cycle: string;
  parent_id: ID | null;
  status: OkrStatus;
  due_date: string | null;
  created_by: ID;
  created_at: string;
}

export interface KeyResult {
  id: ID;
  objective_id: ID;
  title: string;
  metric_type: MetricType;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string;
  weight: number;
  created_at: string;
}

export interface KrUpdate {
  id: ID;
  key_result_id: ID;
  user_id: ID;
  value: number;
  note: string;
  created_at: string;
}

export interface TemplateKr {
  title: string;
  metric_type: MetricType;
  start_value: number;
  target_value: number;
  unit: string;
  weight: number;
}
export interface TemplateObjective {
  title: string;
  description: string;
  key_results: TemplateKr[];
}
export interface OkrTemplate {
  id: ID;
  name: string;
  description: string;
  department_id: ID | null;
  scope: OkrLevel;
  objectives: TemplateObjective[];
  created_by: ID;
  created_at: string;
}

export interface Channel {
  id: ID;
  name: string;
  description: string;
  type: 'public' | 'department' | 'private';
  department_id: ID | null;
  member_ids: ID[];
  created_by: ID;
  created_at: string;
}

export interface Message {
  id: ID;
  channel_id: ID;
  user_id: ID;
  body: string;
  created_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export interface Task {
  id: ID;
  title: string;
  description: string;
  assignee_id: ID | null;
  department_id: ID | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  key_result_id: ID | null;
  created_by: ID;
  created_at: string;
}

export interface LeaveRequest {
  id: ID;
  user_id: ID;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id: ID | null;
  decided_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: ID;
  title: string;
  body: string;
  department_id: ID | null;
  pinned: boolean;
  created_by: ID;
  created_at: string;
}

export interface AuditLog {
  id: ID;
  actor_id: ID | null;
  action: 'insert' | 'update' | 'delete';
  entity: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

export interface Holiday {
  id: ID;
  date: string;
  name: string;
  created_at: string;
}

export interface Kudos {
  id: ID;
  from_id: ID;
  to_id: ID;
  value: string;
  message: string;
  created_at: string;
}

export interface AppNotification {
  id: ID;
  user_id: ID;
  title: string;
  body: string;
  link: string;
  kind: string;
  read_at: string | null;
  created_at: string;
}

export interface Tables {
  org_settings: OrgSettings;
  departments: Department;
  profiles: Profile;
  attendance: Attendance;
  breaks: BreakRow;
  objectives: Objective;
  key_results: KeyResult;
  kr_updates: KrUpdate;
  okr_templates: OkrTemplate;
  channels: Channel;
  messages: Message;
  tasks: Task;
  leave_requests: LeaveRequest;
  announcements: Announcement;
  audit_log: AuditLog;
  holidays: Holiday;
  kudos: Kudos;
  notifications: AppNotification;
}
export type TableName = keyof Tables;
export const TABLES: TableName[] = [
  'org_settings', 'departments', 'profiles', 'attendance', 'breaks', 'objectives', 'key_results',
  'kr_updates', 'okr_templates', 'channels', 'messages', 'tasks', 'leave_requests', 'announcements', 'audit_log', 'holidays', 'kudos', 'notifications',
];
