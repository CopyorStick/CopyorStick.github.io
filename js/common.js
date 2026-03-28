// 全局配置
const BANNER_IMAGES = [
    'images/1.webp',
    'images/2.webp',
    'images/3.webp',
    'images/4.webp',
    'images/5.webp',
    'images/6.webp'
];

// 获取随机封面图
function getRandomCover() {
    const randomIndex = Math.floor(Math.random() * BANNER_IMAGES.length);
    return BANNER_IMAGES[randomIndex];
}

/**
 * 初始化 Banner 轮播
 * @param {HTMLElement} bannerElement - Banner 元素
 */
window.initBannerCarousel = function(bannerElement) {
    if (!bannerElement) return;
    
    // 避免重复初始化
    if (bannerElement.dataset.carouselInitialized) return;
    bannerElement.dataset.carouselInitialized = 'true';

    let currentImgIndex = Math.floor(Math.random() * BANNER_IMAGES.length);
    // 初始设置背景图 (如果已有背景图且不是默认，可能不需要覆盖，但这里统一覆盖)
    bannerElement.style.backgroundImage = `url('${BANNER_IMAGES[currentImgIndex]}')`;
    
    const preloadImage = (index) => {
        const img = new Image();
        img.src = BANNER_IMAGES[index];
    };

    // 预加载下一张
    preloadImage((currentImgIndex + 1) % BANNER_IMAGES.length);

    setInterval(() => {
        currentImgIndex = (currentImgIndex + 1) % BANNER_IMAGES.length;
        bannerElement.style.backgroundImage = `url('${BANNER_IMAGES[currentImgIndex]}')`;
        // 切换后预加载再下一张
        preloadImage((currentImgIndex + 1) % BANNER_IMAGES.length);
    }, 8000);
};

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 基础 UI 元素
    const themeToggle = document.getElementById('theme-toggle');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileSidebar = document.querySelector('.mobile-sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const backToTop = document.getElementById('back-to-top');
    const header = document.querySelector('.header');

    // 0. 导航栏悬浮效果 - 优化为 requestAnimationFrame 以获得丝滑体验
    if (header) {
        console.log('Header element found, initializing scroll listener');
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    
                    if (scrollY > 50) {
                        if (!header.classList.contains('floating')) {
                            header.classList.add('floating');
                        }
                    } else {
                        if (header.classList.contains('floating')) {
                            header.classList.remove('floating');
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true }); // 使用 passive 监听器提升滚动性能
    } else {
        console.error('Header element not found!');
    }

    // 1. 初始化主题
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    // 初始化 meta theme-color (移动端浏览器状态栏颜色)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', currentTheme === 'dark' ? '#1a1625' : '#f0f4f8');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const targetTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', targetTheme);
            localStorage.setItem('theme', targetTheme);
            updateThemeIcon(targetTheme);
            
            // 更新 meta theme-color
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', targetTheme === 'dark' ? '#1a1625' : '#f0f4f8');
            }
        });
    }

    // 2. 移除调色盘逻辑

    // 3. 移动端菜单逻辑
    if (mobileMenuToggle && mobileSidebar && sidebarOverlay) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileSidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            mobileSidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });

        // 移动端点击链接后关闭菜单
        mobileSidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        });
    }

    // 4. 回到顶部逻辑
    if (backToTop) {
        window.addEventListener('scroll', throttle(() => {
            if (window.scrollY > 300) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        }, 200));

        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 5. 初始化其他页面的 Banner 轮播
    const otherBanners = [
        document.querySelector('#articles .banner'),
        document.querySelector('#words .banner'),
        document.querySelector('#about .banner')
    ];
    
    otherBanners.forEach(banner => {
        if (banner) window.initBannerCarousel(banner);
    });

    // 6. 每日一句逻辑
    async function updateDailyQuote() {
        const quoteText = document.getElementById('quote-text');
        const quoteAuthor = document.getElementById('quote-author');
        if (!quoteText) return;

        try {
            const response = await fetch('https://v1.hitokoto.cn/?c=i&c=k');
            const data = await response.json();
            typeWriter(quoteText, data.hitokoto, () => {
                quoteAuthor.innerText = `—— ${data.from_who || data.from || '未知'}`;
                quoteAuthor.style.opacity = '1';
            });
        } catch (error) {
            console.error('获取每日一句失败:', error);
            const defaultText = '温柔地对待世界，世界也会温柔待你。';
            typeWriter(quoteText, defaultText, () => {
                quoteAuthor.innerText = '——  甜甜';
                quoteAuthor.style.opacity = '1';
            });
        }
    }

    function typeWriter(element, text, callback, speed = 80) {
        element.innerHTML = '';
        let i = 0;
        
        function type() {
            if (i < text.length) {
                const char = text.charAt(i);
                const span = document.createElement('span');
                span.innerText = char;
                span.className = 'typing-char';
                element.appendChild(span);
                
                i++;
                // 模拟更自然的打字节奏
                const randomSpeed = speed + (Math.random() * 40 - 20);
                setTimeout(type, randomSpeed);
            } else if (callback) {
                callback();
            }
        }
        type();
    }
    updateDailyQuote();

    // 6. SPA 路由逻辑与进度条
    const progressBar = document.createElement('div');
    progressBar.className = 'top-progress-bar';
    document.body.appendChild(progressBar);

    function showProgressBar() {
        progressBar.style.width = '0%';
        progressBar.style.display = 'block';
        progressBar.style.opacity = '1';
        
        // 模拟进度
        setTimeout(() => {
            progressBar.style.width = '70%';
        }, 50);
    }

    function hideProgressBar() {
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressBar.style.opacity = '0';
            setTimeout(() => {
                progressBar.style.display = 'none';
                progressBar.style.width = '0%';
            }, 300);
        }, 200);
    }

    function handleRoute() {
        const fullHash = window.location.hash || '#home';
        const [hash, queryString] = fullHash.split('?');
        const targetId = hash.substring(1);
        const targetPage = document.getElementById(targetId);

        if (targetPage) {
            showProgressBar();

            // 更新导航激活状态
            updateActiveLinks(hash);
            
            // 执行切换动画
            const currentPage = document.querySelector('.page-view.active');
            if (currentPage && currentPage !== targetPage) {
                currentPage.classList.remove('active');
                currentPage.classList.add('leaving');
                
                // 等待退出动画完成的一部分再显示新页面，创造重叠感
                setTimeout(() => {
                    currentPage.classList.remove('leaving');
                }, 600); // 与 CSS 动画时间匹配
            }
            
            // 确保目标页面没有 leaving 类，防止动画冲突
            targetPage.classList.remove('leaving');
            targetPage.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // 如果是文章详情页，加载内容
            if (targetId === 'post') {
                const params = new URLSearchParams(queryString);
                const fileName = params.get('file');
                const directory = params.get('dir') || 'Page';
                if (fileName) {
                    loadPostDetail(fileName, directory).then(() => {
                        hideProgressBar();
                    });
                } else {
                    hideProgressBar();
                }
            } else {
                // 重启动画
                restartAnimations(targetPage);
                // 非详情页，稍微延迟后关闭进度条
                setTimeout(hideProgressBar, 300);
            }
        }
    }

    function restartAnimations(container) {
        const elements = container.querySelectorAll('.slide-in-right');
        elements.forEach(el => {
            el.classList.remove('slide-in-right');
            void el.offsetWidth; // 触发重绘
            el.classList.add('slide-in-right');
        });
    }

    async function loadPostDetail(fileName, directory = 'Page') {
        const postTitle = document.getElementById('post-title');
        const postDate = document.getElementById('post-date');
        const postCategory = document.getElementById('post-category');
        const postContent = document.getElementById('post-content');
        const postBanner = document.getElementById('post-banner');

        // 状态重置
        postTitle.innerText = '正在加载...';
        postContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const postData = await MarkdownParser.fetchPost(fileName, directory);
            if (postData && postData.html) {
                const { meta, html } = postData;
                postTitle.innerText = meta.title || '无标题文章';
                postDate.innerHTML = `<i class="far fa-calendar-alt"></i> ${meta.date || '未知日期'}`;
                postCategory.innerHTML = `<i class="fas fa-folder"></i> ${meta.category || '随笔'}`;
                postContent.innerHTML = html;

                // 更新 Banner 背景图
                if (meta.image) {
                    postBanner.style.backgroundImage = `url('${meta.image}')`;
                } else {
                    postBanner.style.backgroundImage = `url('${getRandomCover()}')`;
                }

                // 处理代码高亮
                if (window.hljs) {
                    postContent.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                        addCopyButton(block);
                    });
                }

                // 添加图片点击放大功能
                addImgZoom(postContent);

                // 生成目录 (TOC)
                generateTOC(postContent);
            } else {
                postTitle.innerText = '文章加载失败';
                postContent.innerHTML = '<p>抱歉，无法找到该文章的内容。</p>';
            }
        } catch (error) {
            console.error('加载文章详情失败:', error);
            postTitle.innerText = '文章加载失败';
            postContent.innerHTML = '<p>加载过程中出现错误，请稍后再试。</p>';
        }
    }

    function addCopyButton(block) {
        const pre = block.parentElement;
        if (pre.querySelector('.copy-btn')) return;

        const button = document.createElement('button');
        button.className = 'copy-btn';
        button.innerHTML = '<i class="far fa-copy"></i>';
        button.title = '复制代码';

        button.addEventListener('click', () => {
            const code = block.innerText;
            navigator.clipboard.writeText(code).then(() => {
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.classList.add('success');
                setTimeout(() => {
                    button.innerHTML = '<i class="far fa-copy"></i>';
                    button.classList.remove('success');
                }, 2000);
            });
        });

        pre.appendChild(button);
    }

    function addImgZoom(container) {
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => {
                const overlay = document.createElement('div');
                overlay.className = 'img-overlay';
                overlay.innerHTML = `
                    <div class="img-zoom-container">
                        <img src="${img.src}" alt="${img.alt}">
                    </div>
                `;
                document.body.appendChild(overlay);
                setTimeout(() => overlay.classList.add('active'), 10);

                overlay.addEventListener('click', () => {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.remove(), 300);
                });
            });
        });
    }

    function generateTOC(container) {
        // 在生成新目录前，清理可能存在的旧目录，防止 SPA 路由切换时重复出现
        const existingTOC = container.parentElement.querySelector('.post-toc');
        if (existingTOC) {
            existingTOC.remove();
        }

        const headings = container.querySelectorAll('h1, h2, h3');
        if (headings.length < 2) return;

        const tocContainer = document.createElement('div');
        tocContainer.className = 'post-toc animate-slide-up';
        const tocTitle = document.createElement('h4');
        tocTitle.innerText = '目录';
        tocContainer.appendChild(tocTitle);

        const tocList = document.createElement('ul');
        const tocItems = [];

        headings.forEach((heading, index) => {
            const id = `heading-${index}`;
            heading.id = id;
            
            const li = document.createElement('li');
            li.className = `toc-item toc-${heading.tagName.toLowerCase()}`;
            const link = document.createElement('a');
            link.href = `#${id}`;
            link.innerText = heading.innerText;
            li.appendChild(link);
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const offsetTop = heading.getBoundingClientRect().top + window.pageYOffset - 90;
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            });

            tocList.appendChild(li);
            tocItems.push({ heading, li });
        });

        tocContainer.appendChild(tocList);
        
        // 插入到内容之前
        const article = container.parentElement;
        article.insertBefore(tocContainer, container);

        // Scroll Spy 逻辑
        const handleScrollSpy = throttle(() => {
            if (!document.body.contains(tocContainer)) {
                // 自我清理逻辑需谨慎，节流后可能导致清理不及时，但通常问题不大
                // 更好的方式是外部管理，但为了兼容现有结构，保留此处
                return;
            }

            let activeIndex = -1;
            const scrollPos = window.scrollY + 120;

            tocItems.forEach((item, index) => {
                if (scrollPos >= item.heading.offsetTop) {
                    activeIndex = index;
                }
            });

            tocItems.forEach((item, index) => {
                if (index === activeIndex) {
                    item.li.classList.add('active');
                } else {
                    item.li.classList.remove('active');
                }
            });
        }, 150);

        window.addEventListener('scroll', handleScrollSpy);
        handleScrollSpy();
    }

    function updateActiveLinks(hash) {
        document.querySelectorAll('.nav-links a, .mobile-nav-links a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === hash || (hash === '#home' && href === '#')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // 监听 hash 变化
    window.addEventListener('hashchange', handleRoute);
    
    // 初始路由处理
    if (window.location.hash) {
        handleRoute();
    } else {
        // 默认显示主页
        const homePage = document.getElementById('home');
        if (homePage) homePage.classList.add('active');
    }
});

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}
