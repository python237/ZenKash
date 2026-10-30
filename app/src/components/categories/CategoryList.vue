<template>
    <div class="category-list">
        <!-- Empty state -->
        <div v-if="categories.length === 0" class="zk-empty">
            <div class="zk-empty__icon">
                <q-icon name="o_label" size="30px" />
            </div>
            <div class="zk-empty__title">{{ emptyMessage }}</div>
        </div>

        <!-- Categories grouped by master category -->
        <section v-for="group in groups" v-else :key="group.key" class="group">
            <div class="group__head">
                <span class="zk-tile group__tile" :style="toneStyle(group.color)">
                    <q-icon :name="group.icon" size="16px" />
                </span>
                <span class="group__title">{{ group.title }}</span>
                <span class="group__count">{{ group.items.length }}</span>
            </div>

            <div class="group__card">
                <div
                    v-for="category in group.items"
                    :key="category.id"
                    class="category-row"
                    :class="{ 'category-row--retired': !category.isActive }"
                >
                    <button
                        type="button"
                        class="category-row__main"
                        @click="$emit('edit', category)"
                    >
                        <span class="zk-tile zk-tile--sm" :style="toneStyle(group.color)">
                            <q-icon :name="category.icon" size="18px" />
                        </span>
                        <span class="category-row__name">{{ category.name }}</span>
                        <span v-if="!category.isActive" class="zk-pill">
                            {{ t('categories.retired') }}
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
        </section>
    </div>
</template>

<script setup lang="ts">
import type { CategoryWithMaster } from 'src/types/category';
import { toneStyle } from 'src/services/tone';

const props = defineProps<{
    categories: CategoryWithMaster[];
    emptyMessage: string;
}>();

defineEmits<{
    edit: [category: CategoryWithMaster];
    delete: [category: CategoryWithMaster];
    restore: [category: CategoryWithMaster];
}>();

const { t } = useI18n();

/** Categories sharing the same master category */
interface CategoryGroup {
    /** Master category id (or a fallback key) */
    key: string;
    /** Master category name */
    title: string;
    /** Master category icon */
    icon: string;
    /** Master category stored color name */
    color: string;
    /** Categories filed under it */
    items: CategoryWithMaster[];
}

/**
 * Groups the categories by master category, keeping the incoming order
 * for both the groups and the categories inside each group.
 */
const groups = computed((): CategoryGroup[] => {
    const byMaster = new Map<string, CategoryGroup>();
    for (const category of props.categories) {
        const master = category.masterCategory;
        const key = master?.id ?? category.masterCategoryId;
        let group = byMaster.get(key);
        if (!group) {
            group = {
                key,
                title: master?.name ?? '-',
                icon: master?.icon ?? 'o_category',
                color: master?.color ?? 'teal',
                items: [],
            };
            byMaster.set(key, group);
        }
        group.items.push(category);
    }
    return [...byMaster.values()];
});
</script>

<style lang="scss" scoped>
.category-list {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &__head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 4px;
    }

    &__tile {
        width: 26px;
        height: 26px;
        border-radius: 8px;
    }

    &__title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: $text-secondary;
    }

    &__count {
        font-size: 12px;
        font-weight: 600;
        color: $text-muted;
    }

    &__card {
        background: $bg-card;
        border-radius: 20px;
        padding: 2px 6px 2px 14px;
        display: flex;
        flex-direction: column;
    }
}

.category-row {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 56px;

    & + & {
        border-top: 1px solid $border-light;
    }

    &--retired &__main {
        opacity: 0.6;
    }

    &__main {
        flex: 1;
        min-width: 0;
        min-height: 56px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0;
        border: 0;
        background: transparent;
        font-family: inherit;
        text-align: left;
        color: $text-primary;
        cursor: pointer;
    }

    &__name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        font-weight: 600;
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
