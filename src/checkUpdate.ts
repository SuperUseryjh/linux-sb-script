import { STATIC_BASE_URL, UPDATE_VERSION_FILE, UPDATE_SCRIPT_FILE, LOCAL_STORAGE_LAST_CHECK_TIME, UPDATE_CHECK_INTERVAL, PREVIEW_UPDATE_CHECK_INTERVAL } from './constants';

// 检查远程是否有新版本，发现则弹出更新提示
export function checkUpdate() {
    const currentScriptVersion = GM_info.script.version; // 从 GM_info 获取当前脚本版本
    const lastCheckTime = parseInt(localStorage.getItem(LOCAL_STORAGE_LAST_CHECK_TIME) || '0', 10);
    const now = Date.now();

    const isStandardVersion = /^[0-9]+\.[0-9]+\.[0-9]+$/.test(currentScriptVersion);
    const currentCheckInterval = isStandardVersion ? UPDATE_CHECK_INTERVAL : PREVIEW_UPDATE_CHECK_INTERVAL;

    if (now - lastCheckTime < currentCheckInterval) {
        console.log('[LSB] 距离上次检查更新时间不足，跳过检查。');
        return;
    }

    console.log('[LSB] 正在检查更新...');
    localStorage.setItem(LOCAL_STORAGE_LAST_CHECK_TIME, now.toString());

    const versionPath = isStandardVersion ? 'pub' : 'perv';
    const updateUrl = STATIC_BASE_URL + '/' + versionPath + '/' + UPDATE_VERSION_FILE;

    GM_xmlhttpRequest({
        method: 'GET',
        url: updateUrl,
        onload: function (response: any) {
            try {
                const remotePackageJson = JSON.parse(response.responseText);
                const remoteVersion = remotePackageJson.version;

                if (remoteVersion && remoteVersion !== currentScriptVersion) {
                    console.log('[LSB] 发现新版本！当前版本:', currentScriptVersion, '最新版本:', remoteVersion);
                    const userScriptUrl = STATIC_BASE_URL + '/' + versionPath + '/' + UPDATE_SCRIPT_FILE;
                    showUpdateDialog(remoteVersion, currentScriptVersion, userScriptUrl);
                } else {
                    console.log('[LSB] 当前已是最新版本。');
                }
            } catch (error) {
                console.warn('[LSB] 解析更新信息失败（下次启动重试）:', error);
            }
        },
        onerror: function (response: any) {
            console.warn('[LSB] 检查更新失败（下次启动重试）:', response.status, response.statusText);
        }
    });
}

// 更新提示弹窗：显示版本差异，点击"去更新"在新标签页打开新版本脚本
function showUpdateDialog(remoteVersion: string, currentVersion: string, userScriptUrl: string) {
    if (document.getElementById('lsb-update-dialog')) {
        return;
    }

    const dialog = document.createElement('div');
    dialog.id = 'lsb-update-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', '发现新版本');
    dialog.style.cssText = [
        'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);',
        'z-index: 2147483647; width: min(340px, calc(100vw - 32px));',
        'padding: 18px 20px; box-sizing: border-box;',
        'background: var(--panel, #1b1b1b); color: var(--text, #eeeeee);',
        'border: 1px solid var(--line, #343434); border-radius: 12px;',
        'box-shadow: 0 18px 46px var(--shadow-medium, rgba(0,0,0,.48));',
        'font: 13px/1.5 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;',
        'text-align: center;'
    ].join(' ');
    dialog.innerHTML = [
        '<div style="font-size: 15px; font-weight: 700; margin-bottom: 10px;">发现新版本 ' + remoteVersion + '</div>',
        '<div style="color: var(--text-muted, #b6b6b6); margin-bottom: 16px;">当前版本 ' + currentVersion + '，点击下方按钮前往新版本页面。</div>',
        '<div style="display: flex; gap: 10px; justify-content: center;">',
        '  <button id="lsb-update-open" style="flex: 1; padding: 9px 12px; border: 0; border-radius: 8px; background: var(--brand, #b8b8b8); color: #111; font: inherit; font-weight: 600; cursor: pointer;">去更新</button>',
        '  <button id="lsb-update-close" style="flex: 1; padding: 9px 12px; border: 1px solid var(--line, #343434); border-radius: 8px; background: transparent; color: var(--text-muted, #b6b6b6); font: inherit; cursor: pointer;">稍后再说</button>',
        '</div>'
    ].join('');

    document.body.appendChild(dialog);

    dialog.querySelector('#lsb-update-open')!.addEventListener('click', function () {
        if (typeof GM_openInTab === 'function') {
            GM_openInTab(userScriptUrl, false);
        } else {
            window.open(userScriptUrl, '_blank');
        }
        dialog.remove();
    });
    dialog.querySelector('#lsb-update-close')!.addEventListener('click', function () {
        dialog.remove();
    });
}
