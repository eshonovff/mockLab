import type { ResourceDto } from "@/lib/dto";
import type { CreateResourceInput } from "@/lib/validators";

export function resourcesQueryKey(projectId: string) {
  return ["resources", projectId] as const;
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
