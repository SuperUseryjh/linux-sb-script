// 设置项类型定义
export interface Settings {
    version: number;
    maxWidth: number;
    headerHeight: number;
    fontSize: number;
    radius: number;
    sidebarWidth: number;
    shellPadding: number;
    columnGap: number;
    theme: string;
    accent: string;
    textPalette: string;
    textColor: string;
    homePersonalized: boolean;
    homePostNewWindow: boolean;
    realtimeRefresh: boolean;
    realtimeRefreshInterval: number;
    sidebarSwap: boolean;
    identityBadges: boolean;
    uidBadges: boolean;
    avatarProfileCard: boolean;
    autoCheckin: boolean;
    autoCheckinLastDate: string;
    imageLightbox: boolean;
    imageUpload: boolean;
    imageUploadProvider: string;
    imageUploadHost: string;
    imageUploadEndpoint: string;
    imageUploadFileField: string;
    imageUploadResponsePath: string;
    imageUploadAuthMode: string;
    imageUploadToken: string;
    imageUploadSettingsCollapsed: boolean;
    imageUploadProfiles: ImageUploadProfile[];
    imageUploadActiveProfileId: string;
    panelLeft: number | null;
    panelTop: number | null;
    toggleLeft: number | null;
    toggleTop: number | null;
    titleFilters: string[];
    userFilters: string[];
    // 允许运行时按 key 动态读写（如 buildRangeControls / 图床设置循环绑定）
    [key: string]: any;
}

// 主题定义类型
export interface ThemeDefinition {
    label: string;
    accent: string;
    textColor: string;
    vars: { [key: string]: string } | null;
}

export interface RangeDefinition {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
}

export interface IdentityDefinition {
    label: string;
    aliases: string[];
}

// 图床配置（多套命名配置之一）
export interface ImageUploadProfile {
    id: string;
    name: string;
    provider: string;
    host: string;
    endpoint: string;
    method: string;
    headers: string;
    bodyType: string;
    fileField: string;
    responsePath: string;
    authMode: string;
    token: string;
}

// Tampermonkey 全局函数声明
declare global {
    const GM_addStyle: (cssText: string) => void;
    const GM_getValue: (name: string, defaultValue: any) => any;
    const GM_setValue: (name: string, value: any) => void;
    const GM_registerMenuCommand: (name: string, fn: () => void) => void;
    const GM_xmlhttpRequest: (details: any) => void;
    const GM_openInTab: (url: string, open_in_background?: boolean) => void;
    const GM_notification: (details: {
        title?: string;
        text?: string;
        image?: string;
        highlight?: boolean;
        timeout?: number;
        silent?: boolean;
        onclick?: () => void;
        ondone?: () => void;
    }) => void;
    const GM_info: {
        script: {
            version: string;
        };
    };
}

export {};
