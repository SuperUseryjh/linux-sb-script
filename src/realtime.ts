import { settings } from './state';
import { isHomePage, scheduleHomeMarkerEnhancements, applyHomePostNewWindow } from './home';
import { scheduleFilter } from './filters';
import { showStatus } from './status';

// 实时更新：定时轮询首页 HTML，一次请求同时更新：
// 1) 顶栏通知徽章（.nav-mine .notify-badge，服务端渲染的未读数）
// 2) 帖子列表（.post-list .post-item），发现新帖自动插入列表顶部

let realtimeTimer = 0;
let realtimePollingInFlight = false;

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
    stopRealtimePolling();
    // 立即执行一次，再按间隔轮询
    pollOnce();
    realtimeTimer = window.setInterval(pollOnce, settings.realtimeRefreshInterval * 1000);
}

function stopRealtimePolling() {
    if (realtimeTimer) {
        window.clearInterval(realtimeTimer);
        realtimeTimer = 0;
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

    if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 20000,
            onload: function (response) {
                try {
                    const text = String(response.responseText);
                    console.log('[LSB 实时更新] GM_xmlhttpRequest 响应: status = ' + response.status + ' 长度 = ' + text.length);
                    handlePollResponse(text);
                } catch (error) {
                    console.error('[LSB 实时更新] 处理轮询响应失败:', error);
                }
                done();
            },
            onerror: function () {
                console.error('[LSB 实时更新] 轮询请求失败 (onerror)');
                done();
            },
            ontimeout: function () {
                console.error('[LSB 实时更新] 轮询请求超时');
                done();
            }
        });
    } else {
        fetch(url, { credentials: 'same-origin' })
            .then(function (response) {
                console.log('[LSB 实时更新] fetch 响应: status = ' + response.status);
                return response.text();
            })
            .then(function (html) {
                console.log('[LSB 实时更新] fetch 响应长度 = ' + html.length);
                handlePollResponse(html);
                done();
            })
            .catch(function (error) {
                console.error('[LSB 实时更新] 轮询请求失败 (fetch):', error);
                done();
            });
    }
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
    insertNewPosts(doc);
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

    // 无徽章且无新通知时无事可做
    if (!currentBadge && freshCount === 0) {
        return;
    }
    // 有徽章且值未变化时无事可做
    if (currentBadge && freshCount === currentCount) {
        return;
    }

    if (!currentBadge) {
        console.log('[LSB 实时更新] 创建通知徽章: ' + freshCount);
        currentBadge = document.createElement('span');
        currentBadge.className = 'notify-badge';
        navMine.appendChild(currentBadge);
    }

    console.log('[LSB 实时更新] 通知徽章更新: ' + currentCount + ' -> ' + freshCount);
    currentBadge.textContent = String(freshCount);
    if (freshCount > currentCount) {
        showStatus('有 ' + (freshCount - currentCount) + ' 条新通知');
    }
}

// 检测并插入新帖子（置顶帖固定不变，对比与插入均排除置顶帖）
function insertNewPosts(doc: Document) {
    const currentList = document.querySelector('.post-list');
    if (!currentList) {
        console.log('[LSB 实时更新] 当前页面无 .post-list，跳过帖子检测');
        return;
    }

    const currentMax = maxTopicId(document, true);
    if (currentMax === 0) {
        console.log('[LSB 实时更新] 当前页面未解析到普通帖子 id，跳过帖子检测');
        return;
    }

    const freshItems = Array.from(doc.querySelectorAll('.post-list .post-item')).filter(function (item) {
        return !item.classList.contains('topic-pinned');
    });
    const toInsert: string[] = [];
    for (const item of freshItems) {
        const title = item.querySelector<HTMLAnchorElement>('.post-title[href*="/topic/"]');
        const match = title && /\/topic\/(\d+)/.exec(title.getAttribute('href') || '');
        const id = match ? Number(match[1]) : 0;
        if (id > currentMax) {
            toInsert.push((item as HTMLElement).outerHTML);
        }
    }

    console.log('[LSB 实时更新] 当前最大普通帖 id = ' + currentMax + '，响应普通帖数 = ' + freshItems.length + '，需要插入 = ' + toInsert.length);

    if (!toInsert.length) {
        return;
    }

    // 插入位置：最后一个置顶帖之后，无置顶帖时插入列表顶部
    const pinnedItems = currentList.querySelectorAll('.topic-pinned');
    const lastPinned = pinnedItems.length ? pinnedItems[pinnedItems.length - 1] : null;
    if (lastPinned) {
        lastPinned.insertAdjacentHTML('afterend', toInsert.join(''));
    } else {
        currentList.insertAdjacentHTML('afterbegin', toInsert.join(''));
    }
    // 新插入的帖子补上脚本增强：身份徽章/头像资料卡、内容过滤、新窗口属性
    scheduleHomeMarkerEnhancements();
    scheduleFilter();
    applyHomePostNewWindow();
    console.log('[LSB 实时更新] 已插入 ' + toInsert.length + ' 个新帖子');
    showStatus('已自动加载 ' + toInsert.length + ' 个新帖子');
}

// 提取某文档中帖子列表的最大 topic id，excludePinned 时跳过置顶帖
function maxTopicId(root: Document, excludePinned = false) {
    let max = 0;
    root.querySelectorAll('.post-item .post-title[href*="/topic/"]').forEach(function (anchor: Element) {
        const item = anchor.closest('.post-item');
        if (excludePinned && item && item.classList.contains('topic-pinned')) {
            return;
        }
        const match = /\/topic\/(\d+)/.exec(anchor.getAttribute('href') || '');
        if (match) {
            const id = Number(match[1]);
            if (id > max) {
                max = id;
            }
        }
    });
    return max;
}
