const labData = [
    {
        group: "黑体实验区",
        items: [
            {
                id: 'lab_force',
                name: '自在原力 (Force)',
                previewChar: '气',
                axes: [
                    { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400 },
                    { tag: 'wdth', name: 'Width', min: 80, max: 120, default: 100 },
                    { tag: 'slnt', name: 'Slant', min: -15, max: 0, default: 0 }
                ]
            },
            {
                id: 'lab_boundless',
                name: '无界黑体 (Boundless)',
                previewChar: '界',
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
                axes: [
                    { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 300 },
                    { tag: 'opsz', name: 'Optical', min: 8, max: 144, default: 32 },
                    { tag: 'CNTR', name: 'Contrast', min: 0, max: 100, default: 0 }
                ]
            }
        ]
    }
];