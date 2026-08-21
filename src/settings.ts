import { settings, ui } from './state';
import { STORAGE_KEY, SETTINGS_VERSION, DEFAULTS, RANGE_DEFINITIONS, THEMES, TEXT_PALETTES, FREEIMAGE_PRESET } from './constants';
import { showStatus } from './status';
import { applyTheme, setRootVariable } from './theme';
import { applyHomePersonalization, applySidebarSwap, applyHomeMarkerEnhancements } from './home';
import { enhanceSearchFields, enforceRadiusOverrides } from './search';
import { applyFilters } from './filters';
import { applyAutoCheckin } from './autoCheckin';
import { applyImageLightbox } from './lightbox';
import { applyImageUpload } from './imageUpload';

let saveTimer = 0;

function normalizeUploadText(value: any, fallback: string, maxLength: number) {
    const normalized = value === null || value === undefined ? '' : String(value).trim();
    if (!normalized) {
        return fallback;
    }
    return normalized.slice(0, maxLength);
}

function normalizeUploadField(value: any, fallback: string) {
    const normalized = normalizeUploadText(value, fallback, 64);
    return /^[A-Za-z0-9_-]+$/.test(normalized) ? normalized : fallback;
}

function normalizeUploadResponsePath(value: any, fallback: string) {
    const normalized = normalizeUploadText(value, fallback, 120);
    return /^(?:[A-Za-z_$][A-Za-z0-9_$]*)(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(normalized) ? normalized : fallback;
}

const IMAGE_UPLOAD_PROVIDERS = ['imgur', 'nodeimage', 'custom', 'catbox', 'postimages', 'freeimage'];
const IMAGE_UPLOAD_METHODS = ['POST', 'PUT', 'PATCH', 'GET'];
const IMAGE_UPLOAD_BODY_TYPES = ['multipart', 'json', 'binary'];
const IMAGE_UPLOAD_AUTH_MODES = ['none', 'imgur-client-id', 'nodeimage-api-key', 'bearer'];

function generateProfileId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function buildDefaultProfile(source: any): any {
    // Imgur 无 Client ID 无法上传，迁移为免密钥的 FreeImage，保证开箱即用
    if (source.imageUploadProvider === 'imgur' && !source.imageUploadToken) {
        return {
            id: generateProfileId(),
            name: '默认图床',
            provider: FREEIMAGE_PRESET.provider,
            host: FREEIMAGE_PRESET.host,
            endpoint: FREEIMAGE_PRESET.endpoint,
            method: 'POST',
            headers: '',
            bodyType: 'multipart',
            fileField: FREEIMAGE_PRESET.field,
            responsePath: FREEIMAGE_PRESET.responsePath,
            authMode: FREEIMAGE_PRESET.authMode,
            token: ''
        };
    }
    return {
        id: generateProfileId(),
        name: '默认图床',
        provider: source.imageUploadProvider,
        host: source.imageUploadHost,
        endpoint: source.imageUploadEndpoint,
        method: 'POST',
        headers: '',
        bodyType: 'multipart',
        fileField: source.imageUploadFileField,
        responsePath: source.imageUploadResponsePath,
        authMode: source.imageUploadAuthMode,
        token: source.imageUploadToken
    };
}

function normalizeProfile(profile: any, defaultsSource: any): any {
    const source = profile && typeof profile === 'object' ? profile : {};
    return {
        id: String(source.id || generateProfileId()),
        name: normalizeUploadText(source.name, '图床配置', 40),
        provider: IMAGE_UPLOAD_PROVIDERS.indexOf(source.provider) >= 0 ? source.provider : defaultsSource.imageUploadProvider,
        host: normalizeUploadText(source.host, defaultsSource.imageUploadHost, 512),
        endpoint: normalizeUploadText(source.endpoint, defaultsSource.imageUploadEndpoint, 1024),
        method: IMAGE_UPLOAD_METHODS.indexOf(source.method) >= 0 ? source.method : 'POST',
        headers: normalizeUploadText(source.headers, '', 2048),
        bodyType: IMAGE_UPLOAD_BODY_TYPES.indexOf(source.bodyType) >= 0 ? source.bodyType : 'multipart',
        fileField: normalizeUploadField(source.fileField, defaultsSource.imageUploadFileField),
        responsePath: normalizeUploadResponsePath(source.responsePath, defaultsSource.imageUploadResponsePath),
        authMode: IMAGE_UPLOAD_AUTH_MODES.indexOf(source.authMode) >= 0 ? source.authMode : defaultsSource.imageUploadAuthMode,
        token: normalizeUploadText(source.token, '', 512)
    };
}

// 以某份设置（通常为 DEFAULTS 或当前 settings）为基准创建一份新的图床配置
export function createImageUploadProfile(source: any): any {
    return buildDefaultProfile(source || DEFAULTS);
}

export function normalizeSettings(value: any): any {
    const source = value && typeof value === 'object' ? value : {};
    const result = Object.assign({}, DEFAULTS, source);

    RANGE_DEFINITIONS.forEach(function (definition) {
        const number = Number(result[definition.key]);
        if (!Number.isFinite(number)) {
            result[definition.key] = DEFAULTS[definition.key];
        }
        result[definition.key] = Math.min(definition.max, Math.max(definition.min, number));
    });

    if (!Object.prototype.hasOwnProperty.call(THEMES, result.theme)) {
        result.theme = DEFAULTS.theme;
    }

    if (!Object.prototype.hasOwnProperty.call(TEXT_PALETTES, result.textPalette)) {
        result.textPalette = DEFAULTS.textPalette;
    }

    result.homePersonalized = result.homePersonalized === true || result.homePersonalized === 'true';
    result.sidebarSwap = result.sidebarSwap === true || result.sidebarSwap === 'true';
    result.identityBadges = result.identityBadges === true || result.identityBadges === 'true';
    result.uidBadges = result.uidBadges === true || result.uidBadges === 'true';
    result.avatarProfileCard = result.avatarProfileCard === true || result.avatarProfileCard === 'true';
    result.autoCheckin = result.autoCheckin === true || result.autoCheckin === 'true';
    result.autoCheckinLastDate = /^\d{4}-\d{2}-\d{2}$/.test(String(result.autoCheckinLastDate || '')) ? String(result.autoCheckinLastDate) : '';
    result.imageLightbox = result.imageLightbox === true || result.imageLightbox === 'true';
    result.imageUpload = result.imageUpload === true || result.imageUpload === 'true';
    result.imageUploadProvider = ['imgur', 'nodeimage', 'custom'].indexOf(result.imageUploadProvider) >= 0 ? result.imageUploadProvider : 'imgur';
    result.imageUploadHost = normalizeUploadText(result.imageUploadHost, DEFAULTS.imageUploadHost, 512);
    result.imageUploadEndpoint = normalizeUploadText(result.imageUploadEndpoint, DEFAULTS.imageUploadEndpoint, 1024);
    result.imageUploadFileField = normalizeUploadField(result.imageUploadFileField, DEFAULTS.imageUploadFileField);
    result.imageUploadResponsePath = normalizeUploadResponsePath(result.imageUploadResponsePath, DEFAULTS.imageUploadResponsePath);
    result.imageUploadAuthMode = ['none', 'imgur-client-id', 'nodeimage-api-key', 'bearer'].indexOf(result.imageUploadAuthMode) >= 0 ? result.imageUploadAuthMode : DEFAULTS.imageUploadAuthMode;
    result.imageUploadToken = normalizeUploadText(result.imageUploadToken, '', 512);
    result.imageUploadSettingsCollapsed = result.imageUploadSettingsCollapsed === true || result.imageUploadSettingsCollapsed === 'true';

    // 图床配置列表（多套命名配置）：首次升级时把旧的扁平配置迁移为默认配置
    let uploadProfiles = Array.isArray(result.imageUploadProfiles) ? result.imageUploadProfiles : [];
    if (!uploadProfiles.length) {
        uploadProfiles = [buildDefaultProfile(result)];
    } else {
        uploadProfiles = uploadProfiles.map(function (profile) {
            const normalized = normalizeProfile(profile, result);
            // Imgur 无 Client ID 无法上传，自动迁移为免密钥的 FreeImage，保证开箱即用
            if (normalized.provider === 'imgur' && !normalized.token) {
                normalized.provider = FREEIMAGE_PRESET.provider;
                normalized.host = FREEIMAGE_PRESET.host;
                normalized.endpoint = FREEIMAGE_PRESET.endpoint;
                normalized.fileField = FREEIMAGE_PRESET.field;
                normalized.responsePath = FREEIMAGE_PRESET.responsePath;
                normalized.authMode = FREEIMAGE_PRESET.authMode;
                normalized.token = '';
            }
            // v6 迁移：Catbox / Postimages 网站接口禁止自动化上传，统一迁移为 FreeImage
            if ((result.version || 0) < SETTINGS_VERSION && (normalized.provider === 'catbox' || normalized.provider === 'postimages')) {
                normalized.provider = FREEIMAGE_PRESET.provider;
                normalized.host = FREEIMAGE_PRESET.host;
                normalized.endpoint = FREEIMAGE_PRESET.endpoint;
                normalized.fileField = FREEIMAGE_PRESET.field;
                normalized.responsePath = FREEIMAGE_PRESET.responsePath;
                normalized.authMode = FREEIMAGE_PRESET.authMode;
                normalized.token = '';
            }
            return normalized;
        });
    }
    result.imageUploadProfiles = uploadProfiles;
    const activeProfileId = String(result.imageUploadActiveProfileId || '');
    result.imageUploadActiveProfileId = uploadProfiles.some(function (profile) {
        return profile.id === activeProfileId;
    }) ? activeProfileId : uploadProfiles[0].id;

    if (!/^#[0-9a-f]{6}$/i.test(String(result.accent))) {
        result.accent = THEMES[result.theme].accent;
    }

    result.accent = String(result.accent).toLowerCase();

    if (!/^#[0-9a-f]{6}$/i.test(String(result.textColor))) {
        result.textColor = THEMES[result.theme].textColor || DEFAULTS.textColor;
    }

    result.textColor = String(result.textColor).toLowerCase();

    ['panelLeft', 'panelTop', 'toggleLeft', 'toggleTop'].forEach(function (key) {
        const rawPosition = result[key];
        const position = Number(rawPosition);
        result[key] = rawPosition !== null && rawPosition !== undefined && rawPosition !== '' &&
            Number.isFinite(position) && position >= 0 ? Math.round(position) : null;
    });

    // 设置迁移：v1 升级到 v2，maxWidth 从 1600 调整为 1100
    if ((result.version || 0) < 2 && result.maxWidth === 1600) {
        result.maxWidth = 1100;
    }
    result.version = SETTINGS_VERSION;

    if (!Array.isArray(result.titleFilters)) {
        result.titleFilters = [];
    }

    if (!Array.isArray(result.userFilters)) {
        result.userFilters = [];
    }

    return result;
}

export function loadSettings(): any {
    try {
        let stored = null;
        if (typeof GM_getValue === 'function') {
            stored = GM_getValue(STORAGE_KEY, null);
        } else {
            const raw = localStorage.getItem(STORAGE_KEY);
            stored = raw ? JSON.parse(raw) : null;
        }
        return normalizeSettings(stored);
    } catch (error) {
        return normalizeSettings(null);
    }
}

export function persistSettings() {
    try {
        if (typeof GM_setValue === 'function') {
            GM_setValue(STORAGE_KEY, settings);
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
        showStatus('设置已保存');
    } catch (error) {
        showStatus('设置已应用，但保存失败');
    }
}

export function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistSettings, 140);
}

export function applySettings() {
    if (!document.documentElement) {
        return;
    }

    setRootVariable('--lsb-wide-max', settings.maxWidth + 'px');
    setRootVariable('--lsb-header-height', settings.headerHeight + 'px');
    setRootVariable('--lsb-base-font-size', settings.fontSize + 'px');
    setRootVariable('--lsb-radius', settings.radius + 'px');
    setRootVariable('--radius', settings.radius + 'px');
    setRootVariable('--radius-sm', Math.max(0, settings.radius - 2) + 'px');
    setRootVariable('--lsb-tab-radius', Math.min(settings.radius, 12) + 'px');
    setRootVariable('--lsb-search-radius', Math.min(settings.radius, 12) + 'px');
    setRootVariable('--lsb-sidebar-width', settings.sidebarWidth + 'px');
    setRootVariable('--lsb-shell-padding', settings.shellPadding + 'px');
    setRootVariable('--lsb-column-gap', settings.columnGap + 'px');
    setRootVariable('--bg-soft', 'var(--bg)');
    setRootVariable('--card-bg', 'var(--panel)');

    applyTheme();
    document.documentElement.setAttribute('data-lsb-ready', '');
    applyHomePersonalization();
    applySidebarSwap();
    enhanceSearchFields(document);
    enforceRadiusOverrides();
    applyFilters();
    applyHomeMarkerEnhancements();
    applyAutoCheckin();
    applyImageLightbox();
    applyImageUpload();

    if (ui.panel) {
        ui.panel.style.setProperty('--lsb-ui-accent', settings.accent);
        ui.panel.style.setProperty('--lsb-ui-text', settings.textColor);
    }
    if (ui.toggleButton) {
        ui.toggleButton.style.setProperty('--lsb-ui-accent', settings.accent);
        ui.toggleButton.style.setProperty('--lsb-ui-text', settings.textColor);
    }
}
