import { db, OutboxOperation } from "../db";
import { apiFetch, ApiException } from "../api/client";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEVICE_ID_KEY = "sahai_device_id";
function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device-${generateUUID().slice(0, 8)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export class SyncManager {
  private isSyncing = false;
  private onlineStatus = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.onlineStatus = true;
        this.sync();
      });
      window.addEventListener("offline", () => {
        this.onlineStatus = false;
      });
    }
  }

  get isOnline(): boolean {
    return this.onlineStatus;
  }

  async enqueueOperation(
    entity: string,
    entityId: string,
    operationType: "create" | "update" | "delete",
    baseVersion: number,
    payload: any
  ): Promise<string> {
    const operationId = generateUUID();
    const op: OutboxOperation = {
      operation_id: operationId,
      device_id: getDeviceId(),
      entity,
      entity_id: entityId,
      operation_type: operationType,
      base_version: baseVersion,
      payload,
      created_at: new Date().toISOString(),
      attempts: 0,
      status: "pending"
    };

    await db.outbox.add(op);

    // Attempt push immediately if online
    if (this.isOnline) {
      this.sync().catch(console.error);
    }

    return operationId;
  }

  async sync(): Promise<{ success: boolean; applied: number; conflicts: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, applied: 0, conflicts: 0, error: "Sync already in progress" };
    }

    if (!this.isOnline) {
      return { success: false, applied: 0, conflicts: 0, error: "Device is currently offline" };
    }

    this.isSyncing = true;
    let appliedCount = 0;
    let conflictCount = 0;

    try {
      // 1. Fetch pending outbox operations
      const pendingOps = await db.outbox.where("status").equals("pending").toArray();

      if (pendingOps.length > 0) {
        const payload = {
          device_id: getDeviceId(),
          operations: pendingOps.map((op) => ({
            operation_id: op.operation_id,
            device_id: op.device_id,
            entity: op.entity,
            entity_id: op.entity_id,
            operation_type: op.operation_type,
            base_version: op.base_version,
            payload: op.payload
          }))
        };

        const res: any = await apiFetch("/sync/push", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        for (const item of res.results) {
          if (item.status === "applied") {
            appliedCount++;
            // Remove from outbox
            await db.outbox.delete(item.operation_id);

            // Mark entity as synced
            if (item.entity === "case") {
              await db.cases.update(item.entity_id, {
                synced: true,
                ...(item.server_version ? { version: item.server_version } : {})
              });
            } else if (item.entity === "referral") {
              await db.referrals.update(item.entity_id, {
                synced: true,
                ...(item.server_version ? { version: item.server_version } : {})
              });
            } else if (item.entity === "visit") {
              await db.visits.update(item.entity_id, { synced: true });
            }
          } else if (item.status === "conflict_queued") {
            conflictCount++;
            await db.outbox.update(item.operation_id, { status: "conflict", last_error: item.error });
            await db.conflicts.put({
              id: generateUUID(),
              operation_id: item.operation_id,
              entity: item.entity,
              entity_id: item.entity_id,
              client_payload: pendingOps.find((o) => o.operation_id === item.operation_id)?.payload || {},
              server_payload: item.server_payload || {},
              status: "pending",
              created_at: new Date().toISOString()
            });
          } else {
            await db.outbox.update(item.operation_id, { status: "failed", last_error: item.error });
          }
        }
      }

      // 2. Pull server changes
      const lastPullTime = localStorage.getItem("sahai_last_pull_time");
      const pullUrl = lastPullTime ? `/sync/pull?since=${encodeURIComponent(lastPullTime)}` : "/sync/pull";
      const pullRes: any = await apiFetch(pullUrl);

      if (pullRes && pullRes.cases) {
        for (const c of pullRes.cases) {
          const existing = await db.cases.get(c.id);
          if (!existing) {
            await db.cases.put({
              ...c,
              gravida: c.gravida || 1,
              parity: c.parity || 0,
              prior_c_section: c.prior_c_section || "no",
              birth_order: c.birth_order || 1,
              education_level: c.education_level || "secondary",
              assigned_asha_id: c.assigned_asha_id || "",
              catchment_village: c.catchment_village || "",
              consent_status: c.consent_status || "given",
              synced: true,
              updated_at: c.updated_at || new Date().toISOString()
            });
          } else if (existing.synced) {
            await db.cases.update(c.id, { ...c, synced: true });
          }
        }
        localStorage.setItem("sahai_last_pull_time", pullRes.server_time);
      }

      localStorage.setItem("sahai_last_sync_timestamp", new Date().toISOString());
      return { success: true, applied: appliedCount, conflicts: conflictCount };
    } catch (err: any) {
      return { success: false, applied: appliedCount, conflicts: conflictCount, error: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async getPendingCount(): Promise<number> {
    return db.outbox.where("status").equals("pending").count();
  }
}

export const syncManager = new SyncManager();
