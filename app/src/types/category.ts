import type { MasterCategory } from './master-category';

/**
 * Represents a detailed transaction category.
 * Categories are sub-divisions of master categories, providing granular
 * classification for transactions (e.g., "Rent" under "Essential Needs").
 */
export interface Category {
    /** Unique identifier for the category */
    id: string;
    /** Display name of the category */
    name: string;
    /** Reference to the parent master category */
    masterCategoryId: string;
    /** Icon identifier for visual representation */
    icon: string;
    /**
     * Whether the category is still offered when recording a transaction.
     *
     * A category already used by a transaction cannot be deleted — the history
     * would lose its label — so it is retired instead: kept for the past,
     * hidden from new entries.
     */
    isActive: boolean;
    /** Timestamp when the category was created */
    createdAt: Date;
    /** Timestamp when the category was last updated */
    updatedAt: Date;
}

/**
 * Category with its parent master category data populated.
 * Used when displaying categories with their hierarchical context.
 */
export interface CategoryWithMaster extends Category {
    /** The parent master category, if available */
    masterCategory: MasterCategory | undefined;
}

/**
 * Data required to create a new category.
 * Excludes auto-generated fields (id, createdAt, updatedAt); a new category is
 * always active.
 */
export type CreateCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>;

/**
 * Data for updating an existing category.
 * All fields are optional to allow partial updates.
 */
export type UpdateCategory = Partial<CreateCategory> & {
    /** Retire the category, or bring it back */
    isActive?: boolean;
};
