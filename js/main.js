/**
 * 首页逻辑
 */

// 文章列表配置 (手动列出文件名)
const POST_FILES = [
    '如何让AI生成的UI界面去除“AI味”.md',
    'lazy.md',
];

// “一些真心话”列表配置
const TRUTH_FILES = [
];


let allPosts = []; // 存储所有加载的文章数据
let allTruths = []; // 存储所有加载的真心话数据

// 防抖函数
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 统计访问量
    fetch('/api/visit', { method: 'POST' }).catch(() => {});

    const postListContainer = document.getElementById('post-list');
    const articlesListContainer = document.getElementById('articles-post-list');
    const wordsListContainer = document.getElementById('words-post-list');
    const themeToggle = document.getElementById('theme-toggle');
    const banner = document.querySelector('.banner');
    const searchInput = document.querySelector('.search-card input');

    // --- Banner 轮播逻辑 ---
    if (banner) {
        let currentImgIndex = Math.floor(Math.random() * BANNER_IMAGES.length);
        banner.style.backgroundImage = `url('${BANNER_IMAGES[currentImgIndex]}')`;
        
        // 优化：按需预加载下一张图片，避免一次性加载所有大图导致页面卡顿
        const preloadImage = (index) => {
            const img = new Image();
            img.src = BANNER_IMAGES[index];
        };

        // 预加载下一张
        preloadImage((currentImgIndex + 1) % BANNER_IMAGES.length);

        setInterval(() => {
            currentImgIndex = (currentImgIndex + 1) % BANNER_IMAGES.length;
            banner.style.backgroundImage = `url('${BANNER_IMAGES[currentImgIndex]}')`;
            // 切换后预加载再下一张
            preloadImage((currentImgIndex + 1) % BANNER_IMAGES.length);
        }, 8000); // 延长切换时间到 8 秒，减少重绘频率
    }

    // --- 加载文章列表 ---
    async function loadPosts(fileList, directory = 'posts') {
        const loadPromises = fileList.map(async (fileName) => {
            const postData = await MarkdownParser.fetchPost(fileName, directory);
            if (postData) {
                return { ...postData, fileName, directory };
            }
            return null;
        });

        const results = await Promise.all(loadPromises);
        return results.filter(p => p !== null);
    }

    async function loadPostsFromApi(directory = 'posts') {
        try {
            const response = await fetch(`/api/posts?dir=${encodeURIComponent(directory)}&lite=1`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    /**
     * 渲染文章列表
     */
    function renderPosts(posts, container) {
        if (!container) return;
        
        container.innerHTML = '';
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>未找到相关内容</p></div>';
            return;
        }

        posts.forEach((post, index) => {
            const { meta, excerpt, fileName, directory } = post;
            const card = document.createElement('div');
            // 使用新的滑入动画
            card.className = 'post-card slide-in-right';
            card.style.animationDelay = `${index * 0.1}s`;
            
            const coverImg = meta.image || getRandomCover();
            const dirParam = directory === 'posts' ? '' : `&dir=${directory}`;

            // 使用 loading="lazy" 优化图片加载
            // 注意：背景图无法直接使用 loading="lazy"，这里改为 img 标签或保持背景图但接受其限制
            // 为了保持现有样式，我们保留背景图，但可以考虑后续优化。
            // 实际上，列表页的图片如果改成 img 标签配合 object-fit: cover 会更有利于 SEO 和 lazy loading。
            // 但为了不大幅破坏样式，这里我们先保持原样，但可以尝试为 banner 图片添加预加载优化（已在 common.js 中有部分体现）
            // 修正：这里是 innerHTML 插入，我们可以尝试用 img 标签替换背景图 div，或者只是不做变动。
            // 既然用户要求流畅度，我们可以把 div background-image 改成 img 标签
            
            card.innerHTML = `
                <div class="post-card-img-wrapper">
                    <img src="${coverImg}" alt="${meta.title}" loading="lazy" class="post-card-img-element">
                </div>
                <div class="post-card-content">
                    <div class="post-card-meta">
                        <span><i class="far fa-calendar-alt"></i> ${meta.date || '未知日期'}</span>
                        <span><i class="fas fa-tags"></i> ${Array.isArray(meta.tags) ? meta.tags.join(', ') : (meta.tags || '无标签')}</span>
                    </div>
                    <h2 class="post-card-title">
                        <a href="#post?file=${encodeURIComponent(fileName)}${dirParam}">${meta.title || '无标题文章'}</a>
                    </h2>
                    <p class="post-card-excerpt">${excerpt}</p>
                    <a href="#post?file=${encodeURIComponent(fileName)}${dirParam}" class="post-card-more">
                        阅读全文 <i class="fas fa-chevron-right"></i>
                    </a>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // 初始加载
    async function init() {
        const apiPosts = await loadPostsFromApi('posts');
        allPosts = apiPosts ? apiPosts : await loadPosts(POST_FILES, 'posts');

        const apiTruths = await loadPostsFromApi('Truth');
        allTruths = apiTruths ? apiTruths : await loadPosts(TRUTH_FILES, 'Truth');
        
        updateStats(allPosts, allTruths);
        
        // 渲染“文章”页面的列表
        const sortedPosts = [...allPosts].sort((a, b) => {
            const dateA = new Date(a.meta.date || a.meta.published || '2026-02-10');
            const dateB = new Date(b.meta.date || b.meta.published || '2026-02-10');
            return dateB - dateA;
        });
        renderPosts(sortedPosts, articlesListContainer);

        // 渲染“一些真心话”页面的列表
        const sortedTruths = [...allTruths].sort((a, b) => {
            const dateA = new Date(a.meta.date || a.meta.published || '2026-02-10');
            const dateB = new Date(b.meta.date || b.meta.published || '2026-02-10');
            return dateB - dateA;
        });
        renderPosts(sortedTruths, wordsListContainer);

        // 首页默认不显示文章，显示搜索提示
        if (postListContainer) {
            postListContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-search" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>请搜索文章...</p>
                </div>
            `;
        }

        // 如果 URL 中有搜索参数，则在首页渲染搜索结果
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query && postListContainer) {
            searchInput.value = query;
            const combined = [...allPosts, ...allTruths];
            const filtered = filterPosts(combined, query);
            renderPosts(filtered, postListContainer);
        }
    }

    // 初始化
    init();

    // 统计数字动画
    function animateValue(obj, start, end, duration) {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerText = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // 更新统计数据
    function updateStats(posts, truths) {
        const postsCount = document.getElementById('count-posts');
        const truthsCount = document.getElementById('count-truths');

        if (postsCount) animateValue(postsCount, 0, posts.length, 1500);
        if (truthsCount) animateValue(truthsCount, 0, truths.length, 1500);
    }

    // 过滤逻辑抽取
    function filterPosts(posts, term) {
        const lowerTerm = term.toLowerCase();
        return posts.filter(post => {
            const title = (post.meta.title || '').toLowerCase();
            const excerpt = (post.excerpt || '').toLowerCase();
            const tags = Array.isArray(post.meta.tags) ? post.meta.tags.join(' ').toLowerCase() : (post.meta.tags || '').toLowerCase();
            const category = (post.meta.category || '').toLowerCase();
            return title.includes(lowerTerm) || excerpt.includes(lowerTerm) || tags.includes(lowerTerm) || category.includes(lowerTerm);
        });
    }

    // 搜索功能
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim();
            const combined = [...allPosts, ...allTruths];
            
            if (!query) {
                // 如果清空搜索，显示搜索提示
                postListContainer.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-search" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>请搜索文章...</p>
                    </div>
                `;
                return;
            }
            
            const filtered = filterPosts(combined, query);
            renderPosts(filtered, postListContainer);
        }, 300)); // 300ms 防抖
    }

    // --- 加载公告 ---
    async function checkAnnouncements() {
        try {
            // 使用 API 获取公告数据
            const response = await fetch('/api/announcements');
            if (!response.ok) return;
            const announcements = await response.json();
            
            if (announcements && announcements.length > 0) {
                const modal = document.getElementById('announcement-modal');
                const listContainer = document.getElementById('announcement-list-display');
                const closeBtn = document.getElementById('close-announcement-btn');
                
                if (modal && listContainer) {
                    listContainer.innerHTML = announcements.map(item => `
                        <div class="announcement-item">
                            <p>${item.content.replace(/\n/g, '<br>')}</p>
                            <span class="announcement-date">${new Date(item.publishAt || item.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                    `).join('');
                    
                    // Show modal
                    modal.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        modal.classList.add('active');
                    });
                    
                    const closeModal = () => {
                        modal.classList.remove('active');
                        setTimeout(() => {
                            modal.classList.add('hidden');
                        }, 300);
                    };
                    
                    closeBtn.addEventListener('click', closeModal);
                    
                    // Close on click outside (overlay)
                    modal.addEventListener('click', (e) => {
                        if (e.target.classList.contains('modal-overlay')) {
                            closeModal();
                        }
                    });
                }
            }
        } catch (e) {
            // console.error('Failed to load announcements', e);
        }
    }
    
    checkAnnouncements();
});
