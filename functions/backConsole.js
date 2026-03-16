module.exports = function backConsole({ types: t }) {
    return {
        visitor: {
            VariableDeclaration(path) {
                const decl = path.node.declarations[0];
                if (!t.isIdentifier(decl.id) || !t.isMemberExpression(decl.init) || !t.isIdentifier(decl.init.object, {
                    name: "window"
                }) || !t.isIdentifier(decl.init.property, {
                    name: "console"
                })) {
                    return;
                }

                const name = decl.id.name;
                const body = path.parentPath.get("body");
                path.remove();
                for (const stmt of body) {
                    if (!stmt.isExpressionStatement()) {
                        continue;
                    }

                    let expr = stmt.get("expression");
                    let valid = true;
                    while (expr.isAssignmentExpression()) {
                        const left = expr.get("left");
                        if (!left.isMemberExpression() || !left.get("object").isIdentifier({
                            name
                        })) {
                            valid = false;
                            break;
                        }

                        expr = expr.get("right");
                    }
                    
                    if (valid && expr.isFunctionExpression()) {
                        stmt.remove();
                    }
                }
            }
        }
    };
};