const fs = require("fs");
const babel = require("@babel/core");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generator = require("@babel/generator").default;

// simple logger
const log = {
    colors: {
        reset: "\x1b[0m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m"
    },
    time(label, start) {
        console.log(`${this.colors.red}[Time]:${this.colors.green} ${label}: ${Date.now() - start}ms${this.colors.reset}`);
    }
};

const plugins = [
    require("./functions/normalizeLiterals.js"),
    require("./functions/calculate.js"),
    require("./functions/constToVal.js"),
    require("./functions/arrDecompress.js"),
    require("./functions/ifBeautify.js"),
    require("./functions/backConsole.js"),
    require("./functions/removeDebugger.js"),


    require("./functions/stringToProperty.js"),

    /* BETA */
    require("./functions/removeUnused.js"),
];

(async () => {
    const code = fs.readFileSync("./src/input.js", "utf8");
    const ast = babel.parse(code, { sourceType: "script" });

    for (const pluginEntry of plugins) {
        const [pluginFn, options] = Array.isArray(pluginEntry) ? pluginEntry : [pluginEntry, {}];
        const name = pluginFn.name || "UnknownPlugin";
        const start = Date.now();
        const visitor = pluginFn({ types: t }, options).visitor;
        traverse(ast, visitor);
        log.time(`[Plugin Timer] ${name}`, start);
    }

    const output = generator(ast, { comments: false, compact: true }).code;
    fs.writeFileSync("./src/output.js", output, "utf8");
})();
