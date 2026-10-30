<template>
    <q-page class="zk-page">
        <!-- Tabs -->
        <TabNav v-model="activeTab" :tabs="categoryTabs" />

        <!-- Search -->
        <label class="search">
            <q-icon name="search" size="20px" />
            <span class="sr-only">{{ t('common.search') }}</span>
            <input
                v-model="searchQuery"
                type="search"
                class="search__input"
                :placeholder="t('categories.searchPlaceholder')"
            />
        </label>

        <!-- Tab panels -->
        <q-tab-panels v-model="activeTab" animated class="tab-panels">
            <!-- Expense categories -->
            <q-tab-panel name="expense" class="q-pa-none">
                <CategoryList
                    :categories="filterBySearch(expenseCategoriesWithMaster)"
                    :empty-message="emptyMessage"
                    @edit="editCategory"
                    @delete="confirmDelete"
                    @restore="restoreCategory"
                />
            </q-tab-panel>

            <!-- Income categories -->
            <q-tab-panel name="income" class="q-pa-none">
                <CategoryList
                    :categories="filterBySearch(incomeCategoriesWithMaster)"
                    :empty-message="emptyMessage"
                    @edit="editCategory"
                    @delete="confirmDelete"
                    @restore="restoreCategory"
                />
            </q-tab-panel>
        </q-tab-panels>

        <!-- Add/Edit Dialog -->
        <CategoryDialog
            v-model="dialogOpen"
            :category="selectedCategory"
            :master-categories="currentMasterCategories"
            @saved="onSaved"
        />

        <!-- A category used by a transaction cannot be deleted: it is retired -->
        <ModalConfirm
            v-model="deleteDialogOpen"
            :title="t('common.confirm')"
            :message="
                isUsed
                    ? t('categories.retireConfirm', { count: usageCount })
                    : t('categories.deleteConfirm')
            "
            :subtitle="isUsed ? t('categories.retireWarning') : t('categories.deleteWarning')"
            :confirm-label="isUsed ? t('categories.retire') : t('common.delete')"
            :cancel-label="t('common.cancel')"
            :variant="isUsed ? 'default' : 'danger'"
            :loading="categoryStore.isLoading"
            max-width="400px"
            @confirm="deleteCategory"
        />
    </q-page>
</template>

<script setup lang="ts">
import type { Category, CategoryWithMaster } from 'src/types/category';
import type { MasterCategory } from 'src/types/master-category';
import { CategoryType } from 'src/types/master-category';
import CategoryDialog from 'src/components/categories/CategoryDialog.vue';
import CategoryList from 'src/components/categories/CategoryList.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import TabNav from 'src/components/tabs/TabNav.vue';

const { t } = useI18n();
usePage({
    title: t('categories.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openAddDialog() }],
});

const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const transactionStore = useTransactionStore();

// Load data on mount
onMounted(async () => {
    await Promise.all([
        categoryStore.loadAll(),
        masterCategoryStore.loadAll(),
        transactionStore.loadAll(),
    ]);
});

// Active tab
const activeTab = ref<CategoryType>(CategoryType.Expense);

// Tab items
const categoryTabs = computed(() => [
    { value: CategoryType.Expense, label: t('masterCategories.types.expense') },
    { value: CategoryType.Income, label: t('masterCategories.types.income') },
]);

// Get master categories for current tab type
// Only active master categories are offered, plus the one an edited category
// already belongs to — dropping it would silently clear the field.
const currentMasterCategories = computed(() => {
    const pool =
        activeTab.value === CategoryType.Expense
            ? masterCategoryStore.expenseCategories
            : masterCategoryStore.incomeCategories;

    return pool.filter(
        (mc: MasterCategory) => mc.isActive || mc.id === selectedCategory.value?.masterCategoryId,
    );
});

// Categories with master category info
const expenseCategoriesWithMaster = computed((): CategoryWithMaster[] => {
    const expenseMasterIds = masterCategoryStore.expenseCategories.map(
        (mc: MasterCategory) => mc.id,
    );
    return categoryStore.categories
        .filter((c: Category) => expenseMasterIds.includes(c.masterCategoryId))
        .map(
            (c: Category): CategoryWithMaster => ({
                ...c,
                masterCategory: masterCategoryStore.getCategoryById(c.masterCategoryId),
            }),
        );
});

const incomeCategoriesWithMaster = computed((): CategoryWithMaster[] => {
    const incomeMasterIds = masterCategoryStore.incomeCategories.map((mc: MasterCategory) => mc.id);
    return categoryStore.categories
        .filter((c: Category) => incomeMasterIds.includes(c.masterCategoryId))
        .map(
            (c: Category): CategoryWithMaster => ({
                ...c,
                masterCategory: masterCategoryStore.getCategoryById(c.masterCategoryId),
            }),
        );
});

// Search (by category name, case and accent insensitive)
const searchQuery = ref('');

/**
 * Lowercases a label and strips its diacritics so "electricite" finds "Électricité".
 * @param value - The text to normalize
 * @returns The normalized text
 */
function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Keeps the categories whose name matches the search query.
 * @param categories - The categories of the active tab
 * @returns The matching categories (all of them when the query is empty)
 */
function filterBySearch(categories: CategoryWithMaster[]): CategoryWithMaster[] {
    const query = normalize(searchQuery.value);
    if (!query) return categories;
    return categories.filter((c) => normalize(c.name).includes(query));
}

/** Empty list message: nothing at all, or nothing matching the search. */
const emptyMessage = computed(() =>
    searchQuery.value.trim() ? t('categories.noResults') : t('categories.noCategories'),
);

// Dialog state
const dialogOpen = ref(false);
const selectedCategory = ref<CategoryWithMaster | null>(null);
const deleteDialogOpen = ref(false);
const categoryToDelete = ref<CategoryWithMaster | null>(null);

/**
 * Opens the category creation dialog with no pre-selected category.
 * @returns {void}
 */
function openAddDialog() {
    selectedCategory.value = null;
    dialogOpen.value = true;
}

/**
 * Opens the category edit dialog for the selected category.
 * @param {CategoryWithMaster} category - The category to edit
 * @returns {void}
 */
function editCategory(category: CategoryWithMaster) {
    selectedCategory.value = category;
    dialogOpen.value = true;
}

/** Transactions already filed under the category being removed. */
const usageCount = computed(() =>
    categoryToDelete.value
        ? transactionStore.getTransactionsByCategoryId(categoryToDelete.value.id).length
        : 0,
);

/**
 * A used category is never deleted: the foreign key forbids it, and the history
 * would lose its label. It is retired instead.
 */
const isUsed = computed(() => usageCount.value > 0);

/**
 * Opens the delete confirmation dialog for the selected category.
 * @param {CategoryWithMaster} category - The category to delete
 * @returns {void}
 */
function confirmDelete(category: CategoryWithMaster) {
    categoryToDelete.value = category;
    deleteDialogOpen.value = true;
}

/**
 * Brings a retired category back into the transaction form.
 * @param {CategoryWithMaster} category - The category to restore
 * @returns {Promise<void>}
 */
async function restoreCategory(category: CategoryWithMaster) {
    await categoryStore.setActive(category.id, true);
}

/**
 * Deletes the category, or retires it when transactions already use it.
 * @returns {Promise<void>}
 */
async function deleteCategory() {
    if (!categoryToDelete.value) return;

    if (isUsed.value) await categoryStore.setActive(categoryToDelete.value.id, false);
    else await categoryStore.remove(categoryToDelete.value.id);

    deleteDialogOpen.value = false;
    categoryToDelete.value = null;
}

/**
 * Callback handler when a category is successfully saved.
 * The list automatically updates via reactive state.
 * @returns {void}
 */
function onSaved() {
    // Category saved successfully
}
</script>

<style lang="scss" scoped>
.search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 14px;
    background: $bg-card;
    border: 1px solid $border-color;
    border-radius: $radius-control;
    color: $text-secondary;

    &__input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        font-family: inherit;
        font-size: 14px;
        color: $text-primary;
    }
}

.tab-panels {
    background-color: transparent;
}
</style>
