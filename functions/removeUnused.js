module.exports = function removeUnused({ types: t }) {
    return {
        visitor: {
            Program(path) {
                path.scope.crawl();
                const dead = [];
                const deadObjectDecls = new Set();
                const deadObjectAssignments = new Set();
                function isSafeLiteral(node) {
                    return t.isLiteral(node) || t.isUnaryExpression(node) && node.operator === "-" && t.isLiteral(node.argument) || t.isArrayExpression(node) || t.isObjectExpression(node);
                }
                function isMathFloorCall(node) {
                    return t.isCallExpression(node) && t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.object, {
                        name: "Math"
                    }) && t.isIdentifier(node.callee.property, {
                        name: "floor"
                    });
                }

                path.traverse({
                    VariableDeclarator(p) {
                        const decl = p.parent;
                        if (!decl || decl.kind === "var") {
                            return;
                        }
                        const id = p.node.id;
                        if (!t.isIdentifier(id)) {
                            return;
                        }
                        const binding = p.scope.getBinding(id.name);
                        if (!binding) {
                            return;
                        }
                        const init = p.node.init;
                        if (t.isNumericLiteral(init) && binding.referencePaths.length === 1 && binding.constantViolations.every(v => t.isAssignmentExpression(v.node) && t.isNumericLiteral(v.node.right))) {
                            const ref = binding.referencePaths[0];
                            const ifParent = ref.findParent(pp => pp.isIfStatement());
                            if (ifParent && t.isBinaryExpression(ifParent.node.test) && (ifParent.node.test.left === ref.node || ifParent.node.test.right === ref.node)) {
                                dead.push(p);
                                return;
                            }
                        }
                        if (binding.referencePaths.length === 0 && binding.constantViolations.every(v => t.isAssignmentExpression(v.node)) && (!init || isSafeLiteral(init) || t.isFunctionExpression(init) || t.isArrowFunctionExpression(init) || t.isIdentifier(init) && (init.name === "undefined" || init.name === "window") || isMathFloorCall(init))) {
                            dead.push(p);
                        }
                    },
                    FunctionDeclaration(p) {
                        const id = p.node.id;
                        if (!id) {
                            return;
                        }
                        const binding = p.scope.getBinding(id.name);
                        if (!binding || binding.referencePaths.length === 0) {
                            dead.push(p);
                        }
                    }
                });

                // const X = {}; X.prop = literal
                path.traverse({
                    VariableDeclarator(p) {
                        const { id, init } = p.node;
                        if (!t.isIdentifier(id)) {
                            return;
                        }
                        if (!t.isObjectExpression(init)) {
                            return;
                        }
                        const binding = p.scope.getBinding(id.name);
                        if (!binding) {
                            return;
                        }
                        const refs = binding.referencePaths;
                        if (refs.length === 0) {
                            return;
                        }
                        const assigns = [];
                        for (const ref of refs) {
                            const mp = ref.parentPath;
                            if (mp.isMemberExpression() && mp.parentPath.isAssignmentExpression() && mp.parentPath.node.left === mp.node && isSafeLiteral(mp.parentPath.node.right)) {
                                assigns.push(mp.parentPath.getStatementParent());
                                continue;
                            }
                            return;
                        }

                        deadObjectDecls.add(p.getStatementParent());
                        assigns.forEach(s => deadObjectAssignments.add(s));
                    }
                });

                // mass clear
                for (const p of dead) {
                    const binding = p.scope.getBinding(p.node.id.name);
                    if (binding) {
                        binding.constantViolations.forEach(v => v.remove());
                    }
                    const parent = p.parentPath;
                    if (!parent || parent.removed) {
                        continue;
                    }
                    if (parent.node.declarations && parent.node.declarations.length === 1) {
                        parent.remove();
                    } else {
                        p.remove();
                    }
                }
                deadObjectAssignments.forEach(p => {
                    if (p && !p.removed) {
                        p.remove();
                    }
                });
                deadObjectDecls.forEach(p => {
                    if (p && !p.removed) {
                        p.remove();
                    }
                });

                // clear expressions
                path.traverse({
                    ExpressionStatement(p) {
                        const expr = p.node.expression;
                        if (!t.isAssignmentExpression(expr)) {
                            return;
                        }
                        const { left, right } = expr;
                        if (t.isMemberExpression(left) && t.isIdentifier(left.object, {
                            name: "window"
                        }) && isSafeLiteral(right)) {
                            p.remove();
                            return;
                        }
                        if (t.isMemberExpression(left) && t.isNumericLiteral(left.object) && isSafeLiteral(right)) {
                            p.remove();
                        }
                    }
                });

                // clear ;
                path.traverse({
                    IfStatement(p) {
                        const block = p.get("consequent");
                        if (block.isBlockStatement() && block.node.body.length === 0) {
                            p.remove();
                        }
                    },
                    EmptyStatement(p) {
                        p.remove();
                    }
                });
            }
        }
    };
};