module.exports = function removeDebugger({ types: t }) {
    return {
        visitor: {
            StringLiteral(path) {
                if (!path.node.value.includes(";debugger;")) {
                    return;
                }
                const fn = path.getFunctionParent();
                if (!fn) {
                    return;
                }
                let name = null;
                if (t.isFunctionDeclaration(fn.node) && fn.node.id) {
                    name = fn.node.id.name;
                } else if (t.isVariableDeclarator(fn.parent) && t.isIdentifier(fn.parent.id)) {
                    name = fn.parent.id.name;
                }
                if (name) {
                    const prog = fn.findParent(p => p.isProgram());
                    if (prog) {
                        prog.traverse({
                            CallExpression(p) {
                                const c = p.node.callee;
                                if (t.isIdentifier(c, {
                                    name
                                })) {
                                    p.remove();
                                }
                            }
                        });
                    }
                }
                fn.remove();
            }
        }
    };
};