/**
 * Markdown 渲染与 Front Matter 解析封装
 */

const MarkdownParser = {
    /**
     * 解析 Markdown 文件内容
     * @param {string} content 原始 Markdown 字符串
     * @returns {Object} { meta: {title, date, tags, ...}, body: 'html content' }
     */
    parse(content, fileName = '') {
        const result = {
            meta: {
                title: fileName ? fileName.replace('.md', '') : '无标题文章',
                date: '2026-02-10', // 默认日期
                tags: ['生活']
            },
            html: '',
            excerpt: '',
            fileName: fileName
        };

        try {
            // 改进的正则：支持 Front Matter，更加稳健地匹配开头和结尾的 ---
            // 允许开头有空白字符（如 BOM），允许 --- 后有空格
            const frontMatterRegex = /^[\s\n]*---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
            const frontMatterMatch = content.match(frontMatterRegex);

            if (frontMatterMatch) {
                const yamlStr = frontMatterMatch[1];
                const markdownBody = frontMatterMatch[2];

                yamlStr.split('\n').forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const key = line.slice(0, colonIndex).trim();
                        let value = line.slice(colonIndex + 1).trim();
                        
                        // 去掉两端的引号 (如果存在)
                        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }

                        if (value.startsWith('[') && value.endsWith(']')) {
                            value = value.slice(1, -1).split(',').map(item => item.trim());
                        }
                        result.meta[key] = value;
                    }
                });

                // 统一日期字段：如果 meta 中有 published 但没有 date，则将 published 赋值给 date
                if (result.meta.published && (!result.meta.date || result.meta.date === '2026-02-10')) {
                    result.meta.date = result.meta.published;
                }

                result.html = marked.parse(markdownBody);
                result.excerpt = markdownBody.replace(/[#*`\n]/g, ' ').trim().slice(0, 150) + '...';
            } else {
                // 如果没有 Front Matter，直接解析全文
                result.html = marked.parse(content);
                result.excerpt = content.replace(/[#*`\n]/g, ' ').trim().slice(0, 150) + '...';
            }

            return result;
        } catch (error) {
            console.error(`解析 Markdown 内容失败: ${fileName}`, error);
            return null;
        }
    },

    async fetchPost(fileName, directory = 'posts') {
        try {
            const encodedFileName = encodeURIComponent(fileName);
            const apiResponse = await fetch(`/api/posts/${encodedFileName}?dir=${encodeURIComponent(directory)}`);
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                return data;
            }
            const response = await fetch(`${directory}/${encodedFileName}`);
            if (!response.ok) {
                console.error(`无法获取文章: ${directory}/${fileName}, 状态码: ${response.status}`);
                throw new Error(`Post not found: ${directory}/${fileName}`);
            }
            const content = await response.text();
            return this.parse(content, fileName);
        } catch (error) {
            console.error(`解析文章失败: ${directory}/${fileName}`, error);
            return null;
        }
    }
};
