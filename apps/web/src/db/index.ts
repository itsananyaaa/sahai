import Dexie, { Table } from "dexie";

export interface LocalCase {
  id: string;
  case_code: string;
  first_name: string;
  age: number;
  lmp_date?: string;
  edd_date?: string;
  gestational_age_weeks?: number;
  gravida: number;
  parity: number;
  prior_c_section: string;
  birth_order: number;
  education_level: string;
  household_autonomy?: string;
  assigned_asha_id: string;
  catchment_village: string;
  nearest_facility_id?: string;
  consent_status: string;
  status: string;
  version: number;
  synced: boolean;
  updated_at: string;
}

export interface LocalVisit {
  id: string;
  case_id: string;
  asha_id: string;
  visit_number: number;
  visit_date: string;
  notes?: string;
  supersedes_visit_id?: string;
  observations: any[];
  danger_signs: string[];
  synced: boolean;
  created_at: string;
}

export interface LocalAssessment {
  id: string;
  case_id: string;
  visit_id?: string;
  overall_score: number;
  completeness: number;
  lower_bound: number;
  upper_bound: number;
  band: string;
  explanation: any;
  created_at: string;
}

export interface LocalReferral {
  id: string;
  case_id: string;
  visit_id?: string;
  reason_codes: string[];
  priority: string;
  priority_override_reason?: string;
  receiving_facility_id: string;
  status: string;
  appointment_date?: string;
  acknowledged_by?: string;
  outcome?: string;
  transport_status?: string;
  version: number;
  synced: boolean;
  created_at: string;
}

export interface LocalFollowUp {
  id: string;
  case_id: string;
  asha_id: string;
  due_date: string;
  type: string;
  status: string;
  rescheduled_from?: string;
  outcome?: string;
  notes?: string;
  version: number;
  synced: boolean;
}

export interface LocalDraft {
  id: string;
  entity_type: string;
  entity_id?: string;
  payload: any;
  updated_at: string;
}

export interface OutboxOperation {
  operation_id: string;
  device_id: string;
  entity: string;
  entity_id: string;
  operation_type: "create" | "update" | "delete";
  base_version: number;
  payload: any;
  created_at: string;
  attempts: number;
  status: "pending" | "processing" | "failed" | "conflict";
  last_error?: string;
}

export interface LocalConflict {
  id: string;
  operation_id: string;
  entity: string;
  entity_id: string;
  client_payload: any;
  server_payload: any;
  status: "pending" | "resolved";
  created_at: string;
}

export class SahaiDatabase extends Dexie {
  cases!: Table<LocalCase, string>;
  visits!: Table<LocalVisit, string>;
  assessments!: Table<LocalAssessment, string>;
  referrals!: Table<LocalReferral, string>;
  follow_ups!: Table<LocalFollowUp, string>;
  drafts!: Table<LocalDraft, string>;
  outbox!: Table<OutboxOperation, string>;
  conflicts!: Table<LocalConflict, string>;

  constructor() {
    super("SahaiLocalDB");
    this.version(1).stores({
      cases: "id, case_code, assigned_asha_id, status, synced, updated_at",
      visits: "id, case_id, asha_id, visit_date, synced",
      assessments: "id, case_id, band, created_at",
      referrals: "id, case_id, receiving_facility_id, priority, status, synced",
      follow_ups: "id, case_id, asha_id, due_date, status, synced",
      drafts: "id, [entity_type+entity_id], updated_at",
      outbox: "operation_id, entity, entity_id, status, created_at",
      conflicts: "id, operation_id, status, created_at"
    });
  }
}

export const db = new SahaiDatabase();
