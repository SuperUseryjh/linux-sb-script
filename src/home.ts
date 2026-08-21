import { settings, ui } from './state';
import { HOME_LOGO_SVG, IDENTITY_DEFINITIONS, HOME_PROFILE_CACHE_TTL, HOME_PRIVATE_DATA_CACHE_TTL } from './constants';
import { stripSearchEnhancement } from './search';

let homeMarkerDebounceTimer = 0;
let homeProfileCard: any = null;
let homeProfileCardHideTimer = 0;
const homeProfileCache: any = Object.create(null);
let homePrivateDataCache: any = null;
let homeIdentityObserver: any = null;
const homeIdentityTargets = new WeakMap();

export function isHomePage() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/') {
        return true;
    }
    if (path !== '/index.php') {
        return false;
    }
    const query = new URLSearchParams(window.location.search);
    return !query.has('a') && !query.has('do') && !query.has('id');
}

export function applyHomePersonalization() {
    const existing = document.getElementById('lsb-home-personalization');
    if (!settings.homePersonalized || !isHomePage()) {
        if (existing) {
            existing.remove();
        }
        document.querySelectorAll('.lsb-home-personalized-layout').forEach(function (layout) {
            layout.classList.remove('lsb-home-personalized-layout');
        });
        return;
    }

    const forumLayout = document.querySelector('main.wrap .home-shell .forum-layout, main.wrap .forum-layout');
    const forumMain = forumLayout ? forumLayout.querySelector('.forum-main') : null;
    if (!forumLayout || !forumMain) {
        return;
    }

    if (existing) {
        if (existing.parentElement !== forumLayout) {
            forumLayout.insertBefore(existing, forumLayout.firstChild);
        }
        forumLayout.classList.add('lsb-home-personalized-layout');
        return;
    }

    const hero = document.createElement('section');
    hero.id = 'lsb-home-personalization';
    hero.setAttribute('aria-label', 'LINUX SB 首页欢迎区');

    const logo = document.createElement('div');
    logo.className = 'lsb-home-logo';
    logo.innerHTML = HOME_LOGO_SVG;

    const tagline = document.createElement('h1');
    tagline.className = 'lsb-home-tagline';
    tagline.textContent = 'Here IS The New Ideal Community';

    const sourceSearch = document.querySelector('.top .search-form, .search-form');
    if (!sourceSearch) {
        return;
    }
    const search = sourceSearch.cloneNode(true) as any;
    stripSearchEnhancement(search);
    search.className = 'search-form lsb-home-search-form';
    search.removeAttribute('id');
    search.setAttribute('aria-label', '首页搜索');
    const searchInput = search.querySelector('.search-input');
    if (searchInput) {
        searchInput.setAttribute('aria-label', '搜索关键词');
    }

    hero.appendChild(logo);
    hero.appendChild(tagline);
    hero.appendChild(search);

    forumLayout.insertBefore(hero, forumLayout.firstChild);
    forumLayout.classList.add('lsb-home-personalized-layout');
}

// 首页帖子链接新窗口打开（开启时设 target=_blank，关闭时恢复原属性）
export function applyHomePostNewWindow() {
    if (!isHomePage()) {
        return;
    }

    document.querySelectorAll('.post-item .post-title[href*="/topic/"], .post-item .topic-pages a[href*="/topic/"]').forEach(function (link: any) {
        if (settings.homePostNewWindow) {
            if (!link.hasAttribute('data-lsb-home-post-new-window')) {
                link.setAttribute('data-lsb-home-post-original-target', link.hasAttribute('target') ? link.getAttribute('target') : '__lsb_none__');
                link.setAttribute('data-lsb-home-post-original-rel', link.hasAttribute('rel') ? link.getAttribute('rel') : '__lsb_none__');
                link.setAttribute('data-lsb-home-post-new-window', '1');
            }
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        } else if (link.hasAttribute('data-lsb-home-post-new-window')) {
            const originalTarget = link.getAttribute('data-lsb-home-post-original-target');
            const originalRel = link.getAttribute('data-lsb-home-post-original-rel');
            if (originalTarget === '__lsb_none__') {
                link.removeAttribute('target');
            } else {
                link.setAttribute('target', originalTarget);
            }
            if (originalRel === '__lsb_none__') {
                link.removeAttribute('rel');
            } else {
                link.setAttribute('rel', originalRel);
            }
            link.removeAttribute('data-lsb-home-post-original-target');
            link.removeAttribute('data-lsb-home-post-original-rel');
            link.removeAttribute('data-lsb-home-post-new-window');
        }
    });
}

export function applySidebarSwap() {
    if (!isHomePage()) {
        return;
    }
    const forumLayout = document.querySelector('main.wrap .home-shell .forum-layout, main.wrap .forum-layout');
    if (forumLayout) {
        if (settings.sidebarSwap) {
            forumLayout.classList.add('lsb-home-sidebar-swapped');
        } else {
            forumLayout.classList.remove('lsb-home-sidebar-swapped');
        }
    }

    // 切换按钮位置对调联动（设置面板为居中模态框，不参与对调）
    if (ui.toggleButton) {
        if (settings.sidebarSwap) {
            ui.toggleButton.classList.add('lsb-toggle-left');
            ui.toggleButton.classList.remove('lsb-toggle-right');
        } else {
            ui.toggleButton.classList.add('lsb-toggle-right');
            ui.toggleButton.classList.remove('lsb-toggle-left');
        }
    }
}

function isLsbMarkerNode(node: any) {
    if (!node || node.nodeType !== 1) {
        return false;
    }
    return Boolean(node.matches && (node.matches('.lsb-author-enhancement, #lsb-home-profile-card') || node.closest('.lsb-author-enhancement, #lsb-home-profile-card')));
}

export function shouldRefreshHomeMarkerEnhancements(mutations: any) {
    return Array.from(mutations || []).some(function (mutation: any) {
        if (mutation.type !== 'childList' || isLsbMarkerNode(mutation.target)) {
            return false;
        }
        if (mutation.target && mutation.target.nodeType === 1 && mutation.target.closest && mutation.target.closest('.post-item')) {
            return true;
        }
        return Array.from(mutation.addedNodes || []).some(function (node: any) {
            return node.nodeType === 1 && !isLsbMarkerNode(node) && (node.matches('.post-item') || node.querySelector('.post-item'));
        });
    });
}

export function scheduleHomeMarkerEnhancements() {
    window.clearTimeout(homeMarkerDebounceTimer);
    homeMarkerDebounceTimer = window.setTimeout(applyHomeMarkerEnhancements, 90);
}

function getHomeUserId(href: any) {
    const match = String(href || '').match(/\/user\/(\d+)(?:[/?#]|$)/);
    return match ? match[1] : '';
}

function resolveIdentity(rawIdentity: any) {
    const normalized = String(rawIdentity || '').replace(/\s+/g, ' ').trim();
    const matchedKey = Object.keys(IDENTITY_DEFINITIONS).find(function (key) {
        return IDENTITY_DEFINITIONS[key].aliases.some(function (alias) {
            return normalized === alias;
        });
    });
    return matchedKey ? { key: matchedKey, label: IDENTITY_DEFINITIONS[matchedKey].label } : null;
}

function extractProfileMetric(text: any, labels: string[]) {
    const source = String(text || '').replace(/\s+/g, ' ');
    const escapedLabels = labels.map(function (label) {
        return label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    const match = source.match(new RegExp('(?:' + escapedLabels.join('|') + ')\\s*(?:[:：]\\s*)?([0-9][0-9,]*(?:\\s*(?:天|次|人|个))?)'));
    return match ? match[1].replace(/\s+/g, '') : '暂未公开';
}

function parseHomeProfile(html: any, user: any) {
    const profileDocument = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const nameElement = profileDocument.querySelector('.user-card .user-name, .user-name');
    const rankElement = profileDocument.querySelector('.user-card .user-rank, .user-rank');
    const profileText = profileDocument.body ? profileDocument.body.textContent : '';
    const rankText = rankElement ? rankElement.textContent.replace(/\s+/g, ' ').trim() : '';
    const pointsMatch = rankText.match(/积分\s*([0-9][0-9,]*)/) || String(profileText).match(/积分\s*([0-9][0-9,]*)/);
    const rawIdentity = rankText.replace(/\s*[·•|].*$/, '').replace(/积分\s*[0-9][0-9,]*/, '').trim();

    return {
        username: nameElement ? nameElement.textContent.trim() : user.username,
        uid: user.uid,
        identity: rawIdentity || '未标注',
        identityDefinition: resolveIdentity(rawIdentity),
        points: pointsMatch ? pointsMatch[1] : '暂未公开',
        checkin: '仅本人可见',
        invitations: '仅本人可见'
    };
}

function getSessionUserId(profileDocument: any) {
    const userLink = profileDocument.querySelector('.user-card .user-name[href^="/user/"], .user-card .user-avatar-big[href^="/user/"]');
    return userLink ? getHomeUserId(userLink.getAttribute('href')) : '';
}

function getStatValueByLabel(root: any, label: string) {
    if (!root) {
        return '';
    }
    const labelElement: any = Array.from(root.querySelectorAll('span')).find(function (element: any) {
        return element.textContent.trim() === label;
    });
    const statBox = labelElement && labelElement.parentElement;
    const valueElement = statBox && statBox.querySelector('strong');
    return valueElement ? valueElement.textContent.trim() : '';
}

function parseCurrentUserCheckin(html: any) {
    const profileDocument = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const stats = profileDocument.querySelector('.daily-checkin-stats');
    const continuous = getStatValueByLabel(stats, '连续天数');
    const total = getStatValueByLabel(stats, '累计签到');
    const uid = getSessionUserId(profileDocument);
    return uid && (continuous || total) ? {
        uid: uid,
        display: continuous || total ? '连续 ' + (continuous || '0') + ' 天 · 累计 ' + (total || '0') + ' 次' : '暂未公开'
    } : null;
}

function findInvitePanel(profileDocument: any, title: string) {
    return Array.from(profileDocument.querySelectorAll('.admin-list-panel')).find(function (panel: any) {
        const heading = panel.querySelector('.admin-plugin-summary strong');
        return heading && heading.textContent.trim() === title;
    }) || null;
}

function countInviteEntries(panel: any, selector: string) {
    if (!panel) {
        return 0;
    }
    return Array.from(panel.querySelectorAll(selector)).filter(function (item: any) {
        return !item.classList.contains('empty-state');
    }).length;
}

function parseCurrentUserInvitations(html: any) {
    const profileDocument = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const uid = getSessionUserId(profileDocument);
    const codePanel = findInvitePanel(profileDocument, '可用邀请码');
    const invitedPanel = findInvitePanel(profileDocument, '我邀请到的用户');
    if (!uid || !codePanel || !invitedPanel) {
        return null;
    }
    const codeCount = countInviteEntries(codePanel, '.invite-code-grid > li');
    const invitedCount = countInviteEntries(invitedPanel, '.admin-manage-list > li');
    return {
        uid: uid,
        display: '可用 ' + codeCount + ' 个 · 成功 ' + invitedCount + ' 人'
    };
}

function getCurrentUserPrivateData(user: any) {
    const now = Date.now();
    if (homePrivateDataCache && Object.prototype.hasOwnProperty.call(homePrivateDataCache, 'data') && homePrivateDataCache.expiresAt > now) {
        return Promise.resolve(homePrivateDataCache.data && homePrivateDataCache.data.uid === user.uid ? homePrivateDataCache.data : null);
    }
    if (homePrivateDataCache && homePrivateDataCache.promise) {
        return homePrivateDataCache.promise.then(function (data) {
            return data && data.uid === user.uid ? data : null;
        });
    }

    const requestPage = function (path: string) {
        return fetch(path, { credentials: 'same-origin' }).then(function (response) {
            if (!response.ok) {
                throw new Error('个人数据请求失败');
            }
            return response.text();
        });
    };
    const request = Promise.all([requestPage('/daily_checkin'), requestPage('/invite_code')]).then(function (pages) {
        const checkin = parseCurrentUserCheckin(pages[0]);
        const invitations = parseCurrentUserInvitations(pages[1]);
        if (!checkin || !invitations || checkin.uid !== invitations.uid) {
            return null;
        }
        const data = { uid: checkin.uid, checkin: checkin.display, invitations: invitations.display };
        homePrivateDataCache = { data: data, expiresAt: Date.now() + HOME_PRIVATE_DATA_CACHE_TTL };
        return data;
    }).catch(function () {
        homePrivateDataCache = { data: null, expiresAt: Date.now() + 60 * 1000 };
        return null;
    });
    homePrivateDataCache = { promise: request };
    return request.then(function (data) {
        return data && data.uid === user.uid ? data : null;
    });
}

function getHomeProfile(user: any) {
    const cached = homeProfileCache[user.uid];
    const now = Date.now();
    if (cached && cached.data && cached.expiresAt > now) {
        return Promise.resolve(cached.data);
    }
    if (cached && cached.promise) {
        return cached.promise;
    }

    const profileUrl = new URL(user.profileUrl, window.location.origin).href;
    const request = fetch(profileUrl, { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) {
            throw new Error('个人资料请求失败');
        }
        return response.text();
    }).then(function (html) {
        const data = parseHomeProfile(html, user);
        homeProfileCache[user.uid] = { data: data, expiresAt: Date.now() + HOME_PROFILE_CACHE_TTL };
        return data;
    }).catch(function () {
        const fallback = {
            username: user.username,
            uid: user.uid,
            identity: '暂未公开',
            identityDefinition: null,
            points: '暂未公开',
            checkin: '暂未公开',
            invitations: '暂未公开'
        };
        homeProfileCache[user.uid] = { data: fallback, expiresAt: Date.now() + 60 * 1000 };
        return fallback;
    });

    homeProfileCache[user.uid] = { promise: request };
    return request;
}

function createProfileCardItem(label: string, value: any, allowMarquee?: boolean) {
    const item = document.createElement('div');
    item.className = 'lsb-profile-card-item';
    const title = document.createElement('dt');
    title.textContent = label;
    const content = document.createElement('dd');
    if (allowMarquee) {
        content.dataset.lsbMarquee = 'true';
        content.title = value;
    }
    const valueElement = document.createElement('span');
    valueElement.className = 'lsb-profile-card-value';
    valueElement.textContent = value;
    content.appendChild(valueElement);
    item.appendChild(title);
    item.appendChild(content);
    return item;
}

function refreshHomeProfileCardOverflow() {
    if (!homeProfileCard || homeProfileCard.hidden) {
        return;
    }
    window.requestAnimationFrame(function () {
        if (!homeProfileCard || homeProfileCard.hidden) {
            return;
        }
        homeProfileCard.querySelectorAll('dd[data-lsb-marquee="true"]').forEach(function (content) {
            const valueElement = content.querySelector('.lsb-profile-card-value');
            if (!valueElement) {
                return;
            }
            content.classList.remove('lsb-profile-card-overflow');
            content.style.removeProperty('--lsb-marquee-offset');
            content.style.removeProperty('--lsb-marquee-duration');
            const overflow = Math.ceil(valueElement.scrollWidth - content.clientWidth);
            if (overflow <= 4) {
                return;
            }
            const duration = Math.min(34, Math.max(16, 16 + overflow / 7));
            content.classList.add('lsb-profile-card-overflow');
            content.style.setProperty('--lsb-marquee-offset', '-' + overflow + 'px');
            content.style.setProperty('--lsb-marquee-duration', duration.toFixed(1) + 's');
        });
    });
}

function renderHomeProfileCard(user: any, profile: any, loading: boolean) {
    if (!homeProfileCard) {
        return;
    }
    homeProfileCard.textContent = '';
    homeProfileCard.dataset.uid = user.uid;
    homeProfileCard.dataset.loading = String(Boolean(loading));

    const head = document.createElement('div');
    head.className = 'lsb-profile-card-head';
    if (user.avatarUrl) {
        const avatar = document.createElement('img');
        avatar.className = 'lsb-profile-card-avatar';
        avatar.src = user.avatarUrl;
        avatar.alt = '';
        head.appendChild(avatar);
    }
    const identityBlock = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'lsb-profile-card-name';
    name.textContent = profile ? profile.username : user.username;
    const uid = document.createElement('div');
    uid.className = 'lsb-profile-card-uid';
    uid.textContent = 'UID ' + user.uid;
    identityBlock.appendChild(name);
    identityBlock.appendChild(uid);
    head.appendChild(identityBlock);

    const grid = document.createElement('dl');
    grid.className = 'lsb-profile-card-grid';
    grid.appendChild(createProfileCardItem('积分', profile ? profile.points : '读取中'));
    grid.appendChild(createProfileCardItem('身份', profile ? profile.identity : '读取中'));
    grid.appendChild(createProfileCardItem('签到数据', profile ? profile.checkin : '读取中', true));
    grid.appendChild(createProfileCardItem('邀请数据', profile ? profile.invitations : '读取中', true));
    homeProfileCard.appendChild(head);
    homeProfileCard.appendChild(grid);
}

function positionHomeProfileCard(anchor: any) {
    if (!homeProfileCard || !anchor) {
        return;
    }
    const rect = anchor.getBoundingClientRect();
    const gap = 10;
    const maxLeft = Math.max(12, window.innerWidth - homeProfileCard.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - homeProfileCard.offsetHeight - 12);
    const preferredLeft = rect.right + gap;
    const left = preferredLeft + homeProfileCard.offsetWidth <= window.innerWidth - 12 ? preferredLeft : rect.left - homeProfileCard.offsetWidth - gap;
    const top = rect.top;
    homeProfileCard.style.left = Math.round(Math.max(12, Math.min(maxLeft, left))) + 'px';
    homeProfileCard.style.top = Math.round(Math.max(12, Math.min(maxTop, top))) + 'px';
}

export function hideHomeProfileCard() {
    window.clearTimeout(homeProfileCardHideTimer);
    if (homeProfileCard) {
        homeProfileCard.classList.remove('lsb-visible');
        homeProfileCard.hidden = true;
    }
}

function showHomeProfileCard(anchor: any, user: any) {
    if (!settings.avatarProfileCard || !document.body) {
        return;
    }
    window.clearTimeout(homeProfileCardHideTimer);
    if (!homeProfileCard) {
        homeProfileCard = document.createElement('aside');
        homeProfileCard.id = 'lsb-home-profile-card';
        homeProfileCard.setAttribute('role', 'status');
        homeProfileCard.setAttribute('aria-live', 'polite');
        homeProfileCard.hidden = true;
        document.body.appendChild(homeProfileCard);
    }
    renderHomeProfileCard(user, null, true);
    homeProfileCard.hidden = false;
    positionHomeProfileCard(anchor);
    refreshHomeProfileCardOverflow();
    homeProfileCard.classList.add('lsb-visible');

    getHomeProfile(user).then(function (profile) {
        if (!homeProfileCard || homeProfileCard.dataset.uid !== user.uid || homeProfileCard.hidden) {
            return;
        }
        renderHomeProfileCard(user, profile, false);
        positionHomeProfileCard(anchor);
        refreshHomeProfileCardOverflow();
        return getCurrentUserPrivateData(user).then(function (privateData) {
            if (!privateData || !homeProfileCard || homeProfileCard.dataset.uid !== user.uid || homeProfileCard.hidden) {
                return;
            }
            profile.checkin = privateData.checkin;
            profile.invitations = privateData.invitations;
            renderHomeProfileCard(user, profile, false);
            positionHomeProfileCard(anchor);
            refreshHomeProfileCardOverflow();
        });
    });
}

function bindHomeAvatarProfileCard(avatarLink: any, user: any) {
    if (!avatarLink || avatarLink.getAttribute('data-lsb-avatar-card-bound') === '1') {
        return;
    }
    avatarLink.setAttribute('data-lsb-avatar-card-bound', '1');
    avatarLink.addEventListener('mouseenter', function () {
        showHomeProfileCard(avatarLink, user);
    });
    avatarLink.addEventListener('mouseleave', function () {
        homeProfileCardHideTimer = window.setTimeout(hideHomeProfileCard, 90);
    });
    avatarLink.addEventListener('focus', function () {
        showHomeProfileCard(avatarLink, user);
    });
    avatarLink.addEventListener('blur', hideHomeProfileCard);
}

function renderHomeAuthorEnhancement(enhancement: any, user: any, profile: any) {
    if (!enhancement || !enhancement.isConnected) {
        return;
    }
    const identityKey = settings.identityBadges && profile && profile.identityDefinition ? profile.identityDefinition.key : '';
    const renderState = (settings.identityBadges ? (identityKey || 'pending') : 'identity-off') + '|' + (settings.uidBadges ? 'uid-on' : 'uid-off');
    if (enhancement.dataset.lsbRenderState === renderState) {
        return;
    }
    if (!identityKey && !settings.uidBadges && !settings.identityBadges) {
        enhancement.remove();
        return;
    }
    enhancement.textContent = '';
    enhancement.removeAttribute('data-lsb-identity');
    if (identityKey) {
        enhancement.dataset.lsbIdentity = identityKey;
        const identityBadge = document.createElement('span');
        identityBadge.className = 'lsb-identity-badge';
        identityBadge.textContent = profile.identityDefinition.label;
        enhancement.appendChild(identityBadge);
    }
    if (settings.uidBadges) {
        const uidBadge = document.createElement('span');
        uidBadge.className = 'lsb-uid-badge';
        uidBadge.textContent = 'UID ' + user.uid;
        enhancement.appendChild(uidBadge);
    }
    enhancement.dataset.lsbRenderState = renderState;
}

function hydrateHomeIdentity(item: any, user: any, enhancement: any) {
    if (!settings.identityBadges || item.dataset.lsbIdentityHydrated === user.uid) {
        return;
    }
    getHomeProfile(user).then(function (profile) {
        item.removeAttribute('data-lsb-identity-queued');
        item.dataset.lsbIdentityHydrated = user.uid;
        if (!item.isConnected || !enhancement.isConnected) {
            return;
        }
        renderHomeAuthorEnhancement(enhancement, user, profile);
    });
}

function observeHomeIdentity(item: any, user: any, enhancement: any) {
    if (!settings.identityBadges || item.dataset.lsbIdentityHydrated === user.uid || item.dataset.lsbIdentityQueued === user.uid) {
        return;
    }
    item.dataset.lsbIdentityQueued = user.uid;
    if (typeof IntersectionObserver !== 'function') {
        hydrateHomeIdentity(item, user, enhancement);
        return;
    }
    if (!homeIdentityObserver) {
        homeIdentityObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }
                homeIdentityObserver.unobserve(entry.target);
                const target = homeIdentityTargets.get(entry.target);
                if (target) {
                    hydrateHomeIdentity(entry.target, target.user, target.enhancement);
                    homeIdentityTargets.delete(entry.target);
                }
            });
        }, { rootMargin: '180px 0px' });
    }
    homeIdentityTargets.set(item, { user: user, enhancement: enhancement });
    homeIdentityObserver.observe(item);
}

export function applyHomeMarkerEnhancements() {
    if (!isHomePage()) {
        document.querySelectorAll('.lsb-author-enhancement').forEach(function (element) { element.remove(); });
        hideHomeProfileCard();
        return;
    }

    document.querySelectorAll('.post-item').forEach(function (item: any) {
        const authorLink = item.querySelector('.post-meta a[href^="/user/"]');
        const avatarImage = item.querySelector('a[href^="/user/"] img');
        const avatarLink = avatarImage ? avatarImage.closest('a[href^="/user/"]') : null;
        if (!authorLink) {
            return;
        }
        const uid = getHomeUserId(authorLink.getAttribute('href'));
        if (!uid) {
            return;
        }
        const user = {
            uid: uid,
            username: authorLink.textContent.trim(),
            profileUrl: authorLink.getAttribute('href'),
            avatarUrl: avatarImage ? avatarImage.src : ''
        };
        let enhancement = authorLink.parentElement && authorLink.parentElement.querySelector(':scope > .lsb-author-enhancement');
        if (!enhancement) {
            enhancement = document.createElement('span');
            enhancement.className = 'lsb-author-enhancement';
            authorLink.insertAdjacentElement('afterend', enhancement);
        }
        const cachedProfile = homeProfileCache[user.uid] && homeProfileCache[user.uid].data;
        renderHomeAuthorEnhancement(enhancement, user, cachedProfile || null);
        observeHomeIdentity(item, user, enhancement);

        if (avatarLink) {
            bindHomeAvatarProfileCard(avatarLink, user);
        }
    });

    if (!settings.avatarProfileCard) {
        hideHomeProfileCard();
    }
}
