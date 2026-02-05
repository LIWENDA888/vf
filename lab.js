// lab.js
// 注意：url 需替换为真实路径。如果是本地测试，请确保路径正确。
const labData = [
    {
        group: "黑体实验区",
        items: [
            {
                id: 'lab_zhisans',
                name: '自在致黑',
                previewChar: '自在致黑',
                url: 'fonts/zhisans.ttf', // 示例路径
                axes: [
                    { tag: 'wght', name: 'Weight', min: 100, max: 700, default: 400 },
                    { tag: 'wdth', name: 'Width', min: 75, max: 125, default: 100 }
                ]
            },
            {
                id: 'lab_boundless',
                name: '无界黑体 (Boundless)',
                previewChar: '界',
                url: 'fonts/BoundlessSans.ttf', // 示例路径
                axes: [
                    { tag: 'wght', name: 'Weight', min: 200, max: 800, default: 500 },
                    { tag: 'grad', name: 'Grade', min: -50, max: 50, default: 0 }
                ]
            }
        ]
    },
    {
        group: "宋体与衬线",
        items: [
            {
                id: 'lab_liquid',
                name: '液体明体 (Liquid)',
                previewChar: '水',
                url: 'fonts/LiquidSerif.ttf', // 示例路径
                axes: [
                    { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 300 },
                    { tag: 'opsz', name: 'Optical', min: 8, max: 144, default: 32 },
                    { tag: 'CNTR', name: 'Contrast', min: 0, max: 100, default: 0 }
                ]
            }
        ]
    }
];