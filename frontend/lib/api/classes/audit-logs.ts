import { BaseAPI, route } from "../base";

export interface AuditLogEntry {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  action: "create" | "update" | "delete";
  resource: string;
  path: string;
  createdAt: Date | string;
}

export class AuditLogsAPI extends BaseAPI {
  getAll() {
    return this.http.get<AuditLogEntry[]>({ url: route("/audit-logs") });
  }
}
