<template>
    <div class="category-list">
        <!-- Empty state -->
        <div v-if="categories.length === 0" class="zk-empty">
            <div class="zk-empty__icon">
                <q-icon name="o_category" size="30px" />
            </div>
            <div class="zk-empty__title">{{ emptyMessage }}</div>
        </div>

        <!-- Master categories list -->
        <div v-else class="list-card">
            <div
                v-for="category in categories"
                :key="category.id"
                class="category-row"
                :class="{ 'category-row--retired': !category.isActive }"
            >
                <button type="button" class="category-row__main" @click="$emit('edit', category)">
                    <span class="zk-tile" :style="toneStyle(category.color)">
                        <q-icon :name="category.icon" size="20px" />
                    </span>
                    <span class="category-row__body">
                        <span class="category-row__title">
                            <span class="category-row__name">{{ category.name }}</span>
                            <span v-if="!category.isActive" class="zk-pill">
                                {{ t('categories.retired') }}
                            </span>
                        </span>
                        <span class="category-row__count">
                            {{
                                t('masterCategories.subCategoryCount', {
                                    count: countFor(category.id),
                                })
                            }}
                        </span>
                    </span>
                </button>

                <q-btn
                    flat
                    round
                    icon="more_vert"
                    class="category-row__options"
                    :aria-label="t('common.options')"
                >
                    <q-menu anchor="bottom right" self="top right" auto-close>
                        <q-list class="row-menu">
                            <q-item clickable @click="$emit('edit', category)">
                                <q-item-section avatar>
                                    <q-icon name="o_edit" size="20px" />
                                </q-item-section>
                                <q-item-section>{{ t('common.edit') }}</q-item-section>
                            </q-item>
                            <q-item
                                v-if="!category.isActive"
                                clickable
                                @click="$emit('restore', category)"
                            >
                                <q-item-section avatar>
                                    <q-icon name="restart_alt" size="20px" />
                                </q-item-section>
                                <q-item-section>{{ t('common.restore') }}</q-item-section>
                            </q-item>
                            <q-item
                                clickable
                                class="row-menu__danger"
                                @click="$emit('delete', category)"
                            >
                                <q-item-section avatar>
                                    <q-icon name="o_delete" size="20px" />
                                </q-item-section>
                                <q-item-section>{{ t('common.delete') }}</q-item-section>
                            </q-item>
                        </q-list>
                    </q-menu>
                </q-btn>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Category } from 'src/types/category';
import type { MasterCategory } from 'src/types/master-category';
import { toneStyle } from 'src/services/tone';

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
</script>

<style lang="scss" scoped>
.list-card {
    background: $bg-card;
    border-radius: $radius-card;
    padding: 4px 6px 4px 14px;
    display: flex;
    flex-direction: column;
}

.category-row {
    display: flex;
    align-items: center;
    gap: 4px;

    & + & {
        border-top: 1px solid $border-light;
    }

    &--retired &__main {
        opacity: 0.6;
    }

    &__main {
        flex: 1;
        min-width: 0;
        min-height: 64px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border: 0;
        background: transparent;
        font-family: inherit;
        text-align: left;
        color: $text-primary;
        cursor: pointer;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__title {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    &__name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        font-weight: 700;
    }

    &__count {
        font-size: 12px;
        color: $text-secondary;
    }

    &__options {
        width: 44px;
        height: 44px;
        color: $text-secondary;
    }
}

.row-menu {
    min-width: 180px;
    padding: 4px 0;

    .q-item {
        min-height: 48px;
        font-weight: 600;
        color: $text-primary;
    }

    .q-item__section--avatar {
        min-width: 36px;
        color: $text-secondary;
    }

    &__danger,
    &__danger .q-item__section--avatar {
        color: $negative;
    }
}
</style>
