/**
 * Represents an investment project (startup, crowdfunding, etc.).
 * Unlike securities (stocks/crypto), projects track injections and dividends
 * rather than quantity and rate. Examples: Comparo, startup investments.
 */
export interface Project {
    /** Unique identifier for the project */
    id: string;
    /** Display name of the project */
    name: string;
    /** Optional description of the project */
    description?: string | undefined;
    /** Total amount invested (calculated from injection transactions) */
    totalInvested: number;
    /** Total dividends received (calculated from dividend transactions) */
    totalDividends: number;
    /** Timestamp when the project was created */
    createdAt: Date;
    /** Timestamp when the project was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new project.
 * Financial totals are calculated from transactions, not set directly.
 */
export interface CreateProject {
    /** Display name of the project */
    name: string;
    /** Optional description of the project */
    description?: string | undefined;
}

/**
 * Data for updating an existing project.
 * All fields are optional to allow partial updates.
 */
export type UpdateProject = Partial<CreateProject>;

/**
 * Project with calculated performance statistics.
 * Used for displaying project performance in the UI.
 */
export interface ProjectWithStats extends Project {
    /** Return on investment: (totalDividends / totalInvested) × 100 */
    roi: number;
    /** Net gain: totalDividends - totalInvested */
    netGain: number;
}

/**
 * Aggregated project statistics for the dashboard.
 * Provides overview of all investment projects and per-project breakdown.
 */
export interface ProjectSummary {
    /** Total amount invested across all projects */
    totalInvested: number;
    /** Total dividends received across all projects */
    totalDividends: number;
    /** Overall ROI across all projects */
    totalRoi: number;
    /** Number of active projects */
    projectCount: number;
    /** Statistics for each individual project */
    byProject: Array<{
        /** Project identifier */
        projectId: string;
        /** Project display name */
        projectName: string;
        /** Amount invested in this project */
        invested: number;
        /** Dividends received from this project */
        dividends: number;
        /** ROI for this project */
        roi: number;
    }>;
}
