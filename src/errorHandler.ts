// 全局错误处理：统一收集错误日志并弹窗提示用户。
// - initErrorHandler()：注册全局捕获（未捕获异常 / 未处理的 Promise 拒绝），兜底弹窗
// - reportError()：替代各处 console.error 的入口，记录日志 + 弹窗（可恢复的网络性失败请用 console.warn，避免刷屏）

let errorDialogVisible = false;

// 注册全局错误捕获（应在脚本启动早期调用）
export function initErrorHandler() {
    window.addEventListener('error', function (event) {
        const error = event.error instanceof Error ? event.error : new Error(event.message || '未知错误');
        reportError(error, '未捕获异常');
    });
    window.addEventListener('unhandledrejection', function (event) {
        const reason = event && event.reason;
        reportError(reason instanceof Error ? reason : new Error(String(reason)), '未处理的 Promise 拒绝');
    });
}

// 统一错误处理：打印日志 + 弹窗提示用户
export function reportError(error: unknown, context?: string, title?: string) {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = context ? '[' + context + '] ' : '';
    console.error(prefix, error);
    showErrorDialog(title || '脚本运行出错', prefix + message);
}

// 居中错误弹窗；同一时间只弹一个
function showErrorDialog(title: string, message: string) {
    if (errorDialogVisible) {
        return;
    }
    errorDialogVisible = true;

    const dialog = document.createElement('div');
    dialog.id = 'lsb-global-error-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-label', title);
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

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = 'font-size: 15px; font-weight: 700; margin-bottom: 10px; color: var(--danger, #e28b8b);';

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
        errorDialogVisible = false;
    });

    dialog.appendChild(titleEl);
    dialog.appendChild(content);
    dialog.appendChild(okBtn);
    document.body.appendChild(dialog);
    okBtn.focus();
}
