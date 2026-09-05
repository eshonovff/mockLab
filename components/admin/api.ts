import type { AdminProjectDto, AdminStatsDto, AdminUsersListDto } from "@/lib/dto";
import type { UpdateUserInput } from "@/lib/validators";

export const ADMIN_STATS_QUERY_KEY = ["admin", "stats"] as const;
export const ADMIN_PROJECTS_QUERY_KEY = ["admin", "projects"] as const;

export function adminUsersQueryKey(page: number, search: string) {
  return ["admin", "users", { page, search }] as const;
}

export async function fetchAdminStats(): Promise<AdminStatsDto> {
  const response = await fetch("/api/admin/stats");
  if (!response.ok) throw new Error("Failed to load stats");
  return response.json();
}

export async function fetchAdminUsers(page: number, search: string): Promise<AdminUsersListDto> {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);

  const response = await fetch(`/api/admin/users?${params}`);
  if (!response.ok) throw new Error("Failed to load users");
  return response.json();
}

export async function updateAdminUser(id: string, input: UpdateUserInput) {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to update user");
  return response.json();
}

export async function fetchAdminProjects(): Promise<AdminProjectDto[]> {
  const response = await fetch("/api/admin/projects");
  if (!response.ok) throw new Error("Failed to load projects");
  return response.json();
}

export async function deleteAdminProject(id: string): Promise<void> {
  const response = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete project");
}
