import { settings } from './state';

let searchDropdownEventsBound = false;
let searchDropdownId = 0;

export function enforceRadiusOverrides() {
    const tabRadius = Math.min(settings.radius, 12) + 'px';
    const searchRadius = Math.min(settings.radius, 12) + 'px';

    document.querySelectorAll('.topic-toolbar > .tab-bar').forEach(function (tabBar: any) {
        tabBar.style.setProperty('display', 'inline-flex', 'important');
        tabBar.style.setProperty('flex', '0 0 auto', 'important');
        tabBar.style.setProperty('gap', '5px', 'important');
        tabBar.style.setProperty('width', 'max-content', 'important');
        tabBar.style.setProperty('border-radius', '0px', 'important');
        tabBar.style.setProperty('overflow', 'visible', 'important');
        tabBar.style.setProperty('isolation', 'auto', 'important');
        tabBar.style.setProperty('transform', 'none', 'important');

        tabBar.querySelectorAll(':scope > a.tab').forEach(function (tab: any) {
            tab.style.setProperty('display', 'inline-flex', 'important');
            tab.style.setProperty('align-items', 'center', 'important');
            tab.style.setProperty('justify-content', 'center', 'important');
            tab.style.setProperty('min-height', '27px', 'important');
            tab.style.setProperty('line-height', '1.1', 'important');
            tab.style.setProperty('box-sizing', 'border-box', 'important');
            tab.style.setProperty('border-radius', tabRadius, 'important');
            tab.style.setProperty('border-top-left-radius', tabRadius, 'important');
            tab.style.setProperty('border-top-right-radius', tabRadius, 'important');
            tab.style.setProperty('border-bottom-right-radius', tabRadius, 'important');
            tab.style.setProperty('border-bottom-left-radius', tabRadius, 'important');
            tab.style.setProperty('margin-left', '0px', 'important');
            tab.style.setProperty('overflow', 'hidden', 'important');
            tab.style.setProperty('background-clip', 'padding-box', 'important');
        });
    });

    document.querySelectorAll('.search-form').forEach(function (form: any) {
        form.style.setProperty('border-radius', searchRadius, 'important');
    });
    document.querySelectorAll('.search-field').forEach(function (field: any) {
        field.style.setProperty('border-radius', searchRadius, 'important');
    });
    document.querySelectorAll('.lsb-search-select-trigger').forEach(function (trigger: any) {
        trigger.style.setProperty('border-top-left-radius', searchRadius, 'important');
        trigger.style.setProperty('border-bottom-left-radius', searchRadius, 'important');
    });
    document.querySelectorAll('.search-btn').forEach(function (button: any) {
        button.style.setProperty('border-top-right-radius', searchRadius, 'important');
        button.style.setProperty('border-bottom-right-radius', searchRadius, 'important');
    });
}

export function stripSearchEnhancement(form: any) {
    form.querySelectorAll('.lsb-search-select').forEach(function (wrapper) {
        const select = wrapper.querySelector('.search-field');
        if (select) {
            select.classList.remove('lsb-search-native');
            select.removeAttribute('data-lsb-search-enhanced');
            wrapper.replaceWith(select);
        }
    });
}

export function enhanceSearchFields(root: any) {
    if (!root || !root.querySelectorAll) {
        return;
    }

    root.querySelectorAll('.search-field').forEach(function (select: any) {
        if (select.getAttribute('data-lsb-search-enhanced') === '1') {
            return;
        }

        select.setAttribute('data-lsb-search-enhanced', '1');
        const wrapper = document.createElement('div');
        wrapper.className = 'lsb-search-select';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'lsb-search-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', '选择搜索范围');

        const menu = document.createElement('div');
        menu.className = 'lsb-search-options';
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;
        menu.id = 'lsb-search-options-' + (++searchDropdownId);
        trigger.setAttribute('aria-controls', menu.id);

        Array.from(select.options).forEach(function (option: any) {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'lsb-search-option';
            item.setAttribute('role', 'option');
            item.dataset.value = option.value;
            item.textContent = option.textContent;
            item.addEventListener('click', function () {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                closeSearchDropdowns();
                trigger.focus();
            });
            menu.appendChild(item);
        });

        const sync = function () {
            const selected = select.options[select.selectedIndex] || select.options[0];
            trigger.textContent = selected ? selected.textContent : '';
            menu.querySelectorAll('.lsb-search-option').forEach(function (item: any) {
                const active = selected && item.dataset.value === selected.value;
                item.setAttribute('aria-selected', String(Boolean(active)));
            });
        };

        trigger.addEventListener('click', function () {
            const nextOpen = menu.hidden;
            closeSearchDropdowns();
            menu.hidden = !nextOpen;
            trigger.setAttribute('aria-expanded', String(nextOpen));
        });
        trigger.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                trigger.click();
            }
            if (event.key === 'Escape') {
                closeSearchDropdowns();
            }
        });
        select.addEventListener('change', sync);

        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
        select.classList.add('lsb-search-native');
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        sync();
    });

    if (!searchDropdownEventsBound) {
        searchDropdownEventsBound = true;
        document.addEventListener('pointerdown', function (event) {
            const target = event.target as any;
            if (!target.closest || !target.closest('.lsb-search-select')) {
                closeSearchDropdowns();
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeSearchDropdowns();
            }
        });
    }
}

export function closeSearchDropdowns() {
    document.querySelectorAll('.lsb-search-options').forEach(function (menu: any) {
        menu.hidden = true;
        const trigger = menu.parentElement && menu.parentElement.querySelector('.lsb-search-select-trigger');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
    });
}
