import type { RequestMetricsDto, ResourceDto } from "@/lib/dto";
import type { CreateResourceInput } from "@/lib/validators";

export function resourcesQueryKey(projectId: string) {
  return ["resources", projectId] as const;
}

export function requestMetricsQueryKey(projectId: string) {
  return ["requests", projectId] as const;
}

export async function fetchProjectRequestMetrics(projectId: string): Promise<RequestMetricsDto> {
  const response = await fetch(`/api/projects/${projectId}/requests`);
  if (!response.ok) throw new Error("Failed to load request metrics");
  return response.json();
}

export async function fetchResources(projectId: string): Promise<ResourceDto[]> {
  const response = await fetch(`/api/projects/${projectId}/resources`);
  if (!response.ok) throw new Error("Failed to load resources");
  return response.json();
}

export async function createResource(
  projectId: string,
  input: CreateResourceInput,
): Promise<ResourceDto> {
  const response = await fetch(`/api/projects/${projectId}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to create resource");
  return response.json();
}
