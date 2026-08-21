import { settings } from './state';
import { THEMES, THEME_VARIABLES, TEXT_PALETTES } from './constants';

export function setRootVariable(name: string, value: string) {
    if (document.documentElement) {
        document.documentElement.style.setProperty(name, value, 'important');
    }
}

export function clearThemeVariables() {
    if (!document.documentElement) {
        return;
    }
    THEME_VARIABLES.forEach(function (name) {
        document.documentElement.style.removeProperty(name);
    });
}

export function hexToRgb(hex: string) {
    const normalized = String(hex).replace('#', '');
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16)
    };
}

export function mixHex(first: string, second: string, weight: number) {
    const a = hexToRgb(first);
    const b = hexToRgb(second);
    const mix = function (left: number, right: number) {
        return Math.round(left + (right - left) * weight);
    };
    const toHex = function (number: number) {
        return number.toString(16).padStart(2, '0');
    };
    return '#' + toHex(mix(a.r, b.r)) + toHex(mix(a.g, b.g)) + toHex(mix(a.b, b.b));
}

export function findTextPalette(color: string) {
    const normalized = String(color).toLowerCase();
    const key = Object.keys(TEXT_PALETTES).find(function (paletteKey) {
        return paletteKey !== 'custom' && TEXT_PALETTES[paletteKey].color === normalized;
    });
    return key || 'custom';
}

export function applyTheme() {
    clearThemeVariables();

    const theme = THEMES[settings.theme] || THEMES.neutral;
    if (theme.vars) {
        Object.keys(theme.vars).forEach(function (name) {
            setRootVariable(name, theme.vars![name]);
        });
    }

    const accentRgb = hexToRgb(settings.accent);
    setRootVariable('--brand', settings.accent);
    setRootVariable('--brand-hover', mixHex(settings.accent, '#ffffff', 0.18));
    setRootVariable('--brand-soft', 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',.16)');
    setRootVariable('--focus-ring', 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',.34)');

    const background = theme.vars && theme.vars['--bg'] ? theme.vars['--bg'] : '#1a1b2e';
    setRootVariable('--text', settings.textColor);
    setRootVariable('--text-muted', mixHex(settings.textColor, background, 0.34));
    setRootVariable('--text-subtle', mixHex(settings.textColor, background, 0.55));
    setRootVariable('--text-disabled', mixHex(settings.textColor, background, 0.72));

    if (settings.theme !== 'original') {
        setRootVariable('--swal2-background', 'var(--panel)');
        setRootVariable('--swal2-color', 'var(--text)');
        setRootVariable('--swal2-validation-message-background', 'var(--line-soft)');
        setRootVariable('--swal2-validation-message-color', 'var(--text-muted)');
    }
}
