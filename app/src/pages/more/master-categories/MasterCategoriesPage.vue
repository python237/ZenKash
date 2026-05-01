<template>
    <q-page class="page-master-categories">
        <!-- Tabs -->
        <TabNav v-model="activeTab" :tabs="categoryTabs" />

        <!-- Tab panels -->
        <q-tab-panels v-model="activeTab" animated class="tab-panels">
            <!-- Expense categories -->
            <q-tab-panel name="expense" class="q-pa-none">
                <MasterCategoryList
                    :categories="expenseCategories"
                    :empty-message="$t('masterCategories.noMasterCategories')"
                    @edit="editCategory"
                    @delete="confirmDelete"
                />
            </q-tab-panel>

            <!-- Income categories -->
            <q-tab-panel name="income" class="q-pa-none">
                <MasterCategoryList
                    :categories="incomeCategories"
                    :empty-message="$t('masterCategories.noMasterCategories')"
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
        <MasterCategoryDialog
            v-model="dialogOpen"
            :category="selectedCategory"
            :type="activeTab"
            @saved="onSaved"
        />

        <!-- Delete confirmation -->
        <ModalConfirm
            v-model="deleteDialogOpen"
            :title="$t('common.confirm')"
            :message="$t('masterCategories.deleteConfirm')"
            :subtitle="$t('masterCategories.deleteWarning')"
            :confirm-label="$t('common.delete')"
            :cancel-label="$t('common.cancel')"
            variant="danger"
            :loading="store.isLoading"
            @confirm="deleteCategory"
        />
    </q-page>
</template>

<script setup lang="ts">
import type { MasterCategory } from 'src/types/master-category';
import { CategoryType } from 'src/types/master-category';
import MasterCategoryDialog from 'src/components/master-categories/MasterCategoryDialog.vue';
import MasterCategoryList from 'src/components/master-categories/MasterCategoryList.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import TabNav from 'src/components/tabs/TabNav.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
usePage({ title: t('masterCategories.title'), showHeader: true, showBack: true });

const store = useMasterCategoryStore();

// Load data on mount
onMounted(async () => {
    await store.loadAll();
});

// Active tab
const activeTab = ref<CategoryType>(CategoryType.Expense);

// Tab items
const categoryTabs = computed(() => [
    { value: CategoryType.Expense, label: t('masterCategories.types.expense') },
    { value: CategoryType.Income, label: t('masterCategories.types.income') },
]);

// Categories by type
const expenseCategories = computed(() => store.expenseCategories);
const incomeCategories = computed(() => store.incomeCategories);

// Dialog state
const dialogOpen = ref(false);
const selectedCategory = ref<MasterCategory | null>(null);

// Delete dialog
const deleteDialogOpen = ref(false);
const categoryToDelete = ref<MasterCategory | null>(null);

/**
 * Opens the master category creation dialog with no pre-selected category.
 * @returns {void}
 */
function openAddDialog() {
    selectedCategory.value = null;
    dialogOpen.value = true;
}

/**
 * Opens the master category edit dialog for the selected category.
 * @param {MasterCategory} category - The master category to edit
 * @returns {void}
 */
function editCategory(category: MasterCategory) {
    selectedCategory.value = category;
    dialogOpen.value = true;
}

/**
 * Opens the delete confirmation dialog for the selected master category.
 * @param {MasterCategory} category - The master category to delete
 * @returns {void}
 */
function confirmDelete(category: MasterCategory) {
    categoryToDelete.value = category;
    deleteDialogOpen.value = true;
}

/**
 * Handles the master category deletion after user confirmation.
 * Removes the master category from the store and closes the dialog.
 * @returns {Promise<void>}
 */
async function deleteCategory() {
    if (!categoryToDelete.value) return;
    await store.remove(categoryToDelete.value.id);
    deleteDialogOpen.value = false;
    categoryToDelete.value = null;
}

/**
 * Callback handler when a master category is successfully saved.
 * The list automatically updates via reactive state.
 * @returns {void}
 */
function onSaved() {
    // Category saved successfully
}
</script>

<style lang="scss" scoped>
.page-master-categories {
    display: flex;
    flex-direction: column;
    background-color: $bg-page;
}

.tab-panels {
    flex: 1;
    background-color: transparent;
}
</style>
