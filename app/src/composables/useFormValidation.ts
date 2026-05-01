/**
 * Form Validation Composable
 *
 * Provides reactive form validation using Zod schemas.
 * Handles form state, validation errors, and field touch tracking.
 * @module composables/useFormValidation
 */

import type { z } from 'zod/v4';
import { ref, reactive, computed } from 'vue';

/**
 * Creates a form validation composable with Zod schema validation.
 * @template T - The Zod object schema type
 * @param schema - The Zod schema to validate against
 * @param initialValues - The initial form values matching the schema type
 * @returns An object containing form state, validation methods, and error tracking
 * @example
 * ```ts
 * const schema = z.object({ name: z.string().min(1), amount: z.number().positive() });
 * const { form, errors, validate, reset } = useFormValidation(schema, { name: '', amount: 0 });
 * ```
 */
export function useFormValidation<T extends z.ZodObject<z.ZodRawShape>>(
    schema: T,
    initialValues: z.infer<T>,
) {
    /**
     *
     */
    type FormData = z.infer<T>;

    const form = reactive({ ...initialValues }) as FormData;
    const errors = ref<Record<string, string>>({});
    const touched = ref<Record<string, boolean>>({});

    /**
     * Gets the validation error for a specific field.
     * Only returns the error if the field has been touched.
     * @param field - The field name to get the error for
     * @returns The error message if the field is touched and has an error, undefined otherwise
     */
    function getError(field: keyof FormData): string | undefined {
        return touched.value[field as string] ? errors.value[field as string] : undefined;
    }

    /**
     * Marks a field as touched and triggers validation for that field.
     * Used to show validation errors only after user interaction.
     * @param field - The field name to mark as touched
     */
    function touch(field: keyof FormData) {
        touched.value[field as string] = true;
        validateField(field);
    }

    /**
     * Validates a single field against the schema.
     * Updates the errors ref with the field's validation state.
     * @param field - The field name to validate
     */
    function validateField(field: keyof FormData) {
        const result = schema.safeParse(form);
        if (!result.success) {
            const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
            if (fieldError) {
                errors.value[field as string] = fieldError.message;
            } else {
                delete errors.value[field as string];
            }
        } else {
            delete errors.value[field as string];
        }
    }

    /**
     * Validates the entire form against the schema.
     * Marks all fields as touched and collects all validation errors.
     * @returns True if the form is valid, false otherwise
     */
    function validate(): boolean {
        // Touch all fields
        Object.keys(form).forEach((key) => {
            touched.value[key] = true;
        });

        const result = schema.safeParse(form);
        if (!result.success) {
            errors.value = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as string;
                if (!errors.value[field]) {
                    errors.value[field] = issue.message;
                }
            });
            return false;
        }

        errors.value = {};
        return true;
    }

    /**
     * Resets the form to its initial state or to the provided values.
     * Clears all errors and touched states.
     * @param values - Optional partial values to merge with initial values
     */
    function reset(values?: Partial<FormData>) {
        Object.assign(form, initialValues, values);
        errors.value = {};
        touched.value = {};
    }

    const isValid = computed(() => {
        const result = schema.safeParse(form);
        return result.success;
    });

    return {
        form,
        errors,
        touched,
        getError,
        touch,
        validate,
        reset,
        isValid,
    };
}
