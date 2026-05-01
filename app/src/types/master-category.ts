/**
 * Enumeration of category types for financial classification.
 * Determines whether a category is for incoming or outgoing money.
 */
export enum CategoryType {
    /** Categories for money received (salary, dividends, etc.) */
    Income = 'income',
    /** Categories for money spent (rent, food, etc.) */
    Expense = 'expense',
}

/**
 * Represents a high-level category grouping (meta-category).
 * Master categories provide top-level organization for analyzing
 * income distribution (e.g., "Essential Needs", "Salaried Income").
 * Each master category contains multiple sub-categories.
 */
export interface MasterCategory {
    /** Unique identifier for the master category */
    id: string;
    /** Display name of the master category */
    name: string;
    /** Whether this is an income or expense category */
    type: CategoryType;
    /** Icon identifier for visual representation */
    icon: string;
    /** Color code for visual distinction (hex or named color) */
    color: string;
    /** Timestamp when the master category was created */
    createdAt: Date;
    /** Timestamp when the master category was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new master category.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export type CreateMasterCategory = Omit<MasterCategory, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Data for updating an existing master category.
 * All fields are optional to allow partial updates.
 */
export type UpdateMasterCategory = Partial<CreateMasterCategory>;
