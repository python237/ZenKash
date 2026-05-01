/**
 * Environment Type Declarations
 *
 * Provides TypeScript type definitions for environment variables and
 * custom JSX elements used in the Zenkash application.
 * @module env
 */

/**
 * Node.js process environment type extensions.
 * Defines environment variables available in the application.
 */
declare namespace NodeJS {
    /**
     * Process environment variables interface.
     */
    interface ProcessEnv {
        /** Current Node environment (development, production, test) */
        NODE_ENV: string;
        /** Vue Router mode configuration */
        VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
        /** Vue Router base URL path */
        VUE_ROUTER_BASE: string | undefined;
    }
}

/**
 * JSX intrinsic elements type extensions.
 * Defines custom HTML elements used in the application.
 */
declare namespace JSX {
    /**
     * Custom JSX elements interface.
     */
    interface IntrinsicElements {
        /** jeep-sqlite custom element for web SQLite support */
        'jeep-sqlite': unknown;
    }
}
