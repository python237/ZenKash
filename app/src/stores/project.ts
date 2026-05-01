import { defineStore } from 'pinia';
import type { Project, CreateProject, UpdateProject, ProjectWithStats } from 'src/types/project';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a project
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface ProjectRow {
    id: string;
    name: string;
    description: string | null;
    total_invested: number;
    total_dividends: number;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a Project object
 * @param row - The database row containing project data
 * @returns A Project object with properly typed fields
 */
function rowToProject(row: ProjectRow): Project {
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        totalInvested: row.total_invested,
        totalDividends: row.total_dividends,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useProjectStore = defineStore('project', () => {
    // State
    const projects = ref<Project[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves a project by its unique identifier
     * @param id - The project's unique identifier
     * @returns The project if found, undefined otherwise
     */
    const getProjectById = (id: string): Project | undefined =>
        projects.value.find((p: Project) => p.id === id);

    /**
     * Computed property that returns all projects enriched with calculated statistics
     * Includes ROI percentage and net gain calculations
     */
    const getProjectsWithStats = computed((): ProjectWithStats[] => {
        return projects.value.map((p: Project) => ({
            ...p,
            roi: p.totalInvested > 0 ? (p.totalDividends / p.totalInvested) * 100 : 0,
            netGain: p.totalDividends - p.totalInvested,
        }));
    });

    /**
     * Loads all projects from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when projects are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<ProjectRow>('SELECT * FROM projects ORDER BY name');
            projects.value = rows.map(rowToProject);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Forces a reload of all projects from the database
     * Useful for syncing after external updates like transaction changes
     * @returns Promise that resolves when projects are reloaded
     */
    async function reload(): Promise<void> {
        isLoading.value = true;
        try {
            const rows = await query<ProjectRow>('SELECT * FROM projects ORDER BY name');
            projects.value = rows.map(rowToProject);
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new project in the database and adds it to the store
     * Initializes with zero invested and zero dividends
     * @param data - The project creation data including name and optional description
     * @returns Promise resolving to the newly created project
     */
    async function create(data: CreateProject): Promise<Project> {
        isLoading.value = true;
        try {
            const now = new Date();
            const project: Project = {
                id: generateId(),
                name: data.name,
                description: data.description,
                totalInvested: 0,
                totalDividends: 0,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO projects (id, name, description, total_invested, total_dividends, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    project.id,
                    project.name,
                    project.description ?? null,
                    project.totalInvested,
                    project.totalDividends,
                    project.createdAt.toISOString(),
                    project.updatedAt.toISOString(),
                ],
            );

            projects.value.push(project);
            return project;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing project in the database and store
     * @param id - The unique identifier of the project to update
     * @param data - The partial project data to update (name and/or description)
     * @returns Promise resolving to the updated project, or null if not found
     */
    async function update(id: string, data: UpdateProject): Promise<Project | null> {
        isLoading.value = true;
        try {
            const existing = projects.value.find((p: Project) => p.id === id);
            if (!existing) return null;

            const updated: Project = {
                id: existing.id,
                name: data.name ?? existing.name,
                description: data.description ?? existing.description,
                totalInvested: existing.totalInvested,
                totalDividends: existing.totalDividends,
                createdAt: existing.createdAt,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
                [updated.name, updated.description ?? null, updated.updatedAt.toISOString(), id],
            );

            const index = projects.value.findIndex((p: Project) => p.id === id);
            if (index !== -1) {
                projects.value[index] = updated;
            }

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a project from the database and removes it from the store
     * @param id - The unique identifier of the project to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = projects.value.findIndex((p: Project) => p.id === id);
            if (index === -1) return false;

            await execute('DELETE FROM projects WHERE id = ?', [id]);
            projects.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        projects,
        isLoading,
        isInitialized,
        // Getters
        getProjectById,
        getProjectsWithStats,
        // Actions
        loadAll,
        reload,
        create,
        update,
        remove,
    };
});
