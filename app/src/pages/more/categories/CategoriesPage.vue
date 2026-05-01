<template>
    <q-page class="page-categories">
        <!-- Tabs -->
        <TabNav v-model="activeTab" :tabs="categoryTabs" />

        <!-- Tab panels -->
        <q-tab-panels v-model="activeTab" animated class="tab-panels">
            <!-- Expense categories -->
            <q-tab-panel name="expense" class="q-pa-none">
                <CategoryList
                    :categories="expenseCategoriesWithMaster"
                    :empty-message="t('categories.noCategories')"
                    @edit="editCategory"
                    @delete="confirmDelete"
                />
            </q-tab-panel>

            <!-- Income categories -->
            <q-tab-panel name="income" class="q-pa-none">
                <CategoryList
                    :categories="incomeCategoriesWithMaster"
                    :empty-message="t('categories.noCategories')"
                    @edit="editCategory"
                    @delete="confirmDelete"
                />
            </q-tab-panel>
        </q-tab-panels>

        <!-- FAB -->
        <q-page-sticky position="bottom-right" :offset="[20, 20]">
            <BtnFab icon="add" @click="openAddDialog" />
        </q-page-sticky>

        <!-- Add/Edit Dialog -->
        <CategoryDialog
            v-model="dialogOpen"
            :category="selectedCategory"
            :master-categories="currentMasterCategories"
            @saved="onSaved"
        />

        <!-- Delete confirmation -->
        <ModalConfirm
            v-model="deleteDialogOpen"
            :title="t('common.confirm')"
            :message="t('categories.deleteConfirm')"
            :subtitle="t('categories.deleteWarning')"
            :confirm-label="t('common.delete')"
            :cancel-label="t('common.cancel')"
            variant="danger"
            :loading="categoryStore.isLoading"
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
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
usePage({ title: t('categories.title'), showHeader: true, showBack: true });

const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();

// Load data on mount
onMounted(async () => {
    await Promise.all([categoryStore.loadAll(), masterCategoryStore.loadAll()]);
});

// Active tab
const activeTab = ref<CategoryType>(CategoryType.Expense);

// Tab items
const categoryTabs = computed(() => [
    { value: CategoryType.Expense, label: t('masterCategories.types.expense') },
    { value: CategoryType.Income, label: t('masterCategories.types.income') },
]);

// Get master categories for current tab type
const currentMasterCategories = computed(() => {
    return activeTab.value === CategoryType.Expense
        ? masterCategoryStore.expenseCategories
        : masterCategoryStore.incomeCategories;
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
 * Handles the category deletion after user confirmation.
 * Removes the category from the store and closes the dialog.
 * @returns {Promise<void>}
 */
async function deleteCategory() {
    if (!categoryToDelete.value) return;
    await categoryStore.remove(categoryToDelete.value.id);
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
.page-categories {
    display: flex;
    flex-direction: column;
    background-color: $bg-page;
}

.tab-panels {
    flex: 1;
    background-color: transparent;
}
</style>
