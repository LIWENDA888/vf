// lib.js
const libData = [
    {
        group: "传统书法",
        items: [
            {
                id: 'lib_classic',
                name: '经典楷体 (Classic)',
                previewChar: '书',
                url: 'fonts/ClassicKai.ttf', // 示例路径
                link: 'https://example.com/download/classic-kai', // 下载链接
                axes: [
                    { tag: 'wght', name: 'Weight', min: 300, max: 700, default: 400 }
                ]
            }
        ]
    },
    {
        group: "现代几何",
        items: [
            {
                id: 'lib_matrix',
                name: '赛博矩阵 (Matrix)',
                previewChar: 'M',
                url: 'fonts/CyberMatrix.ttf', // 示例路径
                link: 'https://example.com/download/matrix', // 下载链接
                axes: [
                    { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 500 },
                    { tag: 'ital', name: 'Italic', min: 0, max: 1, default: 0 }
                ]
            }
        ]
    }
];