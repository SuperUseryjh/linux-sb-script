import { settings } from './state';
import { persistSettings } from './settings';
import { showStatus } from './status';

let autoCheckinInFlight = false;
let autoCheckinStartTimer = 0;

function getAutoCheckinDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
}

export function applyAutoCheckin() {
    window.clearTimeout(autoCheckinStartTimer);
    autoCheckinStartTimer = 0;

    if (!settings.autoCheckin || autoCheckinInFlight || settings.autoCheckinLastDate === getAutoCheckinDate()) {
        return;
    }

    const scheduleAttempt = function () {
        autoCheckinStartTimer = window.setTimeout(function () {
            autoCheckinStartTimer = 0;
            performAutoCheckin();
        }, 900);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleAttempt, { once: true });
    } else {
        scheduleAttempt();
    }
}

function hasCompletedDailyCheckin(html: any) {
    // 与参考脚本一致：站点不同页面可能只显示“已签到”。
    return /今天已签到|已签到|签到成功|已完成签到/.test(String(html || ''));
}

function isDailyCheckinLoginPage(html: any) {
    const source = String(html || '');
    return /用户名或邮箱|忘记密码|<title[^>]*>[^<]*登录|name=["'](?:username|password)["']/i.test(source);
}

function hasDailyCheckinFailure(html: any) {
    // 仅识别明确的签到失败结果，普通页面中的 CSRF 隐藏字段不视为异常。
    return /签到失败|请求失败|(?:csrf|token)[^\n<]{0,32}(?:失效|错误|无效)|error\s*(?:message|:)/i.test(String(html || ''));
}

function extractDailyCheckinCsrf(html: any) {
    const source = String(html || '');
    try {
        const documentNode = new DOMParser().parseFromString(source, 'text/html');
        const input = documentNode.querySelector('input[name="_csrf"], input[name="csrf_token"], input[name="csrf"]') as any;
        if (input && input.value) {
            return { name: input.name, value: input.value };
        }
    } catch (error) {
        // DOM 解析不可用时，继续使用正则回退。
    }

    const match = source.match(/<input\b[^>]*\bname=["'](_csrf|csrf_token|csrf)["'][^>]*\bvalue=["']([^"']+)["'][^>]*>/i) ||
        source.match(/<input\b[^>]*\bvalue=["']([^"']+)["'][^>]*\bname=["'](_csrf|csrf_token|csrf)["'][^>]*>/i);
    if (!match) {
        return null;
    }
    return match[1] === '_csrf' || match[1] === 'csrf_token' || match[1] === 'csrf' ?
        { name: match[1], value: match[2] } : { name: match[2], value: match[1] };
}

function fetchDailyCheckin(options: any): Promise<any> {
    return fetch('/daily_checkin', Object.assign({
        // 与参考脚本一致，显式携带当前登录会话的 Cookie。
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }, options || {}));
}

function performAutoCheckin() {
    const today = getAutoCheckinDate();
    if (!settings.autoCheckin || autoCheckinInFlight || settings.autoCheckinLastDate === today) {
        return;
    }

    autoCheckinInFlight = true;
    fetchDailyCheckin({ method: 'GET' }).then(function (response) {
        if (!response.ok || /\/login(?:[?#]|$)/.test(response.url || '')) {
            throw new Error('未检测到登录状态');
        }
        return response.text();
    }).then(function (html): any {
        if (isDailyCheckinLoginPage(html)) {
            throw new Error('未检测到登录状态');
        }
        if (hasCompletedDailyCheckin(html)) {
            return { completed: true };
        }

        if (!settings.autoCheckin) {
            return { cancelled: true };
        }

        const csrf = extractDailyCheckinCsrf(html);
        if (!csrf || !csrf.name || !csrf.value) {
            throw new Error('未找到签到凭据');
        }

        const formData = new FormData();
        formData.append(csrf.name, csrf.value);
        return fetchDailyCheckin({ method: 'POST', body: formData }).then(function (response) {
            if (!response.ok || /\/login(?:[?#]|$)/.test(response.url || '')) {
                throw new Error('签到请求未获授权');
            }
            return response.text();
        }).then(function (resultHtml) {
            if (isDailyCheckinLoginPage(resultHtml)) {
                throw new Error('签到请求未获授权');
            }
            if (hasCompletedDailyCheckin(resultHtml)) {
                return { completed: true };
            }
            // 与参考脚本相同：POST 后再次读取状态；不因通用页面文案提前中止。
            return fetchDailyCheckin({ method: 'GET' }).then(function (verifyResponse) {
                if (!verifyResponse.ok || /\/login(?:[?#]|$)/.test(verifyResponse.url || '')) {
                    throw new Error('无法验证签到结果');
                }
                return verifyResponse.text();
            }).then(function (verifyHtml) {
                if (isDailyCheckinLoginPage(verifyHtml)) {
                    throw new Error('无法验证登录状态');
                }
                if (hasCompletedDailyCheckin(verifyHtml)) {
                    return { completed: true };
                }
                if (hasDailyCheckinFailure(verifyHtml)) {
                    throw new Error('签到状态验证失败');
                }
                // 参考脚本同样将成功的 POST 作为最终回退判断；兼容不显示固定成功文字的站内版本。
                return { completed: true };
            });
        });
    }).then(function (result) {
        if (!result || !result.completed) {
            return;
        }
        settings.autoCheckinLastDate = today;
        persistSettings();
        showStatus('今日自动签到已完成');
    }).catch(function (error) {
        if (settings.autoCheckin) {
            console.warn('[LINUX.SB 自动签到]', error && error.message ? error.message : error);
            showStatus('自动签到未完成，请检查登录状态');
        }
    }).finally(function () {
        autoCheckinInFlight = false;
    });
}
