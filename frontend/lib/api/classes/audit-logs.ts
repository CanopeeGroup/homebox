import { BaseAPI, route } from "../base";

export interface AuditLogEntry {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  action: "create" | "update" | "delete";
  resource: string;
  path: string;
  count: number;
  quantity?: number | null;
  createdAt: Date | string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class AuditLogsAPI extends BaseAPI {
  getPage(page = 1, pageSize = 1000) {
    return this.http.get<AuditLogPage>({ url: route(`/audit-logs?page=${page}&pageSize=${pageSize}`) });
  }
}
