import type { ResourceDto } from "@/lib/dto";
import type { SchemaPreviewInput, UpdateResourceInput } from "@/lib/validators";

export async function updateResource(id: string, input: UpdateResourceInput): Promise<ResourceDto> {
  const response = await fetch(`/api/resources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to save resource");
  return response.json();
}

export async function resetResource(id: string): Promise<ResourceDto> {
  const response = await fetch(`/api/resources/${id}/reset`, { method: "POST" });
  if (!response.ok) throw new Error("Failed to reset resource");
  return response.json();
}

export async function previewSchema(input: SchemaPreviewInput): Promise<Record<string, unknown>[]> {
  const response = await fetch("/api/schema/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to generate preview");
  return response.json();
}
