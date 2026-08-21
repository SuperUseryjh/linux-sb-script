import { settings, ui } from './state';
import { IMGUR_PRESET, CATBOX_PRESET, NODEIMAGE_PRESET, POSTIMAGES_PRESET, FREEIMAGE_PRESET } from './constants';
import { persistSettings } from './settings';
import { showStatus } from './status';

const imageUploadBusyEditors = new WeakSet();
let dragProfileIndex = -1; // 拖动排序时记录被拖条目的原始下标

// 获取当前选中的图床配置；无有效配置时兜底到设置面板的扁平字段
export function getActiveUploadProfile(): any {
    const profiles = settings.imageUploadProfiles || [];
    const activeId = settings.imageUploadActiveProfileId;
    const profile = profiles.find(function (item) {
        return item.id === activeId;
    }) || profiles[0];
    if (profile) {
        return profile;
    }
    return {
        id: '',
        name: '默认图床',
        provider: settings.imageUploadProvider,
        host: settings.imageUploadHost,
        endpoint: settings.imageUploadEndpoint,
        method: 'POST',
        headers: '',
        bodyType: 'multipart',
        fileField: settings.imageUploadFileField,
        responsePath: settings.imageUploadResponsePath,
        authMode: settings.imageUploadAuthMode,
        token: settings.imageUploadToken
    };
}

// 切换图床类型时按预设填充请求相关字段（custom 保留用户已填内容）
export function applyProviderPreset(profile: any) {
    if (profile.provider === 'imgur') {
        profile.host = IMGUR_PRESET.host;
        profile.endpoint = IMGUR_PRESET.endpoint;
        profile.fileField = IMGUR_PRESET.field;
        profile.responsePath = IMGUR_PRESET.responsePath;
        profile.authMode = IMGUR_PRESET.authMode;
        profile.method = 'POST';
        profile.bodyType = 'multipart';
        profile.headers = '';
    } else if (profile.provider === 'catbox') {
        profile.host = CATBOX_PRESET.host;
        profile.endpoint = CATBOX_PRESET.endpoint;
        profile.fileField = CATBOX_PRESET.field;
        profile.responsePath = CATBOX_PRESET.responsePath;
        profile.authMode = CATBOX_PRESET.authMode;
        profile.method = 'POST';
        profile.bodyType = 'multipart';
        profile.headers = '';
        profile.token = '';
    } else if (profile.provider === 'nodeimage') {
        profile.host = NODEIMAGE_PRESET.host;
        profile.endpoint = NODEIMAGE_PRESET.endpoint;
        profile.fileField = NODEIMAGE_PRESET.field;
        profile.responsePath = NODEIMAGE_PRESET.responsePath;
        profile.authMode = NODEIMAGE_PRESET.authMode;
        profile.method = 'POST';
        profile.bodyType = 'multipart';
        profile.headers = '';
    } else if (profile.provider === 'postimages') {
        profile.host = POSTIMAGES_PRESET.host;
        profile.endpoint = POSTIMAGES_PRESET.endpoint;
        profile.fileField = POSTIMAGES_PRESET.field;
        profile.responsePath = POSTIMAGES_PRESET.responsePath;
        profile.authMode = POSTIMAGES_PRESET.authMode;
        profile.method = 'POST';
        profile.bodyType = 'multipart';
        profile.headers = '';
        profile.token = '';
    } else if (profile.provider === 'freeimage') {
        profile.host = FREEIMAGE_PRESET.host;
        profile.endpoint = FREEIMAGE_PRESET.endpoint;
        profile.fileField = FREEIMAGE_PRESET.field;
        profile.responsePath = FREEIMAGE_PRESET.responsePath;
        profile.authMode = FREEIMAGE_PRESET.authMode;
        profile.method = 'POST';
        profile.bodyType = 'multipart';
        profile.headers = '';
        profile.token = '';
    }
}

export function syncImageUploadControls() {
    if (!ui.panel) {
        return;
    }

    const settingsBlock = ui.panel.querySelector('[data-lsb-upload-settings]');
    const settingsToggle = ui.panel.querySelector('[data-lsb-upload-settings-toggle]');
    const profilesContainer = ui.panel.querySelector('[data-lsb-upload-profiles]');

    if (!settingsBlock || !settingsToggle) {
        return;
    }

    const expanded = settings.imageUpload && !settings.imageUploadSettingsCollapsed;
    settingsBlock.hidden = !expanded;
    settingsToggle.style.display = settings.imageUpload ? '' : 'none';
    settingsToggle.setAttribute('aria-expanded', String(expanded));
    settingsToggle.textContent = expanded ? '收起配置' : '展开配置';

    if (!profilesContainer) {
        return;
    }

    // 渲染图床配置列表条目（点击打开编辑模态框；可拖动排序，越靠上优先级越高）
    profilesContainer.innerHTML = '';
    (settings.imageUploadProfiles || []).forEach(function (profile, index) {
        const item = document.createElement('div');
        item.className = 'lsb-upload-profile-item';
        item.setAttribute('data-lsb-upload-profile-id', profile.id);
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('draggable', 'true');

        // 拖动排序：记录被拖条目，放到目标位置后重排数组并持久化
        item.addEventListener('dragstart', function (event: any) {
            dragProfileIndex = index;
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
            item.classList.add('lsb-upload-profile-dragging');
        });
        item.addEventListener('dragover', function (event: any) {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        });
        item.addEventListener('drop', function (event: any) {
            event.preventDefault();
            const targetIndex = index;
            if (dragProfileIndex >= 0 && dragProfileIndex !== targetIndex) {
                const profiles = settings.imageUploadProfiles || [];
                const moved = profiles.splice(dragProfileIndex, 1)[0];
                profiles.splice(targetIndex, 0, moved);
                dragProfileIndex = -1;
                syncImageUploadControls();
                persistSettings();
            } else {
                dragProfileIndex = -1;
            }
        });
        item.addEventListener('dragend', function () {
            dragProfileIndex = -1;
            item.classList.remove('lsb-upload-profile-dragging');
        });

        const name = document.createElement('span');
        name.className = 'lsb-upload-profile-name';
        name.textContent = profile.name;

        const meta = document.createElement('span');
        meta.className = 'lsb-upload-profile-meta';
        meta.textContent = profile.provider + ' · ' + profile.method;

        item.appendChild(name);
        item.appendChild(meta);
        profilesContainer.appendChild(item);
    });
}

export function applyImageUpload() {
    updateImageUploadTargets();
}

export function updateImageUploadTargets() {
    if (!document.querySelectorAll) {
        return;
    }

    document.querySelectorAll('[data-lsb-image-upload-button]').forEach(function (button) {
        if (!settings.imageUpload || !button.previousElementSibling || !isImageUploadEditor(button.previousElementSibling)) {
            button.remove();
        }
    });

    if (!settings.imageUpload) {
        document.querySelectorAll('.lsb-image-upload-drop-target').forEach(function (editor) {
            editor.classList.remove('lsb-image-upload-drop-target');
        });
        return;
    }

    getImageUploadEditors().forEach(function (editor) {
        bindImageUploadEditor(editor);
    });
}

function getImageUploadEditors() {
    const result = [];
    document.querySelectorAll('textarea, [contenteditable="true"], input[data-quick-reply-action]').forEach(function (editor) {
        if (isImageUploadEditor(editor)) {
            result.push(editor);
        }
    });
    return result;
}

function isImageUploadEditor(editor: any) {
    if (!editor || !editor.isConnected || editor.closest('#lsb-layout-panel') || editor.readOnly || editor.disabled) {
        return false;
    }
    if (editor.matches('input[data-quick-reply-action]')) {
        return true;
    }
    if (editor.matches('[contenteditable="true"]')) {
        return true;
    }
    if (!editor.matches('textarea')) {
        return false;
    }
    return !editor.classList.contains('lsb-textarea');
}

function bindImageUploadEditor(editor: any) {
    if (editor.getAttribute('data-lsb-image-upload-bound') === '1') {
        ensureImageUploadButton(editor);
        return;
    }

    editor.setAttribute('data-lsb-image-upload-bound', '1');
    console.log('[LSB 图床上传] 已绑定上传编辑器:', editor.tagName, editor.className || '');
    editor.addEventListener('dragenter', function (event) {
        if (settings.imageUpload && containsImageFiles(event.dataTransfer)) {
            event.preventDefault();
            editor.classList.add('lsb-image-upload-drop-target');
        }
    });
    editor.addEventListener('dragover', function (event) {
        if (settings.imageUpload && containsImageFiles(event.dataTransfer)) {
            event.preventDefault();
            editor.classList.add('lsb-image-upload-drop-target');
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
            }
        }
    });
    editor.addEventListener('dragleave', function () {
        editor.classList.remove('lsb-image-upload-drop-target');
    });
    editor.addEventListener('drop', function (event) {
        editor.classList.remove('lsb-image-upload-drop-target');
        if (!settings.imageUpload || !containsImageFiles(event.dataTransfer)) {
            console.log('[LSB 图床上传] drop 被忽略（上传未开启或无图片文件）');
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        uploadImageFiles(editor, Array.from(event.dataTransfer.files || []));
    });
    editor.addEventListener('paste', function (event) {
        if (!settings.imageUpload) {
            return;
        }
        const files = getClipboardImageFiles(event.clipboardData);
        if (!files.length) {
            console.log('[LSB 图床上传] 粘贴内容中未发现图片文件');
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        uploadImageFiles(editor, files);
    });

    ensureImageUploadButton(editor);
}

function ensureImageUploadButton(editor: any) {
    let button = editor.nextElementSibling;
    if (button && button.hasAttribute('data-lsb-image-upload-button')) {
        return;
    }

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'lsb-image-upload-button';
    button.setAttribute('data-lsb-image-upload-button', '1');
    button.textContent = '上传图片';
    button.addEventListener('click', function () {
        selectImagesForEditor(editor);
    });
    editor.insertAdjacentElement('afterend', button);
}

function containsImageFiles(dataTransfer: any) {
    if (!dataTransfer || !dataTransfer.files || !dataTransfer.files.length) {
        return false;
    }
    return Array.from(dataTransfer.files).some(function (file: any) {
        return file && /^image\//i.test(file.type || '');
    });
}

function getClipboardImageFiles(clipboardData: any) {
    if (!clipboardData) {
        return [];
    }

    let files = Array.from(clipboardData.items || []).map(function (item: any) {
        if (!item || item.kind !== 'file' || !/^image\//i.test(item.type || '')) {
            return null;
        }
        return item.getAsFile ? item.getAsFile() : null;
    }).filter(Boolean);

    if (!files.length && clipboardData.files) {
        files = Array.from(clipboardData.files).filter(function (file: any) {
            return file && /^image\//i.test(file.type || '');
        });
    }
    return files;
}

function selectImagesForEditor(editor: any) {
    if (!settings.imageUpload || imageUploadBusyEditors.has(editor)) {
        return;
    }

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.multiple = true;
    picker.hidden = true;
    picker.addEventListener('change', function () {
        uploadImageFiles(editor, Array.from(picker.files || []));
        picker.remove();
    }, { once: true });
    document.body.appendChild(picker);
    picker.click();
}

function uploadImageFiles(editor: any, files: any[]) {
    console.log('[LSB 图床上传] uploadImageFiles 收到文件:', files.map(function (f) { return f && f.name; }));
    let validFiles = files.filter(function (file) {
        return file && /^image\//i.test(file.type || '') && file.size > 0;
    });
    const oversized = validFiles.filter(function (file) {
        return file.size > 10 * 1024 * 1024;
    });
    validFiles = validFiles.filter(function (file) {
        return file.size <= 10 * 1024 * 1024;
    }).slice(0, 6);
    console.log('[LSB 图床上传] 过滤后待上传', validFiles.length, '张，超大被拒', oversized.length, '张');

    if (!validFiles.length) {
        showStatus(oversized.length ? '图片超过 10 MB，未开始上传' : '请选择 PNG、JPG、GIF、WebP 等图片文件');
        return;
    }
    if (imageUploadBusyEditors.has(editor)) {
        return;
    }

    imageUploadBusyEditors.add(editor);
    setImageUploadButtonState(editor, '上传中…', true);
    let uploaded = 0;
    let chain = Promise.resolve();
    validFiles.forEach(function (file, fileIndex) {
        // 先插入占位，上传成功后替换为真实链接，失败则移除
        const placeholder = '![图片上传中...](lsb-uploading-' + (fileIndex + 1) + '-' + Math.random().toString(36).slice(2, 8) + ')';
        insertMarkdownText(editor, placeholder);
        chain = chain.then(function () {
            return uploadOneImage(file).then(function (url) {
                console.log('[LSB 图床上传] 单张上传成功:', url);
                const alt = String(file.name || '图片').replace(/[\[\]\n\r]/g, '').slice(0, 80) || '图片';
                replaceEditorText(editor, placeholder, '![' + alt + '](' + url + ')');
                uploaded += 1;
                setImageUploadButtonState(editor, '已上传 ' + uploaded + '/' + validFiles.length, true);
            }).catch(function (error) {
                // 上传失败：移除占位
                replaceEditorText(editor, placeholder, '');
                throw error;
            });
        });
    });
    chain.then(function () {
        showStatus('已插入 ' + uploaded + ' 张图片');
    }).catch(function (error) {
        const message = '图片上传失败：' + getUploadErrorMessage(error);
        console.error('[LSB 图床上传] 上传失败:', error);
        showStatus(message);
        showUploadErrorDialog(message);
    }).finally(function () {
        imageUploadBusyEditors.delete(editor);
        setImageUploadButtonState(editor, '上传图片', false);
    });
}

// 校验单个图床配置是否可用；不可用时抛出错误说明原因
function validateUploadProfile(profile: any) {
    if (!isSafeHttpsUrl(profile.endpoint) || !isSafeHttpsUrl(profile.host)) {
        throw new Error('「' + profile.name + '」的 host/endpoint 不是合法 HTTPS');
    }
    if (profile.authMode === 'imgur-client-id' && !profile.token) {
        throw new Error('「' + profile.name + '」Imgur 缺少 Client ID');
    }
    if (profile.authMode === 'nodeimage-api-key' && !profile.token) {
        throw new Error('「' + profile.name + '」Nodeimage 缺少 API 密钥');
    }
    return profile;
}

// 候选图床链 = 配置列表顺序（列表越靠上优先级越高，可通过拖动排序调整）
function getFailoverProfiles() {
    const profiles = (settings.imageUploadProfiles || []).slice();
    if (!profiles.length) {
        profiles.push(getActiveUploadProfile());
    }
    console.log('[LSB 图床上传] 候选图床链:', profiles.map(function (p) { return p.name + '(' + p.provider + ')'; }));
    return profiles;
}

function isSafeHttpsUrl(value: any) {
    try {
        const url = new URL(String(value));
        return url.protocol === 'https:' && !url.username && !url.password;
    } catch (error) {
        return false;
    }
}

// 解析自定义请求头文本：每行 "Name: Value"，空行与 # 注释忽略
function parseCustomHeaders(text: any) {
    const result: any[] = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.charAt(0) === '#') {
            return;
        }
        const index = trimmed.indexOf(':');
        if (index <= 0) {
            return;
        }
        const name = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        if (name) {
            result.push({ name: name, value: value });
        }
    });
    return result;
}

// 组装请求头：认证头 + 自定义头（自定义头覆盖同名认证头）+ 按请求体格式补充 Content-Type
function buildUploadHeaders(profile: any, contentType: string) {
    const headers: { [key: string]: string } = {};
    if (profile.authMode === 'imgur-client-id') {
        headers.Authorization = 'Client-ID ' + profile.token;
    } else if (profile.authMode === 'nodeimage-api-key') {
        headers['X-API-Key'] = profile.token;
    } else if (profile.authMode === 'bearer' && profile.token) {
        headers.Authorization = 'Bearer ' + profile.token;
    }
    parseCustomHeaders(profile.headers).forEach(function (entry) {
        headers[entry.name] = entry.value;
    });
    // 部分图床（如 Catbox）强制校验 User-Agent，缺失或非浏览器 UA 时返回 412 "Invalid uploader"；
    // 默认补页面真实浏览器 UA（GM 请求若未放行该头，会在 412 时自动用 fetch 重试）
    const hasUserAgent = Object.keys(headers).some(function (name) {
        return name.toLowerCase() === 'user-agent';
    });
    if (!hasUserAgent) {
        headers['User-Agent'] = String(navigator.userAgent || 'Mozilla/5.0');
    }
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
}

// 打印请求头用于调试（Authorization/密钥掩码显示）
function debugLogHeaders(headers: any) {
    const masked: { [key: string]: string } = {};
    Object.keys(headers || {}).forEach(function (name) {
        const value = String(headers[name] || '');
        masked[name] = /authorization|x-api-key/i.test(name) && value ? value.slice(0, 8) + '***' : value;
    });
    console.log('[LSB 图床上传] 请求头:', masked);
}

function readFileAsDataUrl(file: any) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
            resolve(String(reader.result || ''));
        };
        reader.onerror = function () {
            reject(new Error('读取图片文件失败'));
        };
        reader.readAsDataURL(file);
    });
}

function readFileAsArrayBuffer(file: any) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
            resolve(reader.result as ArrayBuffer);
        };
        reader.onerror = function () {
            reject(new Error('读取图片文件失败'));
        };
        reader.readAsArrayBuffer(file);
    });
}

// 按请求体格式构造上传数据：multipart（手动构造 Blob）/ json（文件转 Base64）/ binary（原始文件）
function buildUploadBody(profile: any, file: any) {
    if (profile.method === 'GET') {
        console.log('[LSB 图床上传] 请求方式为 GET，无请求体');
        return Promise.resolve({ data: undefined, contentType: '' });
    }
    if (profile.bodyType === 'json') {
        return readFileAsDataUrl(file).then(function (dataUrl) {
            const base64 = String(dataUrl).indexOf(',') >= 0 ? String(dataUrl).split(',')[1] : String(dataUrl);
            console.log('[LSB 图床上传] JSON 请求体: 文件转 Base64 长度 =', base64.length, '，JSON key =', profile.fileField);
            return {
                data: JSON.stringify({ [profile.fileField]: base64 }),
                contentType: 'application/json'
            };
        });
    }
    if (profile.bodyType === 'binary') {
        console.log('[LSB 图床上传] 二进制请求体: file.type =', file && file.type, 'file.size =', file && file.size);
        return Promise.resolve({
            data: file,
            contentType: file && file.type ? file.type : 'application/octet-stream'
        });
    }
    // Tampermonkey 的 GM_xmlhttpRequest 直接传 FormData 会丢失文件内容（服务器报 "No files have been uploaded"），
    // 因此手动构造 multipart 请求体：文本字段用字符串、文件用 ArrayBuffer，统一放进 Blob 并显式指定 boundary
    const boundary = '----lsb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return readFileAsArrayBuffer(file).then(function (buffer) {
        const parts: any[] = [];
        const extraFields: any[] = [];
        if (profile.provider === 'catbox') {
            extraFields.push({ name: 'reqtype', value: 'fileupload' });
        } else if (profile.provider === 'postimages') {
            extraFields.push({ name: 'optsize', value: '0' });
            extraFields.push({ name: 'expire', value: '0' });
        } else if (profile.provider === 'freeimage') {
            extraFields.push({ name: 'key', value: FREEIMAGE_PRESET.key });
            extraFields.push({ name: 'action', value: 'upload' });
            extraFields.push({ name: 'format', value: 'json' });
        }
        extraFields.forEach(function (field) {
            parts.push('--' + boundary + '\r\n');
            parts.push('Content-Disposition: form-data; name="' + field.name + '"\r\n\r\n');
            parts.push(field.value + '\r\n');
        });
        parts.push('--' + boundary + '\r\n');
        parts.push('Content-Disposition: form-data; name="' + profile.fileField + '"; filename="' + String(file.name || 'image').replace(/"/g, '') + '"\r\n');
        parts.push('Content-Type: ' + (file.type || 'application/octet-stream') + '\r\n\r\n');
        parts.push(buffer);
        parts.push('\r\n--' + boundary + '--\r\n');
        const blob = new Blob(parts, { type: 'multipart/form-data; boundary=' + boundary });
        console.log('[LSB 图床上传] multipart 请求体: 字段 =', profile.fileField, '文件名 =', file && file.name, 'provider =', profile.provider, 'boundary =', boundary, 'body大小 =', blob.size);
        return { data: blob, contentType: 'multipart/form-data; boundary=' + boundary };
    });
}

// 用单个图床配置上传一张图片（含 412 时 fetch 重试）
function uploadWithProfile(profile: any, file: any) {
    return buildUploadBody(profile, file).then(function (body) {
        const headers = buildUploadHeaders(profile, body.contentType);
        console.log('[LSB 图床上传] 发送请求:', profile.method, profile.endpoint);
        debugLogHeaders(headers);

        return sendUploadRequest(profile, headers, body.data).catch(function (error) {
            // Tampermonkey 可能不放行自定义 User-Agent（如 Catbox 强制校验 UA），此时改用 fetch 重试
            if (error && error.lsbRetryWithFetch && typeof GM_xmlhttpRequest === 'function') {
                console.warn('[LSB 图床上传] GM_xmlhttpRequest 返回 412（UA 未生效），改用 fetch 重试（浏览器原生 UA）');
                return sendUploadRequest(profile, headers, body.data, true);
            }
            throw error;
        });
    });
}

// 按图床优先级依次尝试：当前配置优先，失败后尝试下一个，全部失败后抛出综合错误
function uploadOneImage(file: any) {
    const profiles = getFailoverProfiles();
    const errors: any[] = [];
    const tryProfile = function (index: number): Promise<string> {
        if (index >= profiles.length) {
            const detail = errors.map(function (error) {
                return error && error.message ? error.message : String(error);
            }).join('；');
            return Promise.reject(new Error('所有图床均上传失败：' + (detail || '未知错误')));
        }
        const profile = profiles[index];
        let valid;
        try {
            valid = validateUploadProfile(profile);
        } catch (error: any) {
            console.warn('[LSB 图床上传] 配置校验失败，尝试下一个图床: 「' + profile.name + '」', error && error.message);
            errors.push(error);
            return tryProfile(index + 1);
        }
        console.log('[LSB 图床上传] 尝试图床: 「' + profile.name + '」(' + profile.provider + ')', valid.endpoint);
        return uploadWithProfile(valid, file).catch(function (error) {
            console.warn('[LSB 图床上传] 图床「' + profile.name + '」上传失败，尝试下一个:', error && error.message);
            errors.push(error);
            return tryProfile(index + 1);
        });
    };
    return tryProfile(0);
}

function sendUploadRequest(profile: any, headers: any, data: any, forceFetch: boolean = false) {
    // 优先使用 GM_xmlhttpRequest（不受 CORS 限制）；fetch 仅作为回退（GM 不可用或 412 重试时）
    if (!forceFetch && typeof GM_xmlhttpRequest === 'function') {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: profile.method,
                url: profile.endpoint,
                headers: headers,
                data: data,
                responseType: profile.provider === 'postimages' ? '' : 'json',
                timeout: 60000,
                onload: function (response: any) {
                    console.log('[LSB 图床上传] GM_xmlhttpRequest onload: status =', response.status, '响应文本(前300字符) =', String(response.responseText || '').slice(0, 300));
                    if (response.status < 200 || response.status >= 300) {
                        const error: any = new Error('图床返回 HTTP ' + response.status);
                        if (response.status === 412) {
                            error.lsbRetryWithFetch = true;
                        }
                        reject(error);
                        return;
                    }
                    try {
                        resolve(resolveUploadedImageUrl(parseUploadResponse(response.response, response.responseText), profile));
                    } catch (error) {
                        console.error('[LSB 图床上传] 解析上传结果失败:', error);
                        reject(error);
                    }
                },
                onerror: function (error: any) {
                    console.error('[LSB 图床上传] GM_xmlhttpRequest onerror:', error);
                    reject(new Error('网络或跨域请求失败'));
                },
                ontimeout: function () {
                    console.error('[LSB 图床上传] GM_xmlhttpRequest 超时(60s)');
                    reject(new Error('请求超时'));
                }
            });
        });
    }

    console.log('[LSB 图床上传] 使用 fetch 发送请求（携带浏览器原生 UA）');
    return fetch(profile.endpoint, {
        method: profile.method,
        headers: headers,
        body: data,
        credentials: 'omit'
    }).then(function (response) {
        if (!response.ok) {
            throw new Error('图床返回 HTTP ' + response.status);
        }
        return response.text();
    }).then(function (text) {
        console.log('[LSB 图床上传] fetch 响应(前300字符) =', String(text).slice(0, 300));
        return resolveUploadedImageUrl(parseUploadResponse(null, text), profile);
    }).catch(function (error) {
        console.error('[LSB 图床上传] fetch 请求失败:', error);
        throw error;
    });
}

function parseUploadResponse(response: any, responseText: any) {
    if (response && typeof response === 'object') {
        return response;
    }
    if (typeof responseText === 'string') {
        try {
            return JSON.parse(responseText);
        } catch (error) {
            return responseText;
        }
    }
    return response;
}

function resolveUploadedImageUrl(payload: any, config: any) {
    console.log('[LSB 图床上传] 解析上传响应, provider =', config.provider, 'responsePath =', config.responsePath, '响应体 =', typeof payload === 'string' ? payload.slice(0, 300) : JSON.stringify(payload).slice(0, 300));
    if (config.provider === 'postimages') {
        // Postimages 返回 HTML 页面，直接从中提取 i.postimg.cc 直链
        return extractPostimagesUrl(payload);
    }
    if (config.provider !== 'nodeimage') {
        return extractImageUrl(payload, config.responsePath);
    }

    // Nodeimage 的公开接口说明未公开固定返回字段，因此优先使用预设字段，再兼容常见图片直链字段。
    const paths = [config.responsePath, 'data.url', 'data.link', 'url', 'link', 'image.url', 'image.link', 'data.image.url', 'data.image.link'];
    for (let index = 0; index < paths.length; index += 1) {
        try {
            return extractImageUrl(payload, paths[index]);
        } catch (error) {
            // 尝试下一个候选字段。
        }
    }

    const fallbackUrl = findFirstSafeHttpsUrl(payload, 0);
    if (fallbackUrl) {
        return fallbackUrl;
    }
    throw new Error('未从 Nodeimage 返回结果中取得 HTTPS 图片直链');
}

// 从 Postimages 上传返回结果中提取图片直链（/json 端点返回 JSON，回退兼容 HTML）
function extractPostimagesUrl(payload: any) {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload || '');
    try {
        const parsed = JSON.parse(text);
        const url = parsed && (parsed.url || (parsed.data && parsed.data.url));
        if (url && isSafeHttpsUrl(url)) {
            return url;
        }
    } catch (error) {
        // 非 JSON 响应，继续走 HTML 正则
    }
    const match = text.match(/https:\/\/i\.postimg\.cc\/[A-Za-z0-9]+\/[^"'<>\s]+/);
    if (match) {
        return match[0];
    }
    throw new Error('未从 Postimages 返回结果中解析到图片直链');
}

function findFirstSafeHttpsUrl(value: any, depth: number) {
    if (depth > 5 || value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        const candidate = value.trim();
        return isSafeHttpsUrl(candidate) ? candidate : '';
    }
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
            const arrayUrl = findFirstSafeHttpsUrl(value[index], depth + 1);
            if (arrayUrl) {
                return arrayUrl;
            }
        }
        return '';
    }
    if (typeof value === 'object') {
        const keys = Object.keys(value);
        for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
            const objectUrl = findFirstSafeHttpsUrl(value[keys[keyIndex]], depth + 1);
            if (objectUrl) {
                return objectUrl;
            }
        }
    }
    return '';
}

function extractImageUrl(payload: any, path: any) {
    let value = payload;
    if (typeof payload === 'string') {
        value = payload.trim();
    } else {
        path.split('.').forEach(function (segment) {
            if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, segment)) {
                value = value[segment];
            } else {
                value = null;
            }
        });
    }

    if (typeof value !== 'string' || !isSafeHttpsUrl(value)) {
        throw new Error('未从返回结果中取得 HTTPS 图片直链，请检查返回字段');
    }
    return value;
}

// 在编辑器光标处插入一段文本（自动补前后换行），并触发 input/change
function insertMarkdownText(editor: any, text: string) {
    const prefix = getEditorText(editor) ? '\n' : '';
    const content = prefix + text + '\n';

    if (editor.matches('[contenteditable="true"]')) {
        editor.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
            selection.getRangeAt(0).deleteContents();
            selection.getRangeAt(0).insertNode(document.createTextNode(content));
            selection.collapseToEnd();
        } else {
            editor.appendChild(document.createTextNode(content));
        }
    } else {
        const start = Number.isFinite(editor.selectionStart) ? editor.selectionStart : editor.value.length;
        const end = Number.isFinite(editor.selectionEnd) ? editor.selectionEnd : start;
        editor.focus();
        editor.setRangeText(content, start, end, 'end');
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
}

// 把编辑器内唯一占位文本替换为真实内容（上传成功时换成图片链接，失败时清空）
function replaceEditorText(editor: any, search: string, replacement: string) {
    if (!search) {
        return;
    }
    if (editor.matches('[contenteditable="true"]')) {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        const textNodes: any[] = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }
        for (let index = 0; index < textNodes.length; index += 1) {
            const node = textNodes[index];
            const foundIndex = node.textContent.indexOf(search);
            if (foundIndex < 0) {
                continue;
            }
            const before = node.textContent.slice(0, foundIndex);
            const after = node.textContent.slice(foundIndex + search.length);
            const parent = node.parentNode;
            if (!parent) {
                continue;
            }
            if (before) {
                parent.insertBefore(document.createTextNode(before), node);
            }
            if (replacement) {
                parent.insertBefore(document.createTextNode(replacement), node);
            }
            if (after) {
                parent.insertBefore(document.createTextNode(after), node);
            }
            parent.removeChild(node);
            break;
        }
    } else if (typeof editor.value === 'string') {
        const value = editor.value;
        const foundIndex = value.indexOf(search);
        if (foundIndex >= 0) {
            editor.value = value.slice(0, foundIndex) + replacement + value.slice(foundIndex + search.length);
        }
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
}

function getEditorText(editor: any) {
    return editor.matches('[contenteditable="true"]') ? editor.textContent.trim() : String(editor.value || '').trim();
}

function setImageUploadButtonState(editor: any, text: string, disabled: boolean) {
    const button = editor.nextElementSibling;
    if (!button || !button.hasAttribute('data-lsb-image-upload-button')) {
        return;
    }
    button.textContent = text;
    button.disabled = disabled;
}

function getUploadErrorMessage(error: any) {
    const message = error && error.message ? String(error.message) : '未知错误';
    return message.slice(0, 120);
}

// 上传失败时弹出居中提示框，避免用户需要去控制台翻日志
function showUploadErrorDialog(message: string) {
    if (document.getElementById('lsb-upload-error-dialog')) {
        return;
    }

    const dialog = document.createElement('div');
    dialog.id = 'lsb-upload-error-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-label', '图片上传失败');
    dialog.style.cssText = [
        'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);',
        'z-index: 2147483647; width: min(380px, calc(100vw - 32px));',
        'padding: 18px 20px; box-sizing: border-box;',
        'background: var(--panel, #1b1b1b); color: var(--text, #eeeeee);',
        'border: 1px solid var(--danger, #e28b8b); border-radius: 12px;',
        'box-shadow: 0 18px 46px var(--shadow-medium, rgba(0,0,0,.48));',
        'font: 13px/1.5 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;',
        'text-align: center;'
    ].join(' ');

    const title = document.createElement('div');
    title.textContent = '图片上传失败';
    title.style.cssText = 'font-size: 15px; font-weight: 700; margin-bottom: 10px; color: var(--danger, #e28b8b);';

    const content = document.createElement('div');
    content.textContent = message;
    content.style.cssText = 'color: var(--text-muted, #b6b6b6); margin-bottom: 16px; word-break: break-all;';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = '知道了';
    okBtn.style.cssText = [
        'width: 100%; padding: 9px 12px; border: 0; border-radius: 8px;',
        'background: var(--brand, #b8b8b8); color: #111; font: inherit; font-weight: 600; cursor: pointer;'
    ].join(' ');
    okBtn.addEventListener('click', function () {
        dialog.remove();
    });

    dialog.appendChild(title);
    dialog.appendChild(content);
    dialog.appendChild(okBtn);
    document.body.appendChild(dialog);
    okBtn.focus();
}
