// highlight-init.js — shared highlight.js integration for markdown-it

// markdown-it highlight option: returns highlighted HTML or '' for default escaping
function hljsHighlight(str, lang) {
  if (lang === 'mermaid') return '';
  if (lang && hljs.getLanguage(lang)) {
    try { return hljs.highlight(str, { language: lang }).value; } catch (_) {}
  }
  if (!lang) {
    try { return hljs.highlightAuto(str).value; } catch (_) {}
  }
  return '';
}

// DOM post-processor: wraps <pre> blocks with header (language label + copy button)
function hljsPostProcess(containerEl) {
  const pres = containerEl.querySelectorAll('pre');
  for (const pre of pres) {
    if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) continue;
    const code = pre.querySelector('code');
    if (!code) continue;
    if (code.classList.contains('language-mermaid')) continue;

    // Extract language from class like "language-python" or "hljs language-python"
    let lang = '';
    for (const cls of code.classList) {
      const m = cls.match(/^language-(.+)$/);
      if (m && m[1] !== 'undefined') { lang = m[1]; break; }
    }

    // Build wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    const header = document.createElement('div');
    header.className = 'code-block-header';

    const langSpan = document.createElement('span');
    langSpan.className = 'code-block-lang';
    langSpan.textContent = lang;
    header.appendChild(langSpan);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-block-copy';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(code.textContent).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      });
    });
    header.appendChild(copyBtn);

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  }
}
