let statusElement: any = null;

export function setStatusElement(element: any) {
    statusElement = element;
}

export function showStatus(message: string) {
    if (!statusElement) {
        return;
    }
    statusElement.textContent = message;
    window.setTimeout(function () {
        if (statusElement && statusElement.textContent === message) {
            statusElement.textContent = '';
        }
    }, 1600);
}
