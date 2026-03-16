module.exports = function constToValue({ types: t }) {
    function isImmutable(n) {
        return t.isNumericLiteral(n) || t.isStringLiteral(n) || t.isBooleanLiteral(n) || t.isNullLiteral(n) || t.isUnaryExpression(n) && t.isNumericLiteral(n.argument) || t.isIdentifier(n) && n.name === "undefined";
    }
    // dangerous but seems like its working
    return {
        visitor: {
            Program(path) {
                const map = new Map();
                let changed = true;
                while (changed) {
                    changed = false;
                    path.traverse({
                        VariableDeclarator(p) {
                            const { id, init } = p.node;
                            if (!t.isIdentifier(id) || !init) {
                                return;
                            }

                            const decl = p.parentPath;
                            if (!decl.isVariableDeclaration()) {
                                return;
                            }

                            const binding = p.scope.getBinding(id.name);
                            if (!binding || !binding.constant) {
                                return;
                            }

                            if (map.has(id.name)) {
                                return;
                            }

                            if (isImmutable(init) || t.isIdentifier(init) && init.name === "window") {
                                map.set(id.name, {
                                    value: init,
                                    binding
                                });
                                changed = true;
                                return;
                            }

                            if (t.isIdentifier(init)) {
                                const ref = map.get(init.name);
                                if (ref) {
                                    map.set(id.name, {
                                        value: ref.value,
                                        binding
                                    });
                                    changed = true;
                                }
                            }
                        }
                    });
                }
                if (!map.size) {
                    return;
                }

                path.traverse({
                    Identifier(p) {
                        const info = map.get(p.node.name);
                        if (!info) {
                            return;
                        }
                        if (p.scope.getBinding(p.node.name) !== info.binding) {
                            return;
                        }
                        if (p.parentPath.isVariableDeclarator() && p.key === "id") {
                            return;
                        }
                        if (p.parentPath.isAssignmentExpression() && p.key === "left") {
                            return;
                        }
                        if (p.parentPath.isUpdateExpression()) {
                            return;
                        }
                        if (p.parentPath.isMemberExpression() && p.key === "property" && !p.parent.computed) {
                            return;
                        }
                        
                        p.replaceWith(t.cloneNode(info.value));
                    }
                });
            }
        }
    };
};