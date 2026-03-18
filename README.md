# StarveIoClientDeobfuscation
JavaScript deobfuscation and cleanup tool designed to analyze and simplify the Starve.io client code.
This project uses AST (Abstract Syntax Tree) transformations to remove common obfuscation patterns, simplify expressions, and restore readable JavaScript code.
The goal is to make the client easier to analyze for research, debugging, and reverse engineering purposes.

# Features
Expression evaluation  
Constant propagation  
Dead code removal  
Debugger trap removal  
Console restoration  
Encoded string array decoding  
Logical expression normalization  
Literal normalization  
Property access simplification  
The tool helps transform heavily obfuscated code into a more readable form.

# Installation
Install required dependencies:
npm install @babel/core @babel/traverse @babel/types @babel/generator


# Usage
Place the client code inside:
src/input.js
Run the tool:
node main.js
The processed output will be generated in:
src/output.js

# How It Works
The script parses JavaScript code into an AST and runs multiple transformation passes.
Each plugin performs a specific task such as evaluating expressions, removing dead code, or decoding strings.
Execution time of each transformation is displayed in the console.



# Implemented Plugins
normalizeLiterals  
Normalizes numeric and string literal formatting.

calculate  
Evaluates constant expressions and simplifies math operations.

Example:
(3 << 5) + 4
->
100


constToVal  
Replaces constant variables with their actual values.

Example:
const a = 10
console.log(a)
->
console.log(10)


arrDecompress  
Detects encoded string arrays and decodes them automatically.

ifBeautify  
Converts logical expressions into readable if statements and removes unreachable branches.

Example:
a && run()
->
if (a) {
  run()
}


backConsole  
Restores console functionality if it was previously disabled.

removeDebugger  
Detects and removes debugger traps and self-defending functions.

stringToProperty  
Converts bracket notation to dot notation when possible.

Example:
obj["log"]
->
obj.log
removeUnused  
Removes unused variables, functions, and empty statements.

# Transformation Pipeline

Plugins run in the following order:
1. normalizeLiterals  
2. calculate  
3. constToVal  
4. arrDecompress  
5. ifBeautify  
6. backConsole  
7. removeDebugger  
8. stringToProperty  
9. removeUnused  
Each pass simplifies the code and removes unnecessary structures.


# Author
unnxor

# Contact
If you find any bugs, please contact me on Discord with a detailed explanation:
@unnxor