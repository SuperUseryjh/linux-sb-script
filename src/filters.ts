import { settings } from './state';

let filterDebounceTimer = 0;

export function scheduleFilter() {
    window.clearTimeout(filterDebounceTimer);
    filterDebounceTimer = window.setTimeout(applyFilters, 200);
}

export function applyFilters() {
    const titleKeywords = (settings.titleFilters || []).filter(function (k) { return k.trim(); });
    const usernames = (settings.userFilters || []).filter(function (u) { return u.trim(); });

    const hasFilters = titleKeywords.length > 0 || usernames.length > 0;

    if (!hasFilters) {
        document.querySelectorAll('.post-item[data-lsb-filtered]').forEach(function (item: any) {
            item.style.display = '';
            item.removeAttribute('data-lsb-filtered');
        });
        return;
    }

    document.querySelectorAll('.post-item').forEach(function (item: any) {
        let shouldHide = false;

        // 标题关键字过滤
        if (!shouldHide && titleKeywords.length > 0) {
            const titleEl = item.querySelector('.post-title');
            if (titleEl) {
                const title = titleEl.textContent.toLowerCase();
                shouldHide = titleKeywords.some(function (kw) {
                    return title.includes(kw.toLowerCase());
                });
            }
        }

        // 用户名过滤 — 多选择器回退，兼容首页列表与帖子详情页
        if (!shouldHide && usernames.length > 0) {
            let matchedAuthor = '';
            // 选择器1：帖子详情页评论作者
            let authorEl = item.querySelector('.post-author');
            // 选择器2：用户资料链接（首页列表通用）
            if (!authorEl) {
                authorEl = item.querySelector('.post-meta a[href*="/user/"]');
            }
            // 选择器3：回退到 .post-meta 内第一个链接
            if (!authorEl) {
                const meta = item.querySelector('.post-meta');
                if (meta) {
                    authorEl = meta.querySelector('a');
                }
            }
            if (authorEl) {
                matchedAuthor = authorEl.textContent.trim();
            }

            if (matchedAuthor) {
                const lower = matchedAuthor.toLowerCase();
                shouldHide = usernames.some(function (u) {
                    return lower === u.toLowerCase();
                });
            }
        }

        if (shouldHide) {
            item.style.display = 'none';
            item.setAttribute('data-lsb-filtered', '1');
        } else {
            item.style.display = '';
            item.removeAttribute('data-lsb-filtered');
        }
    });
}
