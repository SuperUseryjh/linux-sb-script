import { settings, ui } from './state';
import { DEFAULTS, RANGE_DEFINITIONS, THEMES, TEXT_PALETTES } from './constants';
import { setStatusElement, showStatus } from './status';
import { normalizeSettings, applySettings, persistSettings, scheduleSave, createImageUploadProfile } from './settings';
import { findTextPalette } from './theme';
import { applySidebarSwap, applyHomePostNewWindow, applyHomeMarkerEnhancements } from './home';
import { applyFilters } from './filters';
import { applyAutoCheckin } from './autoCheckin';
import { applyImageLightbox } from './lightbox';
import { applyImageUpload, syncImageUploadControls, applyProviderPreset } from './imageUpload';

let suppressToggleClick = false;
let modalBackdrop: any = null;
let uploadEditorDraft: any = null;
let uploadEditorId: string | null = null;
let uploadEditorIsNew = false;

export function ensureInterface() {
    if (ui.panel && document.body.contains(ui.panel)) {
        return;
    }
    if (!document.body) {
        return;
    }

    ui.toggleButton = document.createElement('button');
    ui.toggleButton.id = 'lsb-layout-toggle';
    ui.toggleButton.type = 'button';
    ui.toggleButton.setAttribute('aria-label', '打开布局与主题设置');
    ui.toggleButton.setAttribute('aria-controls', 'lsb-layout-panel');
    ui.toggleButton.setAttribute('aria-expanded', 'false');
    ui.toggleButton.title = '布局与主题设置';
    ui.toggleButton.innerHTML = [
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
        '<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
        '</svg>'
    ].join('');

    ui.panel = document.createElement('section');
    ui.panel.id = 'lsb-layout-panel';
    ui.panel.hidden = true;
    ui.panel.setAttribute('role', 'dialog');
    ui.panel.setAttribute('aria-modal', 'false');
    ui.panel.setAttribute('aria-label', '布局与主题设置');
    ui.panel.innerHTML = [
        '<div class="lsb-panel-head">',
        '  <span class="lsb-panel-title"><strong>LINUX.SB 布局与主题设置</strong><span>Design:@nmxyh & <a href="https://com.com.ee" target="_blank" rel="noopener noreferrer">COMCOM</a> & <a href="https://yaoonion.fun" target="_blank" rel="noopener noreferrer">YaoOnion</a></span></span>',
        '  <button class="lsb-icon-button" type="button" data-lsb-close aria-label="关闭设置面板">×</button>',
        '</div>',
        '<div class="lsb-tabs" role="tablist">',
        '  <button class="lsb-tab lsb-tab-active" type="button" role="tab" data-lsb-tab="layout">布局参数</button>',
        '  <button class="lsb-tab" type="button" role="tab" data-lsb-tab="home">首页</button>',
        '  <button class="lsb-tab" type="button" role="tab" data-lsb-tab="upload">图床上传</button>',
        '  <button class="lsb-tab" type="button" role="tab" data-lsb-tab="theme">主题颜色</button>',
        '  <button class="lsb-tab" type="button" role="tab" data-lsb-tab="filter">内容过滤</button>',
        '</div>',
        '<div class="lsb-panel-body">',
        '  <div class="lsb-tab-panel" data-lsb-tab-panel="layout">',
        '    <section class="lsb-section" aria-labelledby="lsb-layout-title">',
        '      <h2 class="lsb-section-title" id="lsb-layout-title">布局参数</h2>',
        '      <div data-lsb-ranges></div>',
        '    </section>',
        '  </div>',
        '  <div class="lsb-tab-panel" data-lsb-tab-panel="home" hidden>',
        '    <section class="lsb-section" aria-labelledby="lsb-home-title">',
        '      <h2 class="lsb-section-title" id="lsb-home-title">首页设置</h2>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-home-personalized><span>启用首页个性化头图与搜索</span></label>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-home-post-new-window><span>帖子新窗口打开</span></label>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-home-sidebar-swap><span>侧栏位置对调</span></label>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-identity-badges><span>身份标识美化</span></label>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-uid-badges><span>UID 美化（与身份标识配套）</span></label>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-avatar-profile-card><span>首页头像悬停基础资料卡</span></label>',
        '    </section>',
        '    <section class="lsb-section" aria-labelledby="lsb-func-title">',
        '      <h2 class="lsb-section-title" id="lsb-func-title">功能开关</h2>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-auto-checkin><span>自动签到功能</span></label>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-image-lightbox><span>图片灯箱功能</span></label>',
        '    </section>',
        '  </div>',
        '  <div class="lsb-tab-panel" data-lsb-tab-panel="upload" hidden>',
        '    <section class="lsb-section" aria-labelledby="lsb-upload-title">',
        '      <h2 class="lsb-section-title" id="lsb-upload-title">图片上传</h2>',
        '      <label class="lsb-check-line"><input type="checkbox" data-lsb-image-upload><span>拖拽图片上传</span></label>',
        '      <button class="lsb-upload-settings-toggle" type="button" data-lsb-upload-settings-toggle aria-expanded="false">展开图床配置</button>',
        '    </section>',
        '    <div class="lsb-upload-settings" data-lsb-upload-settings>',
        '      <div class="lsb-upload-profiles-head">',
        '        <h3 class="lsb-upload-group-title">图床列表 · 优先级</h3>',
        '        <p class="lsb-upload-profiles-tip">按住条目上下拖动排序，越靠上优先级越高；上传失败会自动依次尝试下一个图床。</p>',
        '      </div>',
        '      <div class="lsb-upload-profiles" data-lsb-upload-profiles></div>',
        '      <button class="lsb-button lsb-upload-profile-add" type="button" data-lsb-upload-profile-add>+ 新增图床配置</button>',
        '      <p class="lsb-upload-hint">启用后可将图片拖入发帖或回复编辑器，或点击编辑器下方的“上传图片”。点击上方配置可编辑；自定义接口可配置请求方式、请求体格式（multipart/JSON/二进制）与自定义请求头，返回中应包含可访问的 HTTPS 图片直链。</p>',
        '    </div>',
        '  </div>',
        '  <div class="lsb-tab-panel" data-lsb-tab-panel="theme" hidden>',
        '    <section class="lsb-section" aria-labelledby="lsb-theme-title">',
        '      <h2 class="lsb-section-title" id="lsb-theme-title">主题颜色</h2>',
        '      <label class="lsb-field"><span>配色方案</span><select class="lsb-select" data-lsb-theme></select></label>',
        '      <label class="lsb-field"><span>强调色</span>',
        '        <span class="lsb-color-line">',
        '          <input class="lsb-color-input" type="color" data-lsb-accent aria-label="选择强调色">',
        '          <output class="lsb-color-value" data-lsb-accent-value></output>',
        '        </span>',
        '      </label>',
        '      <label class="lsb-field"><span>文字色板</span><select class="lsb-select" data-lsb-text-palette></select></label>',
        '      <label class="lsb-field"><span>文字颜色</span>',
        '        <span class="lsb-color-line">',
        '          <input class="lsb-color-input" type="color" data-lsb-text-color aria-label="选择文字颜色">',
        '          <output class="lsb-color-value" data-lsb-text-color-value></output>',
        '        </span>',
        '      </label>',
        '      <p class="lsb-theme-note">中性深灰使用纯灰阶构建背景层级；强调色负责交互状态，文字色负责内容层级。</p>',
        '    </section>',
        '  </div>',
        '  <div class="lsb-tab-panel" data-lsb-tab-panel="filter" hidden>',
        '    <section class="lsb-section" aria-labelledby="lsb-filter-title">',
        '      <h2 class="lsb-section-title" id="lsb-filter-title">内容过滤</h2>',
        '      <label class="lsb-field"><span>过滤标题关键字（每行一个，最多 10 个）</span>',
        '        <textarea class="lsb-textarea" data-lsb-title-filters rows="3" placeholder="输入要屏蔽的关键字，每行一个"></textarea>',
        '      </label>',
        '      <label class="lsb-field"><span>过滤用户名（每行一个，最多 10 个）</span>',
        '        <textarea class="lsb-textarea" data-lsb-user-filters rows="3" placeholder="输入要屏蔽的用户名，每行一个"></textarea>',
        '      </label>',
        '    </section>',
        '  </div>',
        '</div>',
        '<div class="lsb-actions">',
        '  <button class="lsb-button" type="button" data-lsb-reset>恢复默认</button>',
        '  <button class="lsb-button lsb-button-primary" type="button" data-lsb-done>完成</button>',
        '</div>',
        '<p class="lsb-status" data-lsb-status aria-live="polite"></p>',
        '<div class="lsb-upload-editor" data-lsb-upload-editor hidden>',
        '  <div class="lsb-panel-head">',
        '    <span class="lsb-panel-title"><strong data-lsb-upload-editor-title>编辑图床配置</strong><span>修改后点击保存生效</span></span>',
        '    <button class="lsb-icon-button" type="button" data-lsb-upload-editor-close aria-label="关闭">×</button>',
        '  </div>',
        '  <div class="lsb-panel-body">',
        '    <div class="lsb-upload-group">',
        '      <h3 class="lsb-upload-group-title">基本信息</h3>',
        '      <div class="lsb-form-grid">',
        '        <label class="lsb-field lsb-field-wide"><span>配置名称</span><input class="lsb-input" type="text" data-lsb-upload-name placeholder="例如：我的图床"></label>',
        '        <label class="lsb-field"><span>图床类型</span><select class="lsb-select" data-lsb-upload-provider><option value="freeimage">FreeImage（免密钥）</option><option value="catbox">Catbox（免密钥）</option><option value="postimages">Postimages</option><option value="imgur">Imgur</option><option value="nodeimage">Nodeimage</option><option value="custom">自定义接口</option></select></label>',
        '        <label class="lsb-field"><span>返回图片地址字段</span><input class="lsb-input" type="text" data-lsb-upload-response-path placeholder="data.link"></label>',
        '      </div>',
        '    </div>',
        '    <div class="lsb-upload-group">',
        '      <h3 class="lsb-upload-group-title">地址与请求</h3>',
        '      <div class="lsb-form-grid">',
        '        <label class="lsb-field"><span>图床主页</span><input class="lsb-input" type="url" inputmode="url" data-lsb-upload-host placeholder="https://imgur.com/"></label>',
        '        <label class="lsb-field"><span>上传接口（HTTPS）</span><input class="lsb-input" type="url" inputmode="url" data-lsb-upload-endpoint placeholder="https://api.imgur.com/3/image"></label>',
        '        <label class="lsb-field"><span>请求方式</span><select class="lsb-select" data-lsb-upload-method><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option><option value="GET">GET</option></select></label>',
        '        <label class="lsb-field"><span>请求体格式</span><select class="lsb-select" data-lsb-upload-body-type><option value="multipart">multipart/form-data（文件）</option><option value="json">JSON（文件转 Base64）</option><option value="binary">原始二进制</option></select></label>',
        '        <label class="lsb-field lsb-field-wide"><span>自定义请求头（每行 Name: Value）</span><textarea class="lsb-textarea" data-lsb-upload-headers rows="3" placeholder="Authorization: Bearer xxx&#10;X-Requested-With: XMLHttpRequest"></textarea></label>',
        '      </div>',
        '    </div>',
        '    <div class="lsb-upload-group">',
        '      <h3 class="lsb-upload-group-title">文件与认证</h3>',
        '      <div class="lsb-form-grid">',
        '        <label class="lsb-field"><span>文件字段名（multipart/JSON 用）</span><input class="lsb-input" type="text" data-lsb-upload-file-field placeholder="image"></label>',
        '        <label class="lsb-field"><span>认证方式</span><select class="lsb-select" data-lsb-upload-auth-mode><option value="imgur-client-id">Imgur Client ID</option><option value="nodeimage-api-key">Nodeimage API Key</option><option value="none">不使用认证</option><option value="bearer">Bearer Token</option></select></label>',
        '        <label class="lsb-field lsb-field-wide"><span>API 密钥 / Token</span><input class="lsb-input" type="password" autocomplete="off" data-lsb-upload-token placeholder="Imgur 需填写 Client ID"></label>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="lsb-upload-editor-actions">',
        '    <button class="lsb-button" type="button" data-lsb-upload-editor-delete>删除</button>',
        '    <button class="lsb-button lsb-button-primary" type="button" data-lsb-upload-editor-save>保存</button>',
        '  </div>',
        '</div>'
    ].join('');

    // 居中模态框遮罩
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'lsb-modal-backdrop';
    modalBackdrop.hidden = true;
    document.body.appendChild(modalBackdrop);
    document.body.appendChild(ui.toggleButton);
    document.body.appendChild(ui.panel);
    // 初始侧栏位置类（仅切换按钮联动）
    ui.toggleButton.classList.add(settings.sidebarSwap ? 'lsb-toggle-left' : 'lsb-toggle-right');
    setStatusElement(ui.panel.querySelector('[data-lsb-status]'));

    buildRangeControls();
    buildThemeControls();
    bindInterfaceEvents();
    bindDragEvents();
    syncInterface();
    applySettings();
    restoreTogglePosition();
}

// 打开图床配置编辑模态框（isNew=true 表示新增未保存）
function openUploadEditor(id: string, isNew: boolean) {
    const editor = ui.panel.querySelector('[data-lsb-upload-editor]');
    const profiles = settings.imageUploadProfiles || [];
    const profile = profiles.find(function (item) {
        return item.id === id;
    });
    if (!editor || !profile) {
        return;
    }
    uploadEditorId = id;
    uploadEditorIsNew = isNew;
    uploadEditorDraft = Object.assign({}, profile);
    fillUploadEditorForm(uploadEditorDraft);
    ui.panel.querySelector('[data-lsb-upload-editor-title]').textContent = isNew ? '新增图床配置' : '编辑图床配置';
    const deleteBtn = ui.panel.querySelector('[data-lsb-upload-editor-delete]');
    deleteBtn.textContent = isNew ? '取消' : '删除';
    editor.hidden = false;
    window.requestAnimationFrame(function () {
        const nameInput = ui.panel.querySelector('[data-lsb-upload-name]');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    });
}

// 把草稿数据填充到编辑模态框表单
function fillUploadEditorForm(draft: any) {
    [
        ['[data-lsb-upload-name]', 'name'],
        ['[data-lsb-upload-provider]', 'provider'],
        ['[data-lsb-upload-host]', 'host'],
        ['[data-lsb-upload-endpoint]', 'endpoint'],
        ['[data-lsb-upload-method]', 'method'],
        ['[data-lsb-upload-body-type]', 'bodyType'],
        ['[data-lsb-upload-headers]', 'headers'],
        ['[data-lsb-upload-file-field]', 'fileField'],
        ['[data-lsb-upload-response-path]', 'responsePath'],
        ['[data-lsb-upload-auth-mode]', 'authMode'],
        ['[data-lsb-upload-token]', 'token']
    ].forEach(function (item) {
        const control = ui.panel.querySelector(item[0]);
        if (control) {
            control.value = draft[item[1]] !== undefined && draft[item[1]] !== null ? draft[item[1]] : '';
        }
    });
}

// 关闭编辑模态框；discardNew 为 true 时丢弃未保存的新增配置
function closeUploadEditor(discardNew: boolean) {
    if (uploadEditorIsNew && discardNew) {
        const profiles = settings.imageUploadProfiles || [];
        const index = profiles.findIndex(function (item) {
            return item.id === uploadEditorId;
        });
        if (index >= 0) {
            profiles.splice(index, 1);
        }
        if (profiles.length) {
            settings.imageUploadActiveProfileId = profiles[0].id;
        }
        syncImageUploadControls();
        persistSettings();
    }
    const editor = ui.panel.querySelector('[data-lsb-upload-editor]');
    if (editor) {
        editor.hidden = true;
    }
    uploadEditorDraft = null;
    uploadEditorId = null;
    uploadEditorIsNew = false;
}

// 保存编辑模态框内容到对应配置
function saveUploadEditor() {
    if (!uploadEditorDraft || uploadEditorId === null) {
        return;
    }
    const profiles = settings.imageUploadProfiles || [];
    const profile = profiles.find(function (item) {
        return item.id === uploadEditorId;
    });
    if (!profile) {
        return;
    }
    Object.assign(profile, uploadEditorDraft);
    settings.imageUploadActiveProfileId = profile.id;
    closeUploadEditor(false);
    syncImageUploadControls();
    persistSettings();
    showStatus('图床配置已保存');
}

function buildRangeControls() {
    const container = ui.panel.querySelector('[data-lsb-ranges]');
    container.className = 'lsb-section';

    RANGE_DEFINITIONS.forEach(function (definition) {
        const label = document.createElement('label');
        label.className = 'lsb-range-row';

        const head = document.createElement('span');
        head.className = 'lsb-range-head';

        const name = document.createElement('span');
        name.className = 'lsb-range-label';
        name.textContent = definition.label;

        const output = document.createElement('output');
        output.className = 'lsb-range-value';
        output.dataset.valueFor = definition.key;

        const input = document.createElement('input');
        input.className = 'lsb-range';
        input.type = 'range';
        input.min = String(definition.min);
        input.max = String(definition.max);
        input.step = String(definition.step);
        input.dataset.settingKey = definition.key;
        input.setAttribute('aria-label', definition.label);

        head.appendChild(name);
        head.appendChild(output);
        label.appendChild(head);
        label.appendChild(input);
        container.appendChild(label);

        input.addEventListener('input', function () {
            settings[definition.key] = Number(input.value);
            output.value = input.value + definition.unit;
            output.textContent = output.value;
            applySettings();
            scheduleSave();
        });
    });
}

function buildThemeControls() {
    const select = ui.panel.querySelector('[data-lsb-theme]');
    Object.keys(THEMES).forEach(function (key) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = THEMES[key].label;
        select.appendChild(option);
    });

    select.addEventListener('change', function () {
        settings.theme = select.value;
        settings.accent = THEMES[settings.theme].accent;
        settings.textColor = THEMES[settings.theme].textColor || DEFAULTS.textColor;
        settings.textPalette = findTextPalette(settings.textColor);
        applySettings();
        syncInterface();
        persistSettings();
    });

    const accentInput = ui.panel.querySelector('[data-lsb-accent]');
    accentInput.addEventListener('input', function () {
        settings.accent = accentInput.value.toLowerCase();
        applySettings();
        syncAccentControl();
        scheduleSave();
    });

    const textPalette = ui.panel.querySelector('[data-lsb-text-palette]');
    Object.keys(TEXT_PALETTES).forEach(function (key) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = TEXT_PALETTES[key].label;
        textPalette.appendChild(option);
    });

    textPalette.addEventListener('change', function () {
        settings.textPalette = textPalette.value;
        if (settings.textPalette !== 'custom') {
            settings.textColor = TEXT_PALETTES[settings.textPalette].color;
        }
        applySettings();
        syncTextControl();
        persistSettings();
    });

    const textInput = ui.panel.querySelector('[data-lsb-text-color]');
    textInput.addEventListener('input', function () {
        settings.textPalette = 'custom';
        settings.textColor = textInput.value.toLowerCase();
        applySettings();
        syncTextControl();
        scheduleSave();
    });
}

function bindInterfaceEvents() {
    ui.panel.querySelector('[data-lsb-home-personalized]').addEventListener('change', function (event) {
        settings.homePersonalized = event.target.checked;
        applySettings();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-home-post-new-window]').addEventListener('change', function (event) {
        settings.homePostNewWindow = event.target.checked;
        applyHomePostNewWindow();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-home-sidebar-swap]').addEventListener('change', function (event) {
        settings.sidebarSwap = event.target.checked;
        applySidebarSwap();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-identity-badges]').addEventListener('change', function (event) {
        settings.identityBadges = event.target.checked;
        applyHomeMarkerEnhancements();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-uid-badges]').addEventListener('change', function (event) {
        settings.uidBadges = event.target.checked;
        applyHomeMarkerEnhancements();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-avatar-profile-card]').addEventListener('change', function (event) {
        settings.avatarProfileCard = event.target.checked;
        applyHomeMarkerEnhancements();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-auto-checkin]').addEventListener('change', function (event) {
        settings.autoCheckin = event.target.checked;
        applyAutoCheckin();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-image-lightbox]').addEventListener('change', function (event) {
        settings.imageLightbox = event.target.checked;
        applyImageLightbox();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-image-upload]').addEventListener('change', function (event) {
        settings.imageUpload = event.target.checked;
        applyImageUpload();
        syncInterface();
        persistSettings();
    });

    ui.panel.querySelector('[data-lsb-upload-settings-toggle]').addEventListener('click', function () {
        settings.imageUploadSettingsCollapsed = !settings.imageUploadSettingsCollapsed;
        syncImageUploadControls();
        persistSettings();
    });

    // 图床配置：点击列表条目打开编辑模态框（事件委托）
    const profilesContainer = ui.panel.querySelector('[data-lsb-upload-profiles]');
    profilesContainer.addEventListener('click', function (event) {
        const target = event.target as any;
        const item = target && target.closest ? target.closest('[data-lsb-upload-profile-id]') : null;
        if (item) {
            openUploadEditor(item.getAttribute('data-lsb-upload-profile-id'), false);
        }
    });

    // 图床配置：新增并进入编辑
    ui.panel.querySelector('[data-lsb-upload-profile-add]').addEventListener('click', function () {
        const profile = createImageUploadProfile(settings);
        settings.imageUploadProfiles.push(profile);
        settings.imageUploadActiveProfileId = profile.id;
        syncImageUploadControls();
        openUploadEditor(profile.id, true);
    });

    // 图床配置：编辑模态框关闭 / 删除 / 保存
    ui.panel.querySelector('[data-lsb-upload-editor-close]').addEventListener('click', function () {
        closeUploadEditor(true);
    });
    ui.panel.querySelector('[data-lsb-upload-editor-delete]').addEventListener('click', function () {
        if (uploadEditorIsNew) {
            closeUploadEditor(true);
            return;
        }
        const profiles = settings.imageUploadProfiles || [];
        if (profiles.length <= 1) {
            showStatus('至少保留一个图床配置');
            return;
        }
        const index = profiles.findIndex(function (item) {
            return item.id === uploadEditorId;
        });
        if (index >= 0) {
            profiles.splice(index, 1);
        }
        settings.imageUploadActiveProfileId = profiles[0].id;
        closeUploadEditor(false);
        syncImageUploadControls();
        persistSettings();
        showStatus('已删除图床配置');
    });
    ui.panel.querySelector('[data-lsb-upload-editor-save]').addEventListener('click', saveUploadEditor);

    // 图床配置：编辑模态框表单字段（写入编辑草稿）
    [
        ['[data-lsb-upload-name]', 'name'],
        ['[data-lsb-upload-provider]', 'provider'],
        ['[data-lsb-upload-host]', 'host'],
        ['[data-lsb-upload-endpoint]', 'endpoint'],
        ['[data-lsb-upload-method]', 'method'],
        ['[data-lsb-upload-body-type]', 'bodyType'],
        ['[data-lsb-upload-headers]', 'headers'],
        ['[data-lsb-upload-file-field]', 'fileField'],
        ['[data-lsb-upload-response-path]', 'responsePath'],
        ['[data-lsb-upload-auth-mode]', 'authMode'],
        ['[data-lsb-upload-token]', 'token']
    ].forEach(function (item) {
        const control = ui.panel.querySelector(item[0]);
        control.addEventListener('change', function () {
            if (!uploadEditorDraft) {
                return;
            }
            uploadEditorDraft[item[1]] = control.value.trim();
            if (item[1] === 'provider') {
                applyProviderPreset(uploadEditorDraft);
            }
            fillUploadEditorForm(uploadEditorDraft);
        });
    });

    const parseFilterTextarea = function (value: any, maxItems: number) {
        let items: any = String(value).split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (maxItems > 0) {
            items = items.slice(0, maxItems);
        }
        return items;
    };

    const titleFiltersTextarea = ui.panel.querySelector('[data-lsb-title-filters]');
    titleFiltersTextarea.addEventListener('blur', function () {
        const value = titleFiltersTextarea.value;
        settings.titleFilters = parseFilterTextarea(value, 10);
        titleFiltersTextarea.value = settings.titleFilters.join('\n');
        applyFilters();
        persistSettings();
    });

    const userFiltersTextarea = ui.panel.querySelector('[data-lsb-user-filters]');
    userFiltersTextarea.addEventListener('blur', function () {
        const value = userFiltersTextarea.value;
        settings.userFilters = parseFilterTextarea(value, 10);
        userFiltersTextarea.value = settings.userFilters.join('\n');
        applyFilters();
        persistSettings();
    });

    ui.toggleButton.addEventListener('click', function () {
        if (suppressToggleClick) {
            suppressToggleClick = false;
            return;
        }
        setPanelOpen(ui.panel.hidden);
    });

    // 设置面板 Tab 分类切换
    ui.panel.querySelectorAll('[data-lsb-tab]').forEach(function (tab: any) {
        tab.addEventListener('click', function () {
            const key = tab.getAttribute('data-lsb-tab');
            ui.panel.querySelectorAll('[data-lsb-tab]').forEach(function (item: any) {
                item.classList.toggle('lsb-tab-active', item === tab);
            });
            ui.panel.querySelectorAll('[data-lsb-tab-panel]').forEach(function (content: any) {
                content.hidden = content.getAttribute('data-lsb-tab-panel') !== key;
            });
        });
    });

    ui.panel.querySelector('[data-lsb-close]').addEventListener('click', function () {
        setPanelOpen(false);
    });

    ui.panel.querySelector('[data-lsb-done]').addEventListener('click', function () {
        persistSettings();
        setPanelOpen(false);
    });

    ui.panel.querySelector('[data-lsb-reset]').addEventListener('click', function () {
        const previousLeft = settings.panelLeft;
        const previousTop = settings.panelTop;
        const previousToggleLeft = settings.toggleLeft;
        const previousToggleTop = settings.toggleTop;
        Object.assign(settings, normalizeSettings(DEFAULTS));
        settings.panelLeft = previousLeft;
        settings.panelTop = previousTop;
        settings.toggleLeft = previousToggleLeft;
        settings.toggleTop = previousToggleTop;
        applySettings();
        syncInterface();
        persistSettings();
        showStatus('已恢复默认中性深灰方案');
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && ui.panel && !ui.panel.hidden) {
            setPanelOpen(false);
        }
    });

    // 点击遮罩关闭模态框
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', function () {
            setPanelOpen(false);
        });
    }
}

function bindDragEvents() {
    let toggleDragState: any = null;
    ui.toggleButton.addEventListener('pointerdown', function (event) {
        if (event.button !== 0) {
            return;
        }

        const rect = ui.toggleButton.getBoundingClientRect();
        toggleDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            moved: false
        };
        ui.toggleButton.classList.add('lsb-toggle-dragging');
        if (ui.toggleButton.setPointerCapture) {
            ui.toggleButton.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
    });

    ui.toggleButton.addEventListener('pointermove', function (event) {
        if (!toggleDragState || event.pointerId !== toggleDragState.pointerId) {
            return;
        }

        if (Math.abs(event.clientX - toggleDragState.startX) > 4 ||
            Math.abs(event.clientY - toggleDragState.startY) > 4) {
            toggleDragState.moved = true;
        }

        if (toggleDragState.moved) {
            setTogglePosition(
                event.clientX - toggleDragState.offsetX,
                event.clientY - toggleDragState.offsetY,
                false
            );
        }
    });

    const finishToggleDrag = function (event: any) {
        if (!toggleDragState || event.pointerId !== toggleDragState.pointerId) {
            return;
        }
        if (ui.toggleButton.releasePointerCapture) {
            try {
                ui.toggleButton.releasePointerCapture(event.pointerId);
            } catch (error) {
                // 某些浏览器在 pointercancel 后会抛出无害异常。
            }
        }
        const moved = toggleDragState.moved;
        suppressToggleClick = true;
        toggleDragState = null;
        ui.toggleButton.classList.remove('lsb-toggle-dragging');
        if (moved) {
            persistSettings();
        } else if (event.type === 'pointerup') {
            setPanelOpen(ui.panel.hidden);
        }
        window.setTimeout(function () {
            suppressToggleClick = false;
        }, 0);
    };

    ui.toggleButton.addEventListener('pointerup', finishToggleDrag);
    ui.toggleButton.addEventListener('pointercancel', finishToggleDrag);

    window.addEventListener('resize', function () {
        if (settings.toggleLeft !== null && settings.toggleTop !== null) {
            setTogglePosition(settings.toggleLeft, settings.toggleTop, false);
            scheduleSave();
        }
    });
}

function setTogglePosition(left: number, top: number, persist: boolean) {
    if (!ui.toggleButton) {
        return;
    }

    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - ui.toggleButton.offsetWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - ui.toggleButton.offsetHeight - margin);
    const nextLeft = Math.round(Math.min(maxLeft, Math.max(margin, left)));
    const nextTop = Math.round(Math.min(maxTop, Math.max(margin, top)));

    ui.toggleButton.style.left = nextLeft + 'px';
    ui.toggleButton.style.top = nextTop + 'px';
    ui.toggleButton.style.right = 'auto';
    ui.toggleButton.style.bottom = 'auto';
    settings.toggleLeft = nextLeft;
    settings.toggleTop = nextTop;

    if (persist) {
        persistSettings();
    }
}

function restoreTogglePosition() {
    if (!ui.toggleButton || settings.toggleLeft === null || settings.toggleTop === null) {
        return;
    }
    setTogglePosition(settings.toggleLeft, settings.toggleTop, false);
}

function syncInterface() {
    if (!ui.panel) {
        return;
    }

    RANGE_DEFINITIONS.forEach(function (definition) {
        const input = ui.panel.querySelector('[data-setting-key="' + definition.key + '"]');
        const output = ui.panel.querySelector('[data-value-for="' + definition.key + '"]');
        input.value = String(settings[definition.key]);
        output.value = settings[definition.key] + definition.unit;
        output.textContent = output.value;
    });

    ui.panel.querySelector('[data-lsb-theme]').value = settings.theme;
    ui.panel.querySelector('[data-lsb-home-personalized]').checked = settings.homePersonalized;
    ui.panel.querySelector('[data-lsb-home-post-new-window]').checked = settings.homePostNewWindow;
    ui.panel.querySelector('[data-lsb-home-sidebar-swap]').checked = settings.sidebarSwap;
    ui.panel.querySelector('[data-lsb-identity-badges]').checked = settings.identityBadges;
    ui.panel.querySelector('[data-lsb-uid-badges]').checked = settings.uidBadges;
    ui.panel.querySelector('[data-lsb-avatar-profile-card]').checked = settings.avatarProfileCard;
    ui.panel.querySelector('[data-lsb-auto-checkin]').checked = settings.autoCheckin;
    ui.panel.querySelector('[data-lsb-image-lightbox]').checked = settings.imageLightbox;
    ui.panel.querySelector('[data-lsb-image-upload]').checked = settings.imageUpload;
    syncImageUploadControls();
    const titleFiltersTextarea = ui.panel.querySelector('[data-lsb-title-filters]');
    if (titleFiltersTextarea) {
        titleFiltersTextarea.value = (settings.titleFilters || []).join('\n');
    }
    const userFiltersTextarea = ui.panel.querySelector('[data-lsb-user-filters]');
    if (userFiltersTextarea) {
        userFiltersTextarea.value = (settings.userFilters || []).join('\n');
    }
    syncAccentControl();
    syncTextControl();
}

function syncAccentControl() {
    if (!ui.panel) {
        return;
    }
    ui.panel.querySelector('[data-lsb-accent]').value = settings.accent;
    ui.panel.querySelector('[data-lsb-accent-value]').value = settings.accent.toUpperCase();
    ui.panel.querySelector('[data-lsb-accent-value]').textContent = settings.accent.toUpperCase();
    ui.panel.style.setProperty('--lsb-ui-accent', settings.accent);
    ui.toggleButton.style.setProperty('--lsb-ui-accent', settings.accent);
}

function syncTextControl() {
    if (!ui.panel) {
        return;
    }
    ui.panel.querySelector('[data-lsb-text-palette]').value = settings.textPalette;
    ui.panel.querySelector('[data-lsb-text-color]').value = settings.textColor;
    ui.panel.querySelector('[data-lsb-text-color-value]').value = settings.textColor.toUpperCase();
    ui.panel.querySelector('[data-lsb-text-color-value]').textContent = settings.textColor.toUpperCase();
    ui.panel.style.setProperty('--lsb-ui-text', settings.textColor);
    ui.toggleButton.style.setProperty('--lsb-ui-text', settings.textColor);
}

export function setPanelOpen(open: boolean) {
    if (!ui.panel || !ui.toggleButton) {
        return;
    }

    ui.panel.hidden = !open;
    if (modalBackdrop) {
        modalBackdrop.hidden = !open;
    }
    ui.toggleButton.setAttribute('aria-expanded', String(open));
    ui.toggleButton.setAttribute('aria-label', open ? '关闭布局与主题设置' : '打开布局与主题设置');

    if (open) {
        syncInterface();
        window.requestAnimationFrame(function () {
            ui.panel.querySelector('[data-lsb-close]').focus();
        });
    } else {
        ui.toggleButton.focus();
    }
}
