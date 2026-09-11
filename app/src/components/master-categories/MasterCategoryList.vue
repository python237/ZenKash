<template>
    <div class="category-list">
        <!-- Empty state -->
        <div v-if="categories.length === 0" class="empty-state">
            <q-icon name="category" size="64px" color="grey-4" />
            <p class="text-grey-6">{{ emptyMessage }}</p>
        </div>

        <!-- Categories list -->
        <q-list v-else class="list-container">
            <q-item
                v-for="category in categories"
                :key="category.id"
                class="category-item"
                :class="{ 'category-item--retired': !category.isActive }"
            >
                <q-item-section avatar>
                    <q-avatar :style="avatarStyle(category)">
                        <q-icon :name="category.icon" color="white" />
                    </q-avatar>
                </q-item-section>

                <q-item-section>
                    <q-item-label class="text-weight-medium">
                        {{ category.name }}
                        <q-badge v-if="!category.isActive" color="grey-5" class="q-ml-xs">
                            {{ t('categories.retired') }}
                        </q-badge>
                    </q-item-label>
                    <q-item-label caption class="text-grey-6">
                        {{ t('masterCategories.subCategoryCount', { count: countFor(category.id) }) }}
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
                            v-if="!category.isActive"
                            dense
                            icon="restart_alt"
                            color="primary"
                            @click="$emit('restore', category)"
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
import type { Category } from 'src/types/category';
import type { MasterCategory } from 'src/types/master-category';
import BtnIcon from '../buttons/BtnIcon.vue';

defineProps<{
    categories: MasterCategory[];
    emptyMessage: string;
}>();

defineEmits<{
    edit: [category: MasterCategory];
    delete: [category: MasterCategory];
    restore: [category: MasterCategory];
}>();

const { t } = useI18n();
const categoryStore = useCategoryStore();

/** Sub-categories filed under a master category, retired ones included. */
const countByMaster = computed(() => {
    const counts = new Map<string, number>();
    for (const category of categoryStore.categories as Category[]) {
        counts.set(category.masterCategoryId, (counts.get(category.masterCategoryId) ?? 0) + 1);
    }
    return counts;
});

/**
 * Number of sub-categories under a master category.
 * @param masterCategoryId - The master category identifier
 * @returns How many categories point at it
 */
function countFor(masterCategoryId: string): number {
    return countByMaster.value.get(masterCategoryId) ?? 0;
}

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
 * Generates the inline style object for a category's avatar.
 * @param {MasterCategory} category - The master category to get the avatar style for.
 * @returns {{ backgroundColor: string }} An object containing the background color CSS property.
 */
function avatarStyle(category: MasterCategory) {
    return {
        backgroundColor: colorMap[category.color] || colorMap.teal,
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

.category-item--retired {
    opacity: 0.55;
}

.category-item {
    padding: 12px 16px;
    background-color: white;
    margin: 0 16px 8px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .q-avatar {
        width: 44px;
        height: 44px;

        .q-icon {
            font-size: 22px;
        }
    }
}

.action-buttons {
    display: flex;
    gap: 4px;
}
</style>
