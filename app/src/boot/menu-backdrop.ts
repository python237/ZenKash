import { boot } from 'quasar/wrappers';

export default boot(() => {
    // Create backdrop element
    const backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    document.body.appendChild(backdrop);

    // Close menu when clicking backdrop
    backdrop.addEventListener('click', () => {
        backdrop.classList.remove('active');
    });

    // Watch for menu appearance/disappearance
    const observer = new MutationObserver(() => {
        // Check if any q-menu exists (but not inside a dialog)
        const menu = document.body.querySelector('.q-menu:not(.q-dialog .q-menu)');
        const hasDialog = document.body.querySelector('.q-dialog') !== null;

        // Only show backdrop for standalone menus (not in dialogs)
        backdrop.classList.toggle('active', menu !== null && !hasDialog);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
});
