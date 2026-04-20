// ==UserScript==
// @name         B站一键取消所有追番追剧
// @namespace    https://github.com/homura144/bilibili-cleaner
// @version      3.2
// @description  个人空间-追番追剧页面添加一个按钮，从当前页开始自动逐页取消所有追番追剧
// @match        https://space.bilibili.com/*/bangumi*
// @author       Homura
// @license MIT
// @homepageURL  https://github.com/homura144/bilibili-cleaner
// @supportURL   https://github.com/homura144/bilibili-cleaner/issues
// ==/UserScript==

function createCleanerApp(rootWindow) {
    'use strict';

    const windowRef = rootWindow;
    const documentRef = windowRef.document;
    const state = {
        isRunning: false,
        controlButton: null,
        observer: null,
    };

    function sleep(ms) {
        return new Promise((resolve) => windowRef.setTimeout(resolve, ms));
    }

    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function getText(node) {
        return normalizeText(node && (node.innerText || node.textContent));
    }

    function isElement(node) {
        return Boolean(node && node.nodeType === 1);
    }

    function isVisible(node) {
        if (!isElement(node) || node.hidden) {
            return false;
        }
        const style = typeof windowRef.getComputedStyle === 'function'
            ? windowRef.getComputedStyle(node)
            : null;
        if (!style) {
            return true;
        }
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function isDisabled(node) {
        if (!isElement(node)) {
            return true;
        }
        if ('disabled' in node && node.disabled) {
            return true;
        }
        const ariaDisabled = typeof node.getAttribute === 'function'
            ? node.getAttribute('aria-disabled')
            : null;
        if (ariaDisabled === 'true') {
            return true;
        }
        const className = typeof node.className === 'string' ? node.className : '';
        return /\b(disabled|is-disabled|be-pager-next-disabled)\b/i.test(className);
    }

    function waitFor(predicate, options = {}) {
        const timeout = options.timeout || 5000;
        const interval = options.interval || 100;
        const deadline = Date.now() + timeout;

        return new Promise((resolve, reject) => {
            const check = () => {
                let result;
                try {
                    result = predicate();
                } catch (error) {
                    reject(error);
                    return;
                }
                if (result) {
                    resolve(result);
                    return;
                }
                if (Date.now() >= deadline) {
                    reject(new Error('timeout'));
                    return;
                }
                windowRef.setTimeout(check, interval);
            };
            check();
        });
    }

    function createPointerEvent(type, node) {
        const rect = typeof node.getBoundingClientRect === 'function'
            ? node.getBoundingClientRect()
            : { left: 0, top: 0, width: 0, height: 0 };
        const EventCtor = typeof windowRef.PointerEvent === 'function'
            ? windowRef.PointerEvent
            : windowRef.MouseEvent;
        return new EventCtor(type, {
            bubbles: true,
            cancelable: true,
            view: windowRef,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
        });
    }

    function triggerClick(node) {
        if (!isElement(node)) {
            return;
        }
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((eventName) => {
            node.dispatchEvent(createPointerEvent(eventName, node));
        });
    }

    function pokeOpenMenu(node) {
        if (!isElement(node)) {
            return;
        }
        ['pointerenter', 'mouseenter', 'pointermove', 'mousemove', 'mouseover'].forEach((eventName) => {
            node.dispatchEvent(createPointerEvent(eventName, node));
        });
        triggerClick(node);
    }

    function findControlAnchor() {
        return Array.from(documentRef.querySelectorAll('.radio-filter__item'))
            .find((node) => getText(node).includes('看过'));
    }

    function applyButtonStyle(button) {
        const styles = {
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            backgroundColor: '#ff69b4',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            minWidth: '120px',
        };

        Object.entries(styles).forEach(([key, value]) => {
            if (button.style[key] !== value) {
                button.style[key] = value;
            }
        });
    }

    function setButtonState(label, disabled) {
        if (!state.controlButton) {
            return;
        }
        if (state.controlButton.textContent !== label) {
            state.controlButton.textContent = label;
        }
        if (state.controlButton.disabled !== disabled) {
            state.controlButton.disabled = disabled;
        }
        const cursor = disabled ? 'not-allowed' : 'pointer';
        if (state.controlButton.style.cursor !== cursor) {
            state.controlButton.style.cursor = cursor;
        }
        const opacity = disabled ? '0.7' : '1';
        if (state.controlButton.style.opacity !== opacity) {
            state.controlButton.style.opacity = opacity;
        }
    }

    function mountControlButton() {
        const anchor = findControlAnchor();
        if (!anchor || !anchor.parentNode) {
            return null;
        }

        let container = documentRef.getElementById('bangumi-control-btns');
        let created = false;
        if (!container) {
            container = documentRef.createElement('div');
            container.id = 'bangumi-control-btns';
            container.style.display = 'inline-flex';
            container.style.alignItems = 'center';
            container.style.marginLeft = '8px';

            const button = documentRef.createElement('button');
            button.id = 'bangumi-cancel-all-btn';
            button.type = 'button';
            button.addEventListener('click', () => {
                cancelAllFromCurrentPage().catch((error) => {
                    console.error('[BiliBili Cleaner] 批量取消失败:', error);
                });
            });

            applyButtonStyle(button);
            container.appendChild(button);
            anchor.parentNode.insertBefore(container, anchor.nextSibling);
            created = true;
        }

        state.controlButton = container.querySelector('button');
        if (state.controlButton && created) {
            setButtonState(state.isRunning ? '取消中...' : '一键取消所有', state.isRunning);
        }
        return state.controlButton;
    }

    function findCardRoot(node) {
        if (!isElement(node)) {
            return null;
        }
        return node.closest('.bili-bangumi-card, li, .pgc-space-follow-card, .vui_card') || node.parentElement;
    }

    function getCardTitle(node) {
        const card = findCardRoot(node);
        if (!card) {
            return '';
        }
        const titleNode = card.querySelector('.bili-bangumi-card__title, [title]');
        return getText(titleNode) || getText(card);
    }

    function getCardKey(node, index) {
        const card = findCardRoot(node);
        const link = card ? card.querySelector('a[href]') : null;
        return `${getCardTitle(node) || 'unknown'}::${link ? link.href : index}`;
    }

    function findMoreButtons() {
        const seen = new Set();
        return Array.from(documentRef.querySelectorAll('.sic-BDC-more_vertical_fill'))
            .filter((icon) => isElement(icon) && isVisible(icon) && !seen.has(icon) && seen.add(icon));
    }

    function findCancelAction() {
        return Array.from(documentRef.querySelectorAll('.menu-popover__panel-item, [role="menuitem"], button, a'))
            .find((node) => isVisible(node) && /取消追/.test(getText(node)));
    }

    function findConfirmButton() {
        return Array.from(documentRef.querySelectorAll('button, [role="button"], .vui_button'))
            .find((node) => {
                const text = getText(node);
                return isVisible(node) && !isDisabled(node) && /^(确定|确认|继续|是)$/.test(text);
            });
    }

    function findNextPageButton() {
        return Array.from(documentRef.querySelectorAll('.be-pager-next, .vui_pagenation--btn-next, button, a, [role="button"]'))
            .find((node) => isVisible(node) && !isDisabled(node) && /下一页/.test(getText(node)));
    }

    function buildSummaryMessage(stats) {
        return [
            '批量取消完成 ✅',
            `成功: ${stats.success}`,
            `失败: ${stats.failed}`,
            `处理页数: ${stats.pages}`,
        ].join('\n');
    }

    function buildFailureMessage(stats, error) {
        return [
            '批量取消中断 ❌',
            `成功: ${stats.success}`,
            `失败: ${stats.failed}`,
            `处理页数: ${stats.pages}`,
            `原因: ${error.message || error}`,
        ].join('\n');
    }

    function getPageSignature() {
        const activePage = Array.from(documentRef.querySelectorAll('.be-pager-item-active, .is-active, [aria-current="page"]'))
            .map(getText)
            .join('|');
        const titles = Array.from(documentRef.querySelectorAll('.bili-bangumi-card__title'))
            .map(getText)
            .filter(Boolean)
            .join('|');
        const nextPage = findNextPageButton();
        return [activePage, titles, nextPage ? 'next' : 'last'].join('::');
    }

    async function confirmIfNeeded() {
        const confirmButton = await waitFor(() => findConfirmButton(), {
            timeout: 1200,
            interval: 100,
        }).catch(() => null);

        if (confirmButton) {
            triggerClick(confirmButton);
            await sleep(300);
        }
    }

    function dismissTransientUi() {
        documentRef.dispatchEvent(new windowRef.KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
        }));
        if (documentRef.body) {
            triggerClick(documentRef.body);
        }
    }

    async function cancelOne(button) {
        const card = findCardRoot(button);
        const beforeCount = findMoreButtons().length;

        pokeOpenMenu(button);

        const cancelAction = await waitFor(() => findCancelAction(), {
            timeout: 2500,
            interval: 100,
        });
        triggerClick(cancelAction);
        await confirmIfNeeded();

        await waitFor(() => {
            if (card && !card.isConnected) {
                return true;
            }
            if (!button.isConnected) {
                return true;
            }
            return findMoreButtons().length < beforeCount;
        }, {
            timeout: 4000,
            interval: 100,
        });
    }

    async function cancelCurrentPageItems(stats) {
        const skipped = new Set();

        while (true) {
            const buttons = findMoreButtons();
            const nextButton = buttons.find((button, index) => !skipped.has(getCardKey(button, index)));
            if (!nextButton) {
                return;
            }

            const cardKey = getCardKey(nextButton, buttons.indexOf(nextButton));
            try {
                await cancelOne(nextButton);
                stats.success += 1;
            } catch (error) {
                stats.failed += 1;
                skipped.add(cardKey);
                console.warn('[BiliBili Cleaner] 跳过条目:', getCardTitle(nextButton) || cardKey, error);
                dismissTransientUi();
                await sleep(300);
            }
        }
    }

    async function goToNextPage() {
        const nextPageButton = findNextPageButton();
        if (!nextPageButton) {
            return false;
        }

        const previousSignature = getPageSignature();
        triggerClick(nextPageButton);

        const changed = await waitFor(() => getPageSignature() !== previousSignature, {
            timeout: 6000,
            interval: 150,
        }).catch(() => false);

        if (!changed) {
            throw new Error('翻页后页面未刷新');
        }

        await sleep(600);
        return true;
    }

    async function cancelAllFromCurrentPage() {
        if (state.isRunning) {
            return null;
        }

        state.isRunning = true;
        mountControlButton();
        setButtonState('取消中...', true);

        const stats = {
            success: 0,
            failed: 0,
            pages: 0,
        };

        try {
            while (true) {
                stats.pages += 1;
                await cancelCurrentPageItems(stats);

                const hasNextPage = await goToNextPage();
                if (!hasNextPage) {
                    break;
                }
            }

            windowRef.alert(buildSummaryMessage(stats));
            return stats;
        } catch (error) {
            windowRef.alert(buildFailureMessage(stats, error));
            throw error;
        } finally {
            state.isRunning = false;
            setButtonState('一键取消所有', false);
        }
    }

    function observeForReinjection() {
        if (state.observer || !documentRef.body) {
            return;
        }
        state.observer = new windowRef.MutationObserver(() => {
            mountControlButton();
        });
        state.observer.observe(documentRef.body, {
            childList: true,
            subtree: true,
        });
    }

    function init() {
        const start = () => {
            mountControlButton();
            observeForReinjection();
        };

        if (documentRef.readyState === 'loading') {
            documentRef.addEventListener('DOMContentLoaded', () => {
                windowRef.setTimeout(start, 1500);
            }, { once: true });
            return;
        }

        windowRef.setTimeout(start, 1500);
    }

    return {
        buildSummaryMessage,
        cancelAllFromCurrentPage,
        findCancelAction,
        findConfirmButton,
        findMoreButtons,
        findNextPageButton,
        init,
        mountControlButton,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCleanerApp };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    createCleanerApp(window).init();
}
