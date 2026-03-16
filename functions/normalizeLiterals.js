module.exports = function normalize({ types: t }) {
    return {
        visitor: {
            NumericLiteral(path) {
                if (path.node.extra && path.node.extra.raw === String(path.node.value)) {
                    return;
                }
                path.node.extra = {
                    raw: String(path.node.value),
                    rawValue: path.node.value
                };
            },

            StringLiteral(path) {
                if (!path.node.extra) {
                    return;
                }
                path.node.extra = {
                    raw: JSON.stringify(path.node.value),
                    rawValue: path.node.value
                };
            },
            
            TemplateLiteral(path) {
                if (path.node.expressions.length !== 0) {
                    return;
                }
                const cooked = path.node.quasis[0].value.cooked;
                path.replaceWith(t.stringLiteral(cooked));
                path.skip();
            }
        }
    };
};