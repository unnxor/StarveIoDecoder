module.exports = function calculate({ types: t }) {
    const ALLOWED_OPS = new Set([
        "+", "-", "*", "/", "%", "**",
        "|", "&", "^", "<<", ">>", ">>>"
    ]);

    return {
        visitor: {
            BinaryExpression(path) {
                const { node } = path;

                if (!ALLOWED_OPS.has(node.operator)) return;

                const res = path.evaluate();
                if (!res.confident || typeof res.value !== "number") return;

                path.replaceWith(t.numericLiteral(res.value));
            }
        }
    };
};
