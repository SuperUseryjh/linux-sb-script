import { settings } from './state';
import { BASE_CSS, THEMES } from './constants';
import { hexToRgb, mixHex } from './theme';
import { loadSettings, applySettings } from './settings';
import { ensureInterface, setPanelOpen } from './interface';
import { applyHomePersonalization, applyHomePostNewWindow, shouldRefreshHomeMarkerEnhancements, scheduleHomeMarkerEnhancements } from './home';
import { enhanceSearchFields, enforceRadiusOverrides } from './search';
import { scheduleFilter } from './filters';
import { updateImageLightboxTargets } from './lightbox';
import { updateImageUploadTargets } from './imageUpload';
import { checkUpdate } from './checkUpdate';

let homeObserver: any = null;

function addStyle(cssText: string) {
    if (typeof GM_addStyle === 'function') {
        GM_addStyle(cssText);
        return;
    }

    const style = document.createElement('style');
    style.id = 'linux-sb-wide-layout-style';
    style.textContent = cssText;
    (document.head || document.documentElement).appendChild(style);
}

function buildStartupCss(currentSettings: any) {
    const variables: { [key: string]: string } = {
        '--lsb-wide-max': currentSettings.maxWidth + 'px',
        '--lsb-header-height': currentSettings.headerHeight + 'px',
        '--lsb-base-font-size': currentSettings.fontSize + 'px',
        '--lsb-radius': currentSettings.radius + 'px',
        '--radius': currentSettings.radius + 'px',
        '--radius-sm': Math.max(0, currentSettings.radius - 2) + 'px',
        '--lsb-tab-radius': Math.min(currentSettings.radius, 12) + 'px',
        '--lsb-search-radius': Math.min(currentSettings.radius, 12) + 'px',
        '--lsb-sidebar-width': currentSettings.sidebarWidth + 'px',
        '--lsb-shell-padding': currentSettings.shellPadding + 'px',
        '--lsb-column-gap': currentSettings.columnGap + 'px',
        '--bg-soft': 'var(--bg)',
        '--card-bg': 'var(--panel)'
    };
    const theme = THEMES[currentSettings.theme] || THEMES.neutral;

    if (theme.vars) {
        Object.keys(theme.vars).forEach(function (name) {
            variables[name] = theme.vars![name];
        });
    }

    const accentRgb = hexToRgb(currentSettings.accent);
    const background = theme.vars && theme.vars['--bg'] ? theme.vars['--bg'] : '#1a1b2e';
    variables['--brand'] = currentSettings.accent;
    variables['--brand-hover'] = mixHex(currentSettings.accent, '#ffffff', 0.18);
    variables['--brand-soft'] = 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',.16)';
    variables['--focus-ring'] = 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',.34)';
    variables['--text'] = currentSettings.textColor;
    variables['--text-muted'] = mixHex(currentSettings.textColor, background, 0.34);
    variables['--text-subtle'] = mixHex(currentSettings.textColor, background, 0.55);
    variables['--text-disabled'] = mixHex(currentSettings.textColor, background, 0.72);

    if (currentSettings.theme !== 'original') {
        variables['--swal2-background'] = 'var(--panel)';
        variables['--swal2-color'] = 'var(--text)';
        variables['--swal2-validation-message-background'] = 'var(--line-soft)';
        variables['--swal2-validation-message-color'] = 'var(--text-muted)';
    }

    return [
        ':root:not([data-lsb-ready]) {',
        Object.keys(variables).map(function (name) {
            return '  ' + name + ': ' + variables[name] + ' !important;';
        }).join('\n'),
        '}'
    ].join('\n');
}

function startHomeObserver() {
    if (homeObserver || typeof MutationObserver !== 'function') {
        return;
    }

    homeObserver = new MutationObserver(function (mutations) {
        applyHomePersonalization();
        applyHomePostNewWindow();
        enhanceSearchFields(document);
        enforceRadiusOverrides();
        scheduleFilter();
        if (shouldRefreshHomeMarkerEnhancements(mutations)) {
            scheduleHomeMarkerEnhancements();
        }
        updateImageLightboxTargets();
        updateImageUploadTargets();
    });
    homeObserver.observe(document, { childList: true, subtree: true });
}

// 启动时加载已保存的设置到全局 settings 对象
Object.assign(settings, loadSettings());
addStyle(buildStartupCss(settings) + '\n' + BASE_CSS);
applySettings();
startHomeObserver();
checkUpdate();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureInterface, { once: true });
} else {
    ensureInterface();
}

if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('打开 LINUX SB 布局设置', function () {
        ensureInterface();
        setPanelOpen(true);
    });
}
