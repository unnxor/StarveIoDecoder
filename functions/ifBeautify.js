module.exports = function logicalToIf({ types: t }) {
    function ok(e) {
        return t.isExpression(e) && !t.isSequenceExpression(e);
    }

    function block(s) {
        if (t.isBlockStatement(s)) {
            return s;
        } else {
            return t.blockStatement([s]);
        }
    }

    return {
        visitor: {
            
            ExpressionStatement(path) {
                const expr = path.node.expression;
                if (t.isLogicalExpression(expr, { operator: "&&" })) {
                    if (!ok(expr.right)) {
                        return;
                    }
                    path.replaceWith(t.ifStatement(expr.left, t.blockStatement([t.expressionStatement(expr.right)])));
                } else if (t.isLogicalExpression(expr, { operator: "||" })) {
                    if (!ok(expr.right)) {
                        return;
                    }
                    path.replaceWith(t.ifStatement(t.unaryExpression("!", expr.left), t.blockStatement([t.expressionStatement(expr.right)])));
                } else if (t.isConditionalExpression(expr)) {
                    if (!ok(expr.consequent) || !ok(expr.alternate)) {
                        return;
                    }
                    path.replaceWith(t.ifStatement(expr.test, t.blockStatement([t.expressionStatement(expr.consequent)]), t.blockStatement([t.expressionStatement(expr.alternate)])));
                }
            },

            IfStatement(path) {
                path.node.consequent = block(path.node.consequent);
                if (path.node.alternate) {
                    path.node.alternate = block(path.node.alternate);
                }

                const test = path.get("test");
                const res = test.evaluate();
                if (!res.confident) {
                    return;
                }

                if (res.value === false) {
                    if (path.node.alternate) {
                        path.replaceWith(path.node.alternate);
                    } else {
                        path.remove();
                    }
                    return;
                }

                if (res.value === true) {
                    const cons = path.node.consequent;
                    if (t.isBlockStatement(cons) && path.parentPath.isBlock()) {
                        path.replaceWithMultiple(cons.body);
                    } else {
                        path.replaceWith(cons);
                    }
                }
            }
        }
    };
};