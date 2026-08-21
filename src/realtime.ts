import { settings } from './state';
import { isHomePage, scheduleHomeMarkerEnhancements, applyHomePostNewWindow } from './home';
import { scheduleFilter } from './filters';
import { updateImageLightboxTargets } from './lightbox';
import { updateImageUploadTargets } from './imageUpload';
import { showStatus } from './status';
import { reportError } from './errorHandler';

// 实时更新：定时轮询首页 HTML，一次请求同时更新：
// 1) 顶栏通知徽章（.nav-mine .notify-badge，服务端渲染的未读数）
// 2) 帖子列表（.post-list .post-item），发现新帖自动插入列表顶部

let realtimeTimer = 0;
let realtimePollingInFlight = false;
let realtimeIntervalSec = 0;

// 根据设置启动/停止轮询
export function applyRealtimeRefresh() {
    if (!settings.realtimeRefresh) {
        console.log('[LSB 实时更新] 已停止轮询');
        stopRealtimePolling();
        return;
    }
    console.log('[LSB 实时更新] 启动轮询，间隔 = ' + settings.realtimeRefreshInterval + ' 秒');
    startRealtimePolling();
}

function startRealtimePolling() {
    // 已在轮询且间隔未变时不重复启动（避免 applySettings 反复重启）
    if (realtimeTimer && realtimeIntervalSec === settings.realtimeRefreshInterval) {
        return;
    }
    stopRealtimePolling();
    realtimeIntervalSec = settings.realtimeRefreshInterval;
    // 立即执行一次，再按间隔轮询
    pollOnce();
    realtimeTimer = window.setInterval(pollOnce, settings.realtimeRefreshInterval * 1000);
}

function stopRealtimePolling() {
    if (realtimeTimer) {
        window.clearInterval(realtimeTimer);
        realtimeTimer = 0;
        realtimeIntervalSec = 0;
    }
}

function pollOnce() {
    if (realtimePollingInFlight || !settings.realtimeRefresh) {
        if (realtimePollingInFlight) {
            console.warn('[LSB 实时更新] 上一次轮询尚未结束，跳过本次');
        }
        return;
    }
    // 仅在首页且页面可见时轮询，避免后台标签页空耗
    if (!isHomePage() || document.hidden) {
        console.log('[LSB 实时更新] 跳过轮询：非首页=' + !isHomePage() + ' 页面隐藏=' + document.hidden);
        return;
    }

    realtimePollingInFlight = true;
    const url = buildPollUrl();
    console.log('[LSB 实时更新] 发起轮询: GET ' + url);
    const done = function () {
        realtimePollingInFlight = false;
    };

    // 优先 fetch：浏览器原生 UA/Cookie，避免 Cloudflare 拦截 GM_xmlhttpRequest（其 UA 带 Tampermonkey 标识被 403）
    if (typeof fetch === 'function') {
        fetch(url, { credentials: 'same-origin' })
            .then(function (response) {
                console.log('[LSB 实时更新] fetch 响应: status = ' + response.status);
                return response.text();
            })
            .then(function (html) {
                try {
                    console.log('[LSB 实时更新] fetch 响应长度 = ' + html.length);
                    handlePollResponse(html);
                } catch (error) {
                    reportError(error, '实时更新', '实时更新解析失败');
                }
                done();
            })
            .catch(function (error) {
                console.warn('[LSB 实时更新] fetch 失败，回退 GM_xmlhttpRequest:', error);
                gmPoll(url, done);
            });
    } else {
        gmPoll(url, done);
    }
}

// GM_xmlhttpRequest 回退通道（跨域/无 fetch 环境）
function gmPoll(url: string, done: () => void) {
    if (typeof GM_xmlhttpRequest !== 'function') {
        done();
        return;
    }
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        timeout: 20000,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': window.location.href
        },
        onload: function (response) {
            try {
                const text = String(response.responseText);
                console.log('[LSB 实时更新] GM_xmlhttpRequest 响应: status = ' + response.status + ' 长度 = ' + text.length);
                handlePollResponse(text);
            } catch (error) {
                reportError(error, '实时更新', '实时更新解析失败');
            }
            done();
        },
        onerror: function () {
            console.warn('[LSB 实时更新] 轮询请求失败 (onerror)，下一轮重试');
            done();
        },
        ontimeout: function () {
            console.warn('[LSB 实时更新] 轮询请求超时，下一轮重试');
            done();
        }
    });
}

// 构造轮询 URL：保留当前页面的 sort 参数（如 ?sort=new），避免拉取到不同排序的列表
function buildPollUrl() {
    const base = window.location.origin + window.location.pathname;
    const sort = new URLSearchParams(window.location.search).get('sort');
    if (sort) {
        return base + '?sort=' + encodeURIComponent(sort);
    }
    return base;
}

function handlePollResponse(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    console.log('[LSB 实时更新] 解析响应：badge = ' + String(doc.querySelector('.nav-mine .notify-badge') ? doc.querySelector('.nav-mine .notify-badge')!.textContent : '无') + ' 响应普通帖数 = ' + doc.querySelectorAll('.post-list .post-item:not(.topic-pinned)').length + ' 当前普通帖数 = ' + document.querySelectorAll('.post-list .post-item:not(.topic-pinned)').length);
    updateNotifyBadge(doc);
    replacePostAreaIfChanged(doc);
}

// 更新顶栏通知徽章，通知数增加时提示；徽章不存在但有通知时自动创建
function updateNotifyBadge(doc: Document) {
    const navMine = document.querySelector<HTMLElement>('.nav-mine');
    const freshBadge = doc.querySelector<HTMLElement>('.nav-mine .notify-badge');
    if (!navMine) {
        console.log('[LSB 实时更新] 当前页面无 .nav-mine，跳过通知徽章');
        return;
    }
    const freshCount = freshBadge ? Number(freshBadge.textContent) || 0 : 0;
    let currentBadge = navMine.querySelector<HTMLElement>('.notify-badge');
    const currentCount = currentBadge ? Number(currentBadge.textContent) || 0 : 0;

    // 无新通知时删除徽章（若存在），与站点初始无徽章状态保持一致
    if (freshCount === 0) {
        if (currentBadge) {
            console.log('[LSB 实时更新] 通知归零，删除徽章');
            currentBadge.remove();
        }
        return;
    }

    // 有通知但当前无徽章时创建
    if (!currentBadge) {
        console.log('[LSB 实时更新] 创建通知徽章: ' + freshCount);
        currentBadge = document.createElement('span');
        currentBadge.className = 'notify-badge';
        navMine.appendChild(currentBadge);
    }

    // 有徽章且值未变化时无事可做
    if (freshCount === currentCount) {
        return;
    }

    console.log('[LSB 实时更新] 通知徽章更新: ' + currentCount + ' -> ' + freshCount);
    currentBadge.textContent = String(freshCount);
    if (freshCount > currentCount) {
        showStatus('有 ' + (freshCount - currentCount) + ' 条新通知');
        // 系统级通知（需 @grant GM_notification）
        if (typeof GM_notification === 'function') {
            try {
                GM_notification({
                    title: 'LINUX.SB 新通知',
                    text: '有 ' + (freshCount - currentCount) + ' 条新通知，点击查看',
                    timeout: 5000,
                    onclick: function () {
                        window.location.href = window.location.origin + '/user/' + (getSessionUserIdFromPage() || '') + '?tab=notifications';
                    }
                });
            } catch (error) {
                console.warn('[LSB 实时更新] GM_notification 调用失败（浏览器通知可能被禁用）:', error);
            }
        }
    }
}

// 从当前页面顶栏链接解析当前用户 id（用于通知跳转）
function getSessionUserIdFromPage() {
    const navMine = document.querySelector<HTMLAnchorElement>('.nav-mine');
    if (navMine) {
        const match = /\/user\/(\d+)/.exec(navMine.getAttribute('href') || '');
        if (match) {
            return match[1];
        }
    }
    return '';
}

// 帖子区域整体 hash 比对：hash 不同说明区域内容变了（新帖/新回复导致的时间戳或排序变化），整体覆写
function replacePostAreaIfChanged(doc: Document) {
    const currentList = document.querySelector<HTMLElement>('.post-list');
    const freshList = doc.querySelector<HTMLElement>('.post-list');
    if (!currentList || !freshList) {
        console.log('[LSB 实时更新] 帖子区域不存在（当前=' + !!currentList + ' 响应=' + !!freshList + '），跳过');
        return;
    }

    const currentHash = getPostAreaFingerprint(currentList);
    const freshHash = getPostAreaFingerprint(freshList);
    console.log('[LSB 实时更新] 帖子区域整体 hash：当前 = ' + currentHash + ' 响应 = ' + freshHash);

    if (currentHash === freshHash) {
        return;
    }

    // 用响应的帖子区域整体覆写当前区域
    const freshHtml = freshList.outerHTML;
    currentList.outerHTML = freshHtml;
    // 覆写后补跑脚本增强：身份徽章/头像资料卡、内容过滤、新窗口属性、图片灯箱/上传绑定
    scheduleHomeMarkerEnhancements();
    scheduleFilter();
    applyHomePostNewWindow();
    updateImageLightboxTargets();
    updateImageUploadTargets();
    console.log('[LSB 实时更新] 帖子区域已覆写');
    showStatus('帖子列表已更新');
}

// 计算帖子区域整体 hash：先克隆并剔除脚本注入的增强属性（data-lsb-* / target / rel），
// 否则当前 DOM 已被脚本改写，与响应原始 HTML 必然不同，会导致每轮都覆写
function getPostAreaFingerprint(root: Element) {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-lsb-home-post-original-target],[data-lsb-home-post-original-rel],[data-lsb-home-post-new-window],[data-lsb-avatar-card-bound],[data-lsb-identity-hydrated]').forEach(function (el: HTMLElement) {
        el.removeAttribute('data-lsb-home-post-original-target');
        el.removeAttribute('data-lsb-home-post-original-rel');
        el.removeAttribute('data-lsb-home-post-new-window');
        el.removeAttribute('data-lsb-avatar-card-bound');
        el.removeAttribute('data-lsb-identity-hydrated');
        el.removeAttribute('target');
        el.removeAttribute('rel');
    });
    return hashString(clone.outerHTML);
}

// 简单字符串哈希（djb2 变体），用于整段 HTML 对比
function hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return String(hash);
}
