module.exports = function arrDecompress({ types: t }) {
    let XOR_KEY;
    function findXorKey(path) {
        let key = null;
        path.traverse({
            VariableDeclarator(p) {
                if (key !== null) {
                    p.stop();
                    return;
                }

                const init = p.node.init;
                if (!t.isNumericLiteral(init)) {
                    return;
                }

                const name = p.node.id.name;
                const binding = p.scope.getBinding(name);
                if (!binding) {
                    return;
                }

                for (const ref of binding.referencePaths) {
                    const up = ref.parentPath;
                    const mod = up.parentPath;
                    if (t.isUpdateExpression(up.node, {
                        operator: "++",
                        prefix: false
                    }) && t.isBinaryExpression(mod?.node, {
                        operator: "%"
                    }) && t.isNumericLiteral(mod.node.right, {
                        value: 255
                    })) {
                        key = init.value;
                        p.stop();
                    }
                }
            }
        });
        return key;
    }

    function xorDecode(arr) {
        const out = new Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
            out[i] = String.fromCharCode(arr[i] ^ XOR_KEY++ % 255);
        }
        return Buffer.from(out.join(""), "base64").toString("utf8");
    }

    function countUsages(path, name) {
        let count = 0;
        path.traverse({
            Identifier(p) {
                if (p.node.name !== name) {
                    return;
                }
                const par = p.parent;
                if (t.isVariableDeclarator(par) && par.id === p.node || t.isAssignmentExpression(par) && par.left === p.node) {
                    return;
                }
                count++;
            }
        });
        return count;
    }

    return {
        visitor: {
            Program(path) {
                const foundKey = findXorKey(path);
                if (foundKey !== null) {
                    XOR_KEY = foundKey;
                }

                let stringArr = null;
                let encodedArr = null;

                /* find arrays */
                path.traverse({
                    VariableDeclarator(p) {
                        if (stringArr) {
                            return;
                        }

                        const { id, init } = p.node;
                        if (!t.isIdentifier(id) || !t.isArrayExpression(init)) {
                            return;
                        }

                        const vals = [];
                        for (const el of init.elements) {
                            if (t.isStringLiteral(el)) {
                                vals.push(el.value);
                            } else if (t.isTemplateLiteral(el) && el.expressions.length === 0) {
                                vals.push(el.quasis[0].value.cooked);
                            } else {
                                return;
                            }
                        }

                        stringArr = {
                            name: id.name,
                            values: vals
                        };
                    },

                    AssignmentExpression(p) {
                        if (encodedArr) {
                            return;
                        }
                        if (p.node.operator !== "=") {
                            return;
                        }
                        const left = p.node.left;
                        const right = p.node.right;
                        if (!t.isIdentifier(left) || !t.isArrayExpression(right)) {
                            return;
                        }
                        const decoded = [];
                        for (const el of right.elements) {
                            if (!t.isArrayExpression(el)) {
                                return;
                            }
                            const nums = [];
                            for (const n of el.elements) {
                                if (!t.isNumericLiteral(n)) {
                                    return;
                                }
                                nums.push(n.value);
                            }
                            decoded.push(xorDecode(nums));
                        }
                        encodedArr = {
                            name: left.name,
                            decoded
                        };
                    }
                });
                if (!stringArr && !encodedArr) {
                    return;
                }

                /* change call path to real value */
                path.traverse({
                    MemberExpression(p) {
                        if (!p.node.computed) {
                            return;
                        }
                        const obj = p.node.object;
                        const prop = p.node.property;
                        if (!t.isIdentifier(obj) || !t.isNumericLiteral(prop)) {
                            return;
                        }
                        const idx = prop.value;
                        if (stringArr && obj.name === stringArr.name) {
                            const v = stringArr.values[idx];
                            if (v !== undefined) {
                                p.replaceWith(t.stringLiteral(v));
                            }
                        }
                        if (encodedArr && obj.name === encodedArr.name) {
                            const v = encodedArr.decoded[idx];
                            if (v !== undefined) {
                                p.replaceWith(t.stringLiteral(v));
                            }
                        }
                    }
                });

                if (encodedArr) {
                    const count = countUsages(path, encodedArr.name);
                    if (count === 3) {
                        path.traverse({
                            ForStatement(p) {
                                const test = p.node.test;
                                if (t.isBinaryExpression(test, { operator: "<" }) && t.isMemberExpression(test.right) && t.isIdentifier(test.right.object, {
                                    name: encodedArr.name
                                }) && (!test.right.computed && t.isIdentifier(test.right.property, { name: "length" }) || test.right.computed && t.isStringLiteral(test.right.property, {
                                    value: "length"
                                }))) {
                                    p.remove();
                                    p.stop();
                                }
                            }
                        });
                        path.traverse({
                            VariableDeclarator(p) {
                                if (t.isIdentifier(p.node.id, {
                                    name: encodedArr.name
                                })) {
                                    p.remove();
                                }
                            },

                            AssignmentExpression(p) {
                                if (t.isIdentifier(p.node.left, {
                                    name: encodedArr.name
                                })) {
                                    p.remove();
                                }
                            }
                        });
                    }
                }
            }
        }
    };
};