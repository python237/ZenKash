import { defineStore } from 'pinia';
import type {
    MasterCategory,
    CreateMasterCategory,
    UpdateMasterCategory,
} from 'src/types/master-category';
import { CategoryType } from 'src/types/master-category';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a master category
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface MasterCategoryRow {
    id: string;
    name: string;
    type: string;
    icon: string;
    color: string;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a MasterCategory object
 * @param row - The database row containing master category data
 * @returns A MasterCategory object with properly typed fields
 */
function rowToCategory(row: MasterCategoryRow): MasterCategory {
    return {
        id: row.id,
        name: row.name,
        type: row.type as CategoryType,
        icon: row.icon,
        color: row.color,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useMasterCategoryStore = defineStore('masterCategory', () => {
    // State
    const categories = ref<MasterCategory[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Computed property that returns all income-type master categories
     */
    const incomeCategories = computed(() =>
        categories.value.filter((c: MasterCategory) => c.type === CategoryType.Income),
    );

    /**
     * Computed property that returns all expense-type master categories
     */
    const expenseCategories = computed(() =>
        categories.value.filter((c: MasterCategory) => c.type === CategoryType.Expense),
    );

    /**
     * Retrieves a master category by its unique identifier
     * @param id - The master category's unique identifier
     * @returns The master category if found, undefined otherwise
     */
    const getCategoryById = (id: string) =>
        categories.value.find((c: MasterCategory) => c.id === id);

    /** Alias for getCategoryById for backwards compatibility */
    const masterCategories = categories;
    /** Alias for getCategoryById for backwards compatibility */
    const getMasterCategoryById = getCategoryById;

    /**
     * Loads all master categories from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when master categories are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<MasterCategoryRow>(
                'SELECT * FROM master_categories ORDER BY name',
            );
            categories.value = rows.map(rowToCategory);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new master category in the database and adds it to the store
     * @param data - The master category creation data including name, type, icon, and color
     * @returns Promise resolving to the newly created master category
     */
    async function create(data: CreateMasterCategory): Promise<MasterCategory> {
        isLoading.value = true;
        try {
            const now = new Date();
            const category: MasterCategory = {
                id: generateId(),
                ...data,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO master_categories (id, name, type, icon, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    category.id,
                    category.name,
                    category.type,
                    category.icon,
                    category.color,
                    category.createdAt.toISOString(),
                    category.updatedAt.toISOString(),
                ],
            );

            categories.value.push(category);
            return category;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing master category in the database and store
     * @param id - The unique identifier of the master category to update
     * @param data - The partial master category data to update
     * @returns Promise resolving to the updated master category, or null if not found
     */
    async function update(id: string, data: UpdateMasterCategory): Promise<MasterCategory | null> {
        isLoading.value = true;
        try {
            const existing = categories.value.find((c: MasterCategory) => c.id === id);
            if (!existing) return null;

            const updated: MasterCategory = {
                id: existing.id,
                name: data.name ?? existing.name,
                type: data.type ?? existing.type,
                icon: data.icon ?? existing.icon,
                color: data.color ?? existing.color,
                createdAt: existing.createdAt,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE master_categories 
         SET name = ?, type = ?, icon = ?, color = ?, updated_at = ?
         WHERE id = ?`,
                [
                    updated.name,
                    updated.type,
                    updated.icon,
                    updated.color,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = categories.value.findIndex((c: MasterCategory) => c.id === id);
            if (index !== -1) {
                categories.value[index] = updated;
            }
            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a master category from the database and removes it from the store
     * @param id - The unique identifier of the master category to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = categories.value.findIndex((c: MasterCategory) => c.id === id);
            if (index === -1) return false;

            await execute('DELETE FROM master_categories WHERE id = ?', [id]);

            categories.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        categories,
        masterCategories,
        isLoading,
        isInitialized,
        // Getters
        incomeCategories,
        expenseCategories,
        getCategoryById,
        getMasterCategoryById,
        // Actions
        loadAll,
        create,
        update,
        remove,
    };
});
