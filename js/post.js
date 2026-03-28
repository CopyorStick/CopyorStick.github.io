/**
 * 文章详情页逻辑
 */

document.addEventListener('DOMContentLoaded', async () => {
    const titleElement = document.getElementById('post-title');
    const dateElement = document.getElementById('post-date');
    const tagsElement = document.getElementById('post-tags');
    const bodyElement = document.getElementById('post-body');
    const themeToggle = document.getElementById('theme-toggle');

    // --- 主题切换 (同步首页逻辑) ---
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
        updateThemeIcon(currentTheme);
        themeToggle.addEventListener('click', () => {
        const targetTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', targetTheme);
        localStorage.setItem('theme', targetTheme);
        updateThemeIcon(targetTheme);
    });
    }

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (icon) icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // --- 加载文章内容 ---
    const urlParams = new URLSearchParams(window.location.search);
    const postFileName = urlParams.get('post');

    if (postFileName) {
        const postData = await MarkdownParser.fetchPost(`${postFileName}.md`);
        
        if (postData) {
            // 更新页面内容
            titleElement.textContent = postData.meta.title || '无标题';
            titleElement.classList.remove('loading-placeholder');
            
            dateElement.innerHTML = `<i class="far fa-calendar-alt"></i> ${postData.meta.date || '未知日期'}`;
            
            const tags = Array.isArray(postData.meta.tags) ? postData.meta.tags.join(', ') : (postData.meta.tags || '无标签');
            tagsElement.innerHTML = `<i class="fas fa-tags"></i> ${tags}`;
            
            bodyElement.innerHTML = postData.html;

            // 代码高亮与复制按钮
            if (window.hljs) {
                bodyElement.querySelectorAll('pre').forEach((pre) => {
                    const code = pre.querySelector('code');
                    if (code) {
                        hljs.highlightElement(code);
                        
                        // 添加复制按钮
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'copy-code-btn';
                        copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                        pre.appendChild(copyBtn);

                        copyBtn.addEventListener('click', () => {
                            navigator.clipboard.writeText(code.innerText).then(() => {
                                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                                setTimeout(() => {
                                    copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                                }, 2000);
                            });
                        });
                    }
                });
            }

            // 更新浏览器标题
            document.title = `${postData.meta.title} | RyuChan's Blog`;
        } else {
            renderError('文章未找到或加载失败。');
        }
    } else {
        renderError('未指定要查看的文章。');
    }

    function renderError(message) {
        titleElement.textContent = 'Oops!';
        bodyElement.innerHTML = `<div class="error-message"><p>${message}</p><a href="index.html">返回首页</a></div>`;
    }

    // --- 回到顶部按钮 ---
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- 移动端菜单逻辑 ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileSidebar = document.querySelector('.mobile-sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (mobileMenuToggle && mobileSidebar && sidebarOverlay) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileSidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            mobileSidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
});
