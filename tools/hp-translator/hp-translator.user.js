// ==UserScript==
// @name         HP-Translator - GitHub Code Review Softener
// @namespace    hp-translator
// @version      1.4
// @description  Adds an HP-Translator button to GitHub PR comment boxes to soften harsh review comments
// @match        https://github.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @stylistic/quotes */
(function () {
    'use strict';

    const API_URL = 'http://localhost:3033/hp-translator';

    function callServer(text) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: API_URL,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ text }),
                onload(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.result) resolve(data.result);
                        else reject(new Error(data.error || 'Unknown error'));
                    } catch (e) {
                        reject(new Error('Invalid response from server'));
                    }
                },
                onerror(err) {
                    reject(
                        new Error("Could not reach the local server.\nMake sure it's running: pnpm run hp-translator")
                    );
                }
            });
        });
    }

    function createButton(textarea) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.hpTranslatorBtn = 'true';
        btn.className = 'prc-Button-ButtonBase-9n-Xk py-1 px-2';
        btn.setAttribute('data-loading', 'false');
        btn.setAttribute('data-no-visuals', 'true');
        btn.setAttribute('data-size', 'medium');
        btn.setAttribute('data-variant', 'default');

        btn.innerHTML =
            '<span data-component="buttonContent" data-align="center" class="prc-Button-ButtonContent-Iohp5">' +
            '<span data-component="text" class="prc-Button-Label-FWkx3">HP-Translator</span>' +
            '</span>';

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const text = textarea.value.trim();
            if (!text) return;

            const label = btn.querySelector('[data-component="text"]');
            label.textContent = 'Translating...';
            btn.disabled = true;

            try {
                const result = await callServer(text);
                const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
                nativeSetter.call(textarea, result);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (err) {
                alert('HP-Translator: ' + err.message);
            }

            label.textContent = 'HP-Translator';
            btn.disabled = false;
        });

        return btn;
    }

    function addButtons() {
        // Modern markdown editors (PR description, main comment box)
        const editors = document.querySelectorAll('[class*="MarkdownEditor-module__container"]');

        editors.forEach((editor) => {
            if (editor.dataset.hpTranslator) return;
            editor.dataset.hpTranslator = 'true';

            const textarea = editor.querySelector('textarea');
            if (!textarea) return;

            const footer = editor.querySelector('[class*="Footer-module__childrenStyling"]');
            if (footer) {
                footer.prepend(createButton(textarea));
            }
        });

        // Inline reply forms (Answer comment boxes)
        const replyButtons = document.querySelectorAll('.review-simple-reply-button');

        replyButtons.forEach((replyBtn) => {
            const form = replyBtn.closest('form');
            if (!form || form.dataset.hpTranslator) return;
            form.dataset.hpTranslator = 'true';

            const textarea = form.querySelector('textarea');
            if (!textarea) return;

            const formActions = form.querySelector('.form-actions .float-right');
            if (formActions) {
                const btn = createButton(textarea);
                btn.classList.add('float-right', 'ml-1');
                formActions.appendChild(btn);
            }
        });

        // Inline comment/reply forms (discussion thread replies)
        const inlineForms = document.querySelectorAll('form.js-inline-comment-form');

        inlineForms.forEach((form) => {
            if (form.dataset.hpTranslator) return;
            form.dataset.hpTranslator = 'true';

            const textarea = form.querySelector('textarea.js-comment-field');
            if (!textarea) return;

            const toolbar = form.querySelector('markdown-toolbar action-bar [data-target="action-bar.itemContainer"]');
            if (toolbar) {
                const wrapper = document.createElement('div');
                wrapper.setAttribute('data-targets', 'action-bar.items');
                wrapper.className = 'ActionBar-item';
                wrapper.style.visibility = 'visible';
                wrapper.appendChild(createButton(textarea));
                toolbar.appendChild(wrapper);
            }
        });
    }

    addButtons();

    let debounceTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(addButtons, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
