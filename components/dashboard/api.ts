import type { ProjectDto } from "@/lib/dto";
import type { CreateProjectInput } from "@/lib/validators";

export const PROJECTS_QUERY_KEY = ["projects"] as const;

export async function fetchProjects(): Promise<ProjectDto[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) throw new Error("Failed to load projects");
  return response.json();
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDto> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to create project");
  return response.json();
}
