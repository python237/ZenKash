<template>
    <div class="category-list">
        <!-- Empty state -->
        <div v-if="categories.length === 0" class="empty-state">
            <q-icon name="label" size="64px" color="grey-4" />
            <p class="text-grey-6">{{ emptyMessage }}</p>
        </div>

        <!-- Categories list -->
        <q-list v-else class="list-container">
            <q-item v-for="category in categories" :key="category.id" class="category-item">
                <q-item-section avatar>
                    <q-avatar :style="avatarStyle(category)">
                        <q-icon :name="category.icon" color="white" size="20px" />
                    </q-avatar>
                </q-item-section>

                <q-item-section>
                    <q-item-label class="text-weight-medium">{{ category.name }}</q-item-label>
                    <q-item-label v-if="category.masterCategory" caption class="text-grey-6">
                        {{ category.masterCategory.name }}
                    </q-item-label>
                </q-item-section>

                <q-item-section side>
                    <div class="action-buttons">
                        <BtnIcon
                            dense
                            icon="edit"
                            color="grey-6"
                            @click="$emit('edit', category)"
                        />
                        <BtnIcon
                            dense
                            icon="delete"
                            color="grey-6"
                            @click="$emit('delete', category)"
                        />
                    </div>
                </q-item-section>
            </q-item>
        </q-list>
    </div>
</template>

<script setup lang="ts">
import type { CategoryWithMaster } from 'src/types/category';
import BtnIcon from '../buttons/BtnIcon.vue';

defineProps<{
    categories: CategoryWithMaster[];
    emptyMessage: string;
}>();

defineEmits<{
    edit: [category: CategoryWithMaster];
    delete: [category: CategoryWithMaster];
}>();

// Color mapping for avatar background
const colorMap: Record<string, string> = {
    teal: '#0d9488',
    blue: '#3b82f6',
    indigo: '#6366f1',
    purple: '#a855f7',
    pink: '#ec4899',
    red: '#ef4444',
    orange: '#f97316',
    amber: '#f59e0b',
    green: '#22c55e',
    cyan: '#06b6d4',
};

/**
 * Generates avatar style object with background color based on the category's master category color
 * @param category - The category with master category information
 * @returns Style object with backgroundColor property
 */
function avatarStyle(category: CategoryWithMaster): { backgroundColor: string } {
    const color = category.masterCategory?.color || 'teal';
    const bgColor = colorMap[color];
    return {
        backgroundColor: bgColor ?? '#0d9488', // Default teal color
    };
}
</script>

<style lang="scss" scoped>
.category-list {
    min-height: 200px;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;

    p {
        margin-top: 16px;
        font-size: 15px;
    }
}

.list-container {
    padding: 8px 0;
}

.category-item {
    padding: 12px 16px;
    background-color: white;
    margin: 0 16px 8px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .q-avatar {
        width: 40px;
        height: 40px;
    }
}

.action-buttons {
    display: flex;
    gap: 4px;
}
</style>
