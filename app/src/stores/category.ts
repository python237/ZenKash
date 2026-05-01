import { defineStore } from 'pinia';
import type { Category, CreateCategory, UpdateCategory } from 'src/types/category';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a category
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface CategoryRow {
    id: string;
    name: string;
    master_category_id: string;
    icon: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a Category object
 * @param row - The database row containing category data
 * @returns A Category object with properly typed fields
 */
function rowToCategory(row: CategoryRow): Category {
    return {
        id: row.id,
        name: row.name,
        masterCategoryId: row.master_category_id,
        icon: row.icon ?? 'label',
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useCategoryStore = defineStore('category', () => {
    // State
    const categories = ref<Category[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves all categories belonging to a specific master category
     * @param masterCategoryId - The master category's unique identifier
     * @returns Array of categories under the specified master category
     */
    const getCategoriesByMasterId = (masterCategoryId: string) =>
        categories.value.filter((c: Category) => c.masterCategoryId === masterCategoryId);

    /**
     * Retrieves a category by its unique identifier
     * @param id - The category's unique identifier
     * @returns The category if found, undefined otherwise
     */
    const getCategoryById = (id: string) => categories.value.find((c: Category) => c.id === id);

    /**
     * Loads all categories from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when categories are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<CategoryRow>('SELECT * FROM categories ORDER BY name');
            categories.value = rows.map(rowToCategory);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new category in the database and adds it to the store
     * @param data - The category creation data including name, master category ID, and optional icon
     * @returns Promise resolving to the newly created category
     */
    async function create(data: CreateCategory): Promise<Category> {
        isLoading.value = true;
        try {
            const now = new Date();
            const category: Category = {
                id: generateId(),
                ...data,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO categories (id, name, master_category_id, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    category.id,
                    category.name,
                    category.masterCategoryId,
                    category.icon,
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
     * Updates an existing category in the database and store
     * @param id - The unique identifier of the category to update
     * @param data - The partial category data to update
     * @returns Promise resolving to the updated category, or null if not found
     */
    async function update(id: string, data: UpdateCategory): Promise<Category | null> {
        isLoading.value = true;
        try {
            const existing = categories.value.find((c: Category) => c.id === id);
            if (!existing) return null;

            const updated: Category = {
                id: existing.id,
                name: data.name ?? existing.name,
                masterCategoryId: data.masterCategoryId ?? existing.masterCategoryId,
                icon: data.icon ?? existing.icon,
                createdAt: existing.createdAt,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE categories 
         SET name = ?, master_category_id = ?, icon = ?, updated_at = ?
         WHERE id = ?`,
                [
                    updated.name,
                    updated.masterCategoryId,
                    updated.icon,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = categories.value.findIndex((c: Category) => c.id === id);
            if (index !== -1) {
                categories.value[index] = updated;
            }
            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a category from the database and removes it from the store
     * @param id - The unique identifier of the category to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = categories.value.findIndex((c: Category) => c.id === id);
            if (index === -1) return false;

            await execute('DELETE FROM categories WHERE id = ?', [id]);
            categories.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        categories,
        isLoading,
        isInitialized,
        // Getters
        getCategoriesByMasterId,
        getCategoryById,
        // Actions
        loadAll,
        create,
        update,
        remove,
    };
});
