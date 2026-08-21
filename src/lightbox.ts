import { settings } from './state';

let imageLightbox: any = null;
let imageLightboxImage: any = null;
let imageLightboxEventsBound = false;

export function applyImageLightbox() {
    ensureImageLightboxEvents();
    updateImageLightboxTargets();

    if (!settings.imageLightbox) {
        closeImageLightbox();
    }
}

export function updateImageLightboxTargets() {
    if (!document.querySelectorAll) {
        return;
    }

    document.querySelectorAll('.post-entry .post-content img, .post-item .post-content img').forEach(function (image) {
        if (settings.imageLightbox && image.getAttribute('src')) {
            image.setAttribute('data-lsb-lightbox-image', '1');
        } else {
            image.removeAttribute('data-lsb-lightbox-image');
        }
    });
}

function ensureImageLightboxEvents() {
    if (imageLightboxEventsBound) {
        return;
    }

    imageLightboxEventsBound = true;
    document.addEventListener('click', function (event) {
        if (!settings.imageLightbox || event.defaultPrevented) {
            return;
        }

        const target = event.target as any;
        if (!target || !target.matches || !target.matches('.post-entry .post-content img, .post-item .post-content img')) {
            return;
        }

        const source = target.currentSrc || target.src;
        if (!source || target.closest('#lsb-image-lightbox')) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        openImageLightbox(source, target.alt || '帖子图片');
    }, true);

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && imageLightbox && !imageLightbox.hidden) {
            closeImageLightbox();
        }
    });
}

function ensureImageLightbox() {
    if (imageLightbox && document.body && document.body.contains(imageLightbox)) {
        return imageLightbox;
    }
    if (!document.body) {
        return null;
    }

    imageLightbox = document.createElement('div');
    imageLightbox.id = 'lsb-image-lightbox';
    imageLightbox.hidden = true;
    imageLightbox.setAttribute('role', 'dialog');
    imageLightbox.setAttribute('aria-modal', 'true');
    imageLightbox.setAttribute('aria-label', '图片预览');

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'lsb-lightbox-close';
    closeButton.setAttribute('aria-label', '关闭图片预览');
    closeButton.textContent = '×';

    imageLightboxImage = document.createElement('img');
    imageLightboxImage.className = 'lsb-lightbox-image';
    imageLightboxImage.alt = '';

    closeButton.addEventListener('click', closeImageLightbox);
    imageLightbox.addEventListener('click', function (event) {
        if (event.target === imageLightbox) {
            closeImageLightbox();
        }
    });

    imageLightbox.appendChild(closeButton);
    imageLightbox.appendChild(imageLightboxImage);
    document.body.appendChild(imageLightbox);
    return imageLightbox;
}

function openImageLightbox(source: string, altText: string) {
    const overlay = ensureImageLightbox();
    if (!overlay || !imageLightboxImage) {
        return;
    }

    imageLightboxImage.src = source;
    imageLightboxImage.alt = altText || '帖子图片';
    overlay.hidden = false;
    document.body.classList.add('lsb-lightbox-open');
    window.requestAnimationFrame(function () {
        const closeButton = overlay.querySelector('.lsb-lightbox-close');
        if (closeButton) {
            closeButton.focus();
        }
    });
}

function closeImageLightbox() {
    if (!imageLightbox || imageLightbox.hidden) {
        return;
    }

    imageLightbox.hidden = true;
    document.body.classList.remove('lsb-lightbox-open');
    if (imageLightboxImage) {
        imageLightboxImage.removeAttribute('src');
        imageLightboxImage.alt = '';
    }
}
