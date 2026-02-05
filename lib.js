const libData = [
    {
        group: "传统书法",
        items: [
            {
                id: 'lib_classic',
                name: '经典楷体 (Classic)',
                previewChar: '书',
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
                axes: [
                    { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 500 },
                    { tag: 'ital', name: 'Italic', min: 0, max: 1, default: 0 }
                ]
            }
        ]
    }
];