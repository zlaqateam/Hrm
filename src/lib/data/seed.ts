// Demo data. Used by the demo adapter (browser) and by scripts/seed-supabase.ts.
// Relative imports only, so the seed script can run with tsx outside Next.
import type {
  Announcement, AppNotification, Attendance, BreakRow, BreakType, Holiday, Kudos, Channel, Department, KeyResult, LeaveRequest, Message,
  MetricType, Objective, OkrTemplate, OrgSettings, Profile, Role, TableName, Tables, Task,
} from '../types';
import { addDays, toDateStr, uuid } from '../format';

export const DEMO_PASSWORD = 'Zlaqa@123';

export const DEMO_ACCOUNTS: { email: string; label: string; hint: string }[] = [
  { email: 'superadmin@zlaqa.demo', label: 'Super Admin', hint: 'Full control, settings, all data' },
  { email: 'manager@zlaqa.demo', label: 'Manager · Engineering', hint: 'Team attendance, OKRs, approvals' },
  { email: 'member@zlaqa.demo', label: 'Member · Developer', hint: 'Check-in, breaks, own OKRs' },
];

export function defaultSettings(): OrgSettings {
  return {
    id: 1,
    company_name: 'Zlaqa AI Labs',
    tagline: 'Let every voice be heard.',
    primary_color: '#111111',
    timezone: 'Asia/Kolkata',
    work_start: '09:30',
    work_end: '18:30',
    late_after_minutes: 15,
    half_day_minutes: 240,
    full_day_minutes: 480,
    weekly_off: [0],
    selfie_on_check_in: true,
    selfie_on_check_out: true,
    capture_location: true,
    break_limits: { tea: 15, lunch: 45, personal: 15 },
    max_tea_breaks: 2,
    daily_plan_prompt: true,
    mood_pulse: true,
    geofence_mode: 'off',
    office_lat: 11.2588,
    office_lng: 75.7804,
    office_radius_m: 250,
    kudos_values: ['Ownership', 'Teamwork', 'Courage', 'Craft', 'Customer love', 'Kindness'],
    modules: { okrs: true, performance: true, tasks: true, chat: true, leave: true, announcements: true, kudos: true, calendar: true },
    performance_weights: { attendance: 30, punctuality: 20, okr: 40, tasks: 10 },
    okr_cycles: ['Q3 2026', 'Q4 2026', 'Q1 2027'],
    current_cycle: 'Q4 2026',
    members_can_create_okrs: true,
    members_see_team: true,
    leave_types: ['Casual', 'Sick', 'Earned', 'Work From Home'],
    leave_quota: { Casual: 12, Sick: 12, Earned: 15, 'Work From Home': 24 },
    dashboard_widgets: {
      super_admin: ['welcome', 'org_stats', 'insights', 'team_pulse', 'attendance_trend', 'leaderboard', 'dept_breakdown', 'okr_progress', 'standup', 'kudos', 'celebrations', 'leave_pending'],
      admin: ['welcome', 'my_shift', 'org_stats', 'insights', 'team_status', 'standup', 'team_pulse', 'okr_progress', 'leaderboard', 'leave_pending', 'kudos', 'my_tasks'],
      member: ['welcome', 'my_shift', 'my_performance', 'my_okrs', 'my_tasks', 'kudos', 'celebrations', 'announcements', 'standup'],
    },
    updated_at: new Date().toISOString(),
  };
}

export type SeedData = { [K in TableName]: Tables[K][] } & {
  credentials: Record<string, { password: string; user_id: string }>;
};

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type KrSpec = [string, MetricType, number, number, number, string]; // title, type, start, target, current, unit

export function buildSeed(): SeedData {
  const rnd = mulberry32(2026);
  const r = (min: number, max: number) => min + rnd() * (max - min);
  const now = new Date();
  const nowIso = now.toISOString();
  const settings = defaultSettings();

  // ---------- departments ----------
  const mkDept = (name: string, color: string, description: string): Department => ({
    id: uuid(), name, color, description, head_id: null, dashboard_widgets: null, created_at: nowIso,
  });
  const D = {
    lead: mkDept('Leadership', '#111111', 'Founders and strategy'),
    eng: mkDept('Engineering', '#059669', 'Platform, AI models and apps'),
    research: mkDept('Research & Documentation', '#7c3aed', 'Clinical research, validation, docs'),
    creative: mkDept('Creative & Content', '#db2777', 'Brand, reels, design and copy'),
    ops: mkDept('Operations', '#d97706', 'Admin, finance, people ops'),
    sales: mkDept('Sales & Partnerships', '#0d9488', 'Clinics, schools and B2B partners'),
  };
  type DK = keyof typeof D;

  // ---------- people ----------
  const people: [string, string, Role, DK, string, string | null, string][] = [
    ['superadmin@zlaqa.demo', 'Super Admin (Founder)', 'super_admin', 'lead', 'Founder', null, 'ZQ-001'],
    ['manager@zlaqa.demo', 'Arjun Menon', 'admin', 'eng', 'Engineering Manager', 'superadmin@zlaqa.demo', 'ZQ-002'],
    ['ops.manager@zlaqa.demo', 'Fathima Rahman', 'admin', 'ops', 'Operations Manager', 'superadmin@zlaqa.demo', 'ZQ-003'],
    ['creative.manager@zlaqa.demo', 'Nikhil Das', 'admin', 'creative', 'Creative Lead', 'superadmin@zlaqa.demo', 'ZQ-004'],
    ['member@zlaqa.demo', 'Rahul Varma', 'member', 'eng', 'Frontend Developer', 'manager@zlaqa.demo', 'ZQ-010'],
    ['dev2@zlaqa.demo', 'Sneha Pillai', 'member', 'eng', 'Backend Developer', 'manager@zlaqa.demo', 'ZQ-011'],
    ['dev3@zlaqa.demo', 'Irfan Ali', 'member', 'eng', 'ML Engineer', 'manager@zlaqa.demo', 'ZQ-012'],
    ['research@zlaqa.demo', 'Meera Nair', 'member', 'research', 'Research Associate', 'superadmin@zlaqa.demo', 'ZQ-013'],
    ['design@zlaqa.demo', 'Aditya Kumar', 'member', 'creative', 'Visual Designer', 'creative.manager@zlaqa.demo', 'ZQ-014'],
    ['content@zlaqa.demo', 'Hiba Salim', 'member', 'creative', 'Content Writer', 'creative.manager@zlaqa.demo', 'ZQ-015'],
    ['ops1@zlaqa.demo', 'Joel Thomas', 'member', 'ops', 'Operations Executive', 'ops.manager@zlaqa.demo', 'ZQ-016'],
    ['sales@zlaqa.demo', 'Ayesha Khan', 'member', 'sales', 'Partnerships Executive', 'superadmin@zlaqa.demo', 'ZQ-017'],
  ];
  const byEmail: Record<string, Profile> = {};
  for (const [email, full_name, role, dk, designation, , employee_code] of people) {
    byEmail[email] = {
      id: uuid(), email, full_name, role, department_id: D[dk].id, manager_id: null, designation,
      phone: '+91 9' + Math.floor(r(100000000, 999999999)), employee_code, join_date: toDateStr(addDays(now, -Math.round(r(120, 900)))),
      avatar_url: null, status: 'active', created_at: nowIso,
    };
  }
  for (const p of people) if (p[5]) byEmail[p[0]].manager_id = byEmail[p[5]].id;
  // a couple of upcoming work anniversaries for the Celebrations widget
  const anniv = (email: string, inDays: number, years: number) => {
    const d = addDays(now, inDays);
    d.setFullYear(d.getFullYear() - years);
    byEmail[email].join_date = toDateStr(d);
  };
  anniv('manager@zlaqa.demo', 4, 2);
  anniv('research@zlaqa.demo', 11, 1);
  anniv('superadmin@zlaqa.demo', 23, 3);
  const id = (email: string) => byEmail[email].id;
  D.lead.head_id = id('superadmin@zlaqa.demo');
  D.eng.head_id = id('manager@zlaqa.demo');
  D.ops.head_id = id('ops.manager@zlaqa.demo');
  D.creative.head_id = id('creative.manager@zlaqa.demo');
  D.research.head_id = id('research@zlaqa.demo');
  D.sales.head_id = id('sales@zlaqa.demo');
  const profiles = Object.values(byEmail);
  const sa = id('superadmin@zlaqa.demo');

  // ---------- holidays ----------
  const holidays: Holiday[] = [
    ['2026-10-02', 'Gandhi Jayanti'], ['2026-12-25', 'Christmas'], ['2027-01-01', "New Year's Day"], ['2027-01-26', 'Republic Day'],
    [toDateStr(addDays(now, 9)), 'Team offsite (demo)'],
  ].map(([date, name]) => ({ id: uuid(), date, name, created_at: nowIso }));
  const holidaySet = new Set(holidays.map((h) => h.date));

  // ---------- attendance + breaks (last 30 days + today) ----------
  const plans = ['Finish dashboard charts', 'Clinic demo prep', 'Write API tests', 'Reel edit + captions', 'Interview 3 users', 'Vendor follow-ups', 'Fix login bug', 'Partner calls', 'Label audio samples', 'Sprint planning'];
  const wraps = ['Shipped charts to review', 'Demo deck done', 'Tests at 70%', 'Reel scheduled', '2 interviews done', 'All vendors paid', 'Bug fixed + deployed', '3 calls, 1 pilot', '250 samples labelled', 'Sprint board ready'];
  const attendance: Attendance[] = [];
  const breaks: BreakRow[] = [];
  const at = (date: string, minutes: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setMinutes(minutes);
    return d;
  };
  const lateCut = 9 * 60 + 30 + settings.late_after_minutes;
  for (const p of profiles) {
    for (let i = 30; i >= 0; i--) {
      const day = addDays(now, -i);
      const date = toDateStr(day);
      if (settings.weekly_off.includes(day.getDay()) || holidaySet.has(date)) continue;
      const isToday = i === 0;
      if (!isToday && rnd() < 0.06) continue; // absent
      const inMin = Math.round(r(9 * 60 + 5, 9 * 60 + 55));
      const inAt = at(date, inMin);
      if (isToday && (inAt > now || rnd() < 0.2)) continue; // not in yet
      const attId = uuid();
      const rec: Attendance = {
        id: attId, user_id: p.id, date, check_in: inAt.toISOString(), check_out: null,
        check_in_selfie: null, check_out_selfie: null, check_in_location: '11.25880,75.78040', check_out_location: null,
        status: inMin > lateCut ? 'late' : 'present', work_minutes: 0, break_minutes: 0, notes: '',
        plan: i < 6 ? plans[Math.floor(rnd() * plans.length)] : '', summary: '', mood: rnd() < 0.85 ? Math.min(5, Math.max(2, Math.round(r(2.6, 5.4)))) : null, created_at: inAt.toISOString(),
      };
      const halfDay = rnd() < 0.04;
      const outAt = at(date, halfDay ? Math.round(r(12 * 60 + 30, 13 * 60)) : Math.round(r(18 * 60, 19 * 60 + 15)));
      const plan: [BreakType, number, number][] = [
        ['tea', 11 * 60, r(8, 20)],
        ['lunch', 13 * 60 + 10, r(30, 55)],
        ['tea', 16 * 60, r(8, 20)],
      ];
      let breakTotal = 0;
      for (const [type, startMin, dur] of plan) {
        const s = at(date, startMin + Math.round(r(-10, 15)));
        if (s <= inAt || s >= outAt) continue;
        if (isToday && s > now) break;
        const e = new Date(s.getTime() + dur * 60000);
        const open = isToday && e > now;
        breaks.push({ id: uuid(), attendance_id: attId, user_id: p.id, type, start_at: s.toISOString(), end_at: open ? null : e.toISOString(), created_at: s.toISOString() });
        if (open) break;
        breakTotal += dur;
      }
      rec.break_minutes = Math.round(breakTotal);
      const hasOpenBreak = breaks.some((b) => b.attendance_id === attId && !b.end_at);
      if (!isToday || (outAt < now && !hasOpenBreak)) {
        rec.check_out = outAt.toISOString();
        rec.check_out_location = rec.check_in_location;
        if (rec.plan) rec.summary = wraps[plans.indexOf(rec.plan)] ?? '';
        rec.work_minutes = Math.max(0, Math.round((outAt.getTime() - inAt.getTime()) / 60000 - breakTotal));
        if (rec.work_minutes < settings.half_day_minutes) rec.status = 'half_day';
      }
      attendance.push(rec);
    }
  }

  // ---------- OKRs ----------
  const objectives: Objective[] = [];
  const key_results: KeyResult[] = [];
  const cyc = settings.current_cycle;
  const addObj = (o: Partial<Objective> & { title: string }, krs: KrSpec[]) => {
    const oid = uuid();
    objectives.push({
      id: oid, description: '', level: 'individual', owner_id: null, department_id: null, cycle: cyc, parent_id: null,
      status: 'on_track', due_date: '2026-12-31', created_by: sa, created_at: nowIso, ...o,
    });
    for (const [title, metric_type, start_value, target_value, current_value, unit] of krs) {
      key_results.push({ id: uuid(), objective_id: oid, title, metric_type, start_value, target_value, current_value, unit, weight: 1, created_at: nowIso });
    }
    return oid;
  };
  const company = addObj(
    { title: 'Launch Zlaqa 2.0 to first paying clinics', level: 'company', owner_id: sa, department_id: D.lead.id, description: 'North star for the quarter' },
    [['Sign paying clinic partners', 'number', 0, 5, 2, 'clinics'], ['Reach active users', 'number', 0, 1000, 430, 'users'], ['Platform uptime', 'percent', 95, 99.5, 98.9, '']],
  );
  addObj({ title: 'Ship a reliable speech-analysis engine', level: 'department', owner_id: id('manager@zlaqa.demo'), department_id: D.eng.id, parent_id: company, created_by: id('manager@zlaqa.demo') },
    [['Model latency (ms, lower is better)', 'number', 900, 300, 520, 'ms'], ['Close bugs from backlog', 'number', 0, 40, 26, 'bugs']]);
  addObj({ title: 'Grow brand reach', level: 'department', owner_id: id('creative.manager@zlaqa.demo'), department_id: D.creative.id, parent_id: company, created_by: id('creative.manager@zlaqa.demo') },
    [['Instagram followers', 'number', 1200, 5000, 2600, ''], ['Publish reels', 'number', 0, 24, 11, 'reels']]);
  addObj({ title: 'Streamline operations', level: 'department', owner_id: id('ops.manager@zlaqa.demo'), department_id: D.ops.id, created_by: id('ops.manager@zlaqa.demo') },
    [['Onboarding time (days)', 'number', 7, 2, 4, 'days'], ['Vendor payments on time', 'percent', 80, 100, 92, '']]);
  addObj({ title: 'Build a qualified partner pipeline', level: 'department', owner_id: id('sales@zlaqa.demo'), department_id: D.sales.id, parent_id: company },
    [['Qualified leads', 'number', 0, 60, 22, 'leads'], ['Pilot agreements signed', 'number', 0, 6, 2, '']]);
  addObj({ title: 'Publish clinical validation evidence', level: 'department', owner_id: id('research@zlaqa.demo'), department_id: D.research.id },
    [['User interviews completed', 'number', 0, 30, 18, ''], ['Whitepaper published', 'boolean', 0, 1, 0, '']]);
  const indiv: Record<string, [string, KrSpec[]]> = {
    'member@zlaqa.demo': ['Deliver the new therapy dashboard UI', [['Screens shipped', 'number', 0, 12, 8, ''], ['Lighthouse score', 'number', 60, 95, 84, '']]],
    'dev2@zlaqa.demo': ['Harden the API layer', [['Endpoints with tests', 'percent', 20, 90, 55, ''], ['P95 API latency (ms)', 'number', 600, 200, 340, 'ms']]],
    'dev3@zlaqa.demo': ['Improve stammer detection accuracy', [['F1 score', 'percent', 71, 88, 79, ''], ['New labelled samples', 'number', 0, 2000, 900, '']]],
    'design@zlaqa.demo': ['Refresh the brand kit', [['Templates delivered', 'number', 0, 15, 9, ''], ['Arabic brand kit done', 'boolean', 0, 1, 0, '']]],
    'content@zlaqa.demo': ['Tell 12 real stories', [['Stories published', 'number', 0, 12, 7, ''], ['Avg reel watch-through', 'percent', 25, 45, 31, '']]],
    'ops1@zlaqa.demo': ['Zero-friction office ops', [['SOPs documented', 'number', 0, 10, 6, ''], ['Ticket resolution < 24h', 'percent', 60, 95, 82, '']]],
  };
  for (const [email, [title, krs]] of Object.entries(indiv)) {
    addObj({ title, level: 'individual', owner_id: id(email), department_id: byEmail[email].department_id, created_by: byEmail[email].manager_id ?? sa }, krs);
  }

  // ---------- OKR templates ----------
  const tkr = (title: string, metric_type: MetricType, start_value: number, target_value: number, unit = '') => ({ title, metric_type, start_value, target_value, unit, weight: 1 });
  const tpl = (name: string, description: string, department_id: string | null, scope: OkrTemplate['scope'], objectives: OkrTemplate['objectives']): OkrTemplate => ({
    id: uuid(), name, description, department_id, scope, objectives, created_by: sa, created_at: nowIso,
  });
  const okr_templates: OkrTemplate[] = [
    tpl('Developer · Quarterly', 'Standard OKRs for individual engineers', D.eng.id, 'individual', [
      { title: 'Deliver high-quality features', description: '', key_results: [tkr('Features shipped to production', 'number', 0, 6), tkr('Code review turnaround (hours)', 'number', 48, 24, 'h'), tkr('Unit test coverage', 'percent', 40, 80)] },
      { title: 'Grow technical depth', description: '', key_results: [tkr('Tech talks / docs written', 'number', 0, 2), tkr('Certification completed', 'boolean', 0, 1)] },
    ]),
    tpl('Engineering Manager · Quarterly', 'Team health and delivery', D.eng.id, 'department', [
      { title: 'Run a fast, healthy team', description: '', key_results: [tkr('Sprint completion rate', 'percent', 60, 85), tkr('Platform uptime', 'percent', 98, 99.5), tkr('1:1s held with every report', 'number', 0, 12)] },
    ]),
    tpl('Sales · Pipeline', 'Revenue pipeline for partnership roles', D.sales.id, 'individual', [
      { title: 'Grow revenue pipeline', description: '', key_results: [tkr('Qualified leads', 'number', 0, 50), tkr('Demos delivered', 'number', 0, 20), tkr('Deals closed', 'number', 0, 5), tkr('New revenue', 'currency', 0, 500000, '₹')] },
    ]),
    tpl('Creative · Audience growth', 'Content and brand OKRs', D.creative.id, 'individual', [
      { title: 'Grow our audience', description: '', key_results: [tkr('New followers', 'number', 0, 2000), tkr('Reels published', 'number', 0, 20), tkr('Engagement rate', 'percent', 2, 6)] },
    ]),
    tpl('Operations · Excellence', 'Process and service levels', D.ops.id, 'individual', [
      { title: 'Operational excellence', description: '', key_results: [tkr('SOPs documented', 'number', 0, 10), tkr('Requests resolved within SLA', 'percent', 70, 95)] },
    ]),
    tpl('Research · Evidence', 'Research and documentation output', D.research.id, 'individual', [
      { title: 'Generate evidence and insights', description: '', key_results: [tkr('User interviews', 'number', 0, 25), tkr('Reports published', 'number', 0, 3)] },
    ]),
    tpl('Company · North Star', 'Quarterly company objective skeleton', null, 'company', [
      { title: 'Hit the quarterly north star', description: '', key_results: [tkr('Revenue', 'currency', 0, 1000000, '₹'), tkr('Active users', 'number', 0, 1000), tkr('NPS', 'number', 0, 50)] },
    ]),
    tpl('Personal growth (any role)', 'Self-development OKR for every member', null, 'individual', [
      { title: 'Grow as a professional', description: '', key_results: [tkr('Courses completed', 'number', 0, 2), tkr('Mentor sessions', 'number', 0, 6), tkr('On-time check-ins', 'percent', 80, 95)] },
    ]),
  ];

  // ---------- chat ----------
  const ch = (name: string, description: string, type: Channel['type'], department_id: string | null = null): Channel => ({
    id: uuid(), name, description, type, department_id, member_ids: [], created_by: sa, created_at: nowIso,
  });
  const general = ch('general', 'Company-wide conversation', 'public');
  const channels: Channel[] = [
    general,
    ch('wins', 'Celebrate progress, big and small', 'public'),
    ...Object.values(D).map((d) => ch(d.name.toLowerCase().replace(/[^a-z]+/g, '-'), `${d.name} team`, 'department', d.id)),
  ];
  const msgs: [string, string, number][] = [
    ['superadmin@zlaqa.demo', 'Good morning team! Q4 OKRs are live. Please review yours by Friday.', 180],
    ['manager@zlaqa.demo', 'Engineering OKRs updated. Latency is trending well 🚀', 150],
    ['member@zlaqa.demo', 'Therapy dashboard screens 7 and 8 are in review.', 120],
    ['creative.manager@zlaqa.demo', 'New reel goes out at 6pm. Share it on your stories!', 90],
    ['ops.manager@zlaqa.demo', 'Reminder: apply for December leave before the 20th.', 45],
    ['research@zlaqa.demo', '18 of 30 interviews done. Insights doc shared in #research-documentation.', 20],
  ];
  const messages: Message[] = msgs.map(([e, body, minsAgo]) => ({
    id: uuid(), channel_id: general.id, user_id: id(e), body, created_at: new Date(now.getTime() - minsAgo * 60000).toISOString(),
  }));

  // ---------- tasks ----------
  const tk = (title: string, email: string, status: Task['status'], priority: Task['priority'], dueIn: number): Task => ({
    id: uuid(), title, description: '', assignee_id: id(email), department_id: byEmail[email].department_id, status, priority,
    due_date: toDateStr(addDays(now, dueIn)), key_result_id: null, created_by: byEmail[email].manager_id ?? sa, created_at: nowIso,
  });
  const tasks: Task[] = [
    tk('Build progress chart component', 'member@zlaqa.demo', 'in_progress', 'high', 2),
    tk('Fix login redirect bug', 'member@zlaqa.demo', 'todo', 'medium', 4),
    tk('Write API tests for sessions', 'dev2@zlaqa.demo', 'review', 'high', 1),
    tk('Label 300 new audio samples', 'dev3@zlaqa.demo', 'in_progress', 'medium', 5),
    tk('Design December campaign posters', 'design@zlaqa.demo', 'todo', 'high', 3),
    tk('Script for founder story reel', 'content@zlaqa.demo', 'done', 'medium', -1),
    tk('Vendor payment run', 'ops1@zlaqa.demo', 'done', 'high', -2),
    tk('Prepare clinic pitch deck', 'sales@zlaqa.demo', 'in_progress', 'high', 2),
    tk('Synthesize interview insights', 'research@zlaqa.demo', 'todo', 'medium', 6),
    tk('Quarterly hiring plan', 'manager@zlaqa.demo', 'in_progress', 'medium', 7),
  ];

  // ---------- leave ----------
  const lv = (email: string, type: string, from: number, to: number, status: LeaveRequest['status'], reason: string): LeaveRequest => ({
    id: uuid(), user_id: id(email), type, start_date: toDateStr(addDays(now, from)), end_date: toDateStr(addDays(now, to)),
    days: to - from + 1, reason, status, approver_id: status === 'pending' ? null : byEmail[email].manager_id, decided_at: status === 'pending' ? null : nowIso, created_at: nowIso,
  });
  const leave_requests: LeaveRequest[] = [
    lv('member@zlaqa.demo', 'Casual', 5, 6, 'pending', 'Family function'),
    lv('design@zlaqa.demo', 'Sick', 1, 1, 'pending', 'Not feeling well'),
    lv('dev2@zlaqa.demo', 'Earned', -12, -10, 'approved', 'Trip home'),
    lv('ops1@zlaqa.demo', 'Work From Home', -3, -3, 'approved', 'Plumber visit'),
  ];

  const announcements: Announcement[] = [
    { id: uuid(), title: 'Welcome to Zlaqa Team OS', body: 'Check in with a selfie every morning, log your breaks, and keep your OKRs updated weekly. Let every voice be heard.', department_id: null, pinned: true, created_by: sa, created_at: nowIso },
    { id: uuid(), title: 'Sprint demo on Friday 4pm', body: 'Engineering will demo the new therapy dashboard. Everyone welcome.', department_id: D.eng.id, pinned: false, created_by: id('manager@zlaqa.demo'), created_at: new Date(now.getTime() - 86400000).toISOString() },
  ];

  const kd = (f: string, t: string, value: string, message: string, hoursAgo: number): Kudos => ({
    id: uuid(), from_id: id(f), to_id: id(t), value, message, created_at: new Date(now.getTime() - hoursAgo * 3600000).toISOString(),
  });
  const kudos: Kudos[] = [
    kd('manager@zlaqa.demo', 'member@zlaqa.demo', 'Craft', 'The new progress charts are beautiful and fast. Clinics will love them.', 3),
    kd('creative.manager@zlaqa.demo', 'content@zlaqa.demo', 'Courage', 'Your founder-story script made the whole team emotional. Real storytelling.', 20),
    kd('superadmin@zlaqa.demo', 'research@zlaqa.demo', 'Ownership', '18 interviews in two weeks. You are carrying our evidence base.', 30),
    kd('dev2@zlaqa.demo', 'dev3@zlaqa.demo', 'Teamwork', 'Thanks for pairing on the latency bug till late.', 52),
    kd('ops.manager@zlaqa.demo', 'ops1@zlaqa.demo', 'Kindness', 'Helped the new joiner set up everything on day one.', 70),
    kd('sales@zlaqa.demo', 'design@zlaqa.demo', 'Customer love', 'The clinic pitch posters got a "wow" in the meeting.', 96),
  ];
  const nt = (email: string, title: string, body: string, link: string, kind: string, minsAgo: number): AppNotification => ({
    id: uuid(), user_id: id(email), title, body, link, kind, read_at: null, created_at: new Date(now.getTime() - minsAgo * 60000).toISOString(),
  });
  const notifications: AppNotification[] = [
    nt('member@zlaqa.demo', 'Arjun sent you kudos', 'Craft · The new progress charts are beautiful…', '/kudos', 'kudos', 180),
    nt('member@zlaqa.demo', 'New task: Fix login redirect bug', 'Due in 4 days', '/tasks', 'task', 400),
    nt('manager@zlaqa.demo', 'Rahul Varma requested leave', 'Casual · 2 days', '/leave', 'leave', 60),
    nt('superadmin@zlaqa.demo', 'OKR check-in due', 'Update your Q4 key results before Friday', '/okrs', 'okr', 240),
  ];

  const credentials: SeedData['credentials'] = {};
  for (const p of profiles) credentials[p.email] = { password: DEMO_PASSWORD, user_id: p.id };

  return {
    org_settings: [settings],
    departments: Object.values(D),
    profiles,
    attendance,
    breaks,
    objectives,
    key_results,
    kr_updates: [],
    okr_templates,
    channels,
    messages,
    tasks,
    leave_requests,
    announcements,
    audit_log: [],
    holidays,
    kudos,
    notifications,
    credentials,
  };
}
