module.exports = function stringToProperty({ types: t }) {
    return {
        visitor: {
            MemberExpression(path) {
                if (path.node.computed && t.isStringLiteral(path.node.property)) {
                    path.node.computed = false;
                    path.node.property = t.identifier(path.node.property.value);
                }
            }
        }
    };
};