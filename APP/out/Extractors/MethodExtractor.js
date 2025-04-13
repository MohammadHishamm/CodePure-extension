"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodExtractor = void 0;
class MethodExtractor {
    // Extract Method Parameters with Types and Annotations
    extractMethodParams(node) {
        const params = [];
        const paramNodes = node.descendantsOfType("formal_parameter");
        paramNodes.forEach((paramNode) => {
            const typeNode = paramNode.childForFieldName("type");
            const type = typeNode ? typeNode.text : "Unknown"; // Extract parameter type
            const nameNode = paramNode.childForFieldName("name");
            const name = nameNode ? nameNode.text : "Unnamed"; // Extract parameter name
            const annotations = this.extractParameterAnnotations(paramNode); // Extract annotations
            params.push(`${annotations.join(", ")} ${type} ${name}`);
        });
        return params;
    }
    extractParameterAnnotations(node) {
        const annotations = [];
        const annotationNodes = node.descendantsOfType("annotation");
        annotationNodes.forEach((annotation) => {
            annotations.push(annotation.text);
        });
        return annotations;
    }
    // Extract Access Modifiers like static, final, synchronized, etc.
    extractMethodModifiers(node) {
        const modifiers = [];
        const methodText = node.text;
        const possibleModifiers = [
            "public",
            "private",
            "protected",
            "static",
            "final",
            "synchronized",
        ];
        possibleModifiers.forEach((mod) => {
            if (methodText.split(/\s+/)[0] === mod) {
                modifiers.push(mod);
            }
        });
        return modifiers;
    }
    extractStatementsRecursively(node, bodyStatements) {
        if (node.type === "if_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "for_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "while_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "do_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "try_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "expression_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "break_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "continue_statement") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "ternary_expression") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "condition" || node.type === "binary_expression") {
            const conditionText = node.text || "";
            const booleanOperators = (conditionText.match(/&&|\|\|/g) || []).length;
            if (booleanOperators > 0) {
                bodyStatements.push("condition");
            }
        }
        else if (node.type === "catch_clause") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "case") {
            bodyStatements.push(node.type);
        }
        else if (node.type === "throw_statement") {
            bodyStatements.push(node.type);
        }
        node.children.forEach((child) => {
            this.extractStatementsRecursively(child, bodyStatements);
        });
    }
    // Detect Field Access in Method Body
    extractFieldAccesses(node) {
        const fieldAccesses = [];
        const bodyNode = node.childForFieldName("body");
        if (bodyNode) {
            bodyNode.descendantsOfType("field_access").forEach((fieldNode) => {
                const objectNode = fieldNode.child(0); // Usually the object before the dot
                const fieldIdentifier = fieldNode.child(2); // Usually the field after the dot
                if (objectNode && fieldIdentifier) {
                    const fieldAccessText = `${objectNode.text}.${fieldIdentifier.text}`;
                    // Exclude System.out or similar print/log calls
                    if (!fieldAccessText.includes("System.out")) {
                        fieldAccesses.push(fieldAccessText);
                    }
                }
            });
        }
        return fieldAccesses;
    }
    // Call this function instead of looping manually
    extractStatements(bodyNode) {
        const bodyStatements = [];
        if (bodyNode) {
            this.extractStatementsRecursively(bodyNode, bodyStatements);
        }
        return bodyStatements;
    }
    // Extract Local Variables Declared Inside the Method
    extractLocalVariables(node) {
        const localVars = [];
        const bodyNode = node.childForFieldName("body");
        if (bodyNode) {
            bodyNode
                .descendantsOfType("variable_declarator")
                .forEach((declarator) => {
                const varName = declarator.childForFieldName("name")?.text ?? "Unnamed";
                // Try to find the type in the parent node (e.g., variable_declaration)
                const parent = declarator.parent;
                const varType = parent?.childForFieldName("type")?.text;
                parent?.child(0)?.text; // Sometimes the type is the first child
                ("Unknown");
                localVars.push(`${varType}`);
            });
        }
        return localVars;
    }
    // Track Method Calls Inside the Method Body
    extractMethodCalls(node) {
        const methodCalls = [];
        const bodyNode = node.childForFieldName("body");
        if (bodyNode) {
            bodyNode.descendantsOfType("method_invocation").forEach((callNode) => {
                const objectNode = callNode.childForFieldName("object");
                const methodNode = callNode.childForFieldName("name");
                if (objectNode && methodNode) {
                    const methodCall = `${objectNode.text}.${methodNode.text}`;
                    // Exclude System.out calls
                    if (!methodCall.includes("System.out")) {
                        methodCalls.push(methodCall);
                    }
                }
                else if (methodNode) {
                    const methodCall = methodNode.text;
                    // Exclude System.out calls for static methods
                    if (!methodCall.includes("System.out")) {
                        methodCalls.push(methodCall); // For static calls without object
                    }
                }
            });
        }
        return methodCalls;
    }
    // Extract Method Information Including All Details
    extractMethods(rootNode, classes) {
        // Collect all method and constructor declarations
        const methodNodes = [
            ...rootNode.descendantsOfType("constructor_declaration"),
            ...rootNode.descendantsOfType("method_declaration"),
        ];
        return methodNodes.map((node) => {
            const modifiers = this.extractMethodModifiers(node);
            const name = this.extractMethodName(node);
            return {
                name,
                modifiers: this.getAccessModifier(modifiers),
                params: this.extractMethodParams(node),
                returnType: this.extractMethodReturnType(node),
                isAbstract: this.isAbstractMethod(node),
                isConstructor: node.type === "constructor_declaration",
                isAccessor: this.isAccessor(node, name),
                isOverridden: this.isOverriddenMethod(node),
                fieldsUsed: this.getFieldsUsedInMethod(node, name),
                annotations: this.extractMethodAnnotations(node),
                throwsClause: this.extractThrowsClause(node),
                methodBody: this.extractStatements(node),
                localVariables: this.extractLocalVariables(node),
                methodCalls: this.extractMethodCalls(node),
                fieldAccess: this.extractFieldAccesses(node),
                parent: this.findParentClass(node, classes),
                startPosition: node.startPosition,
                endPosition: node.endPosition,
            };
        });
    }
    // Helper Methods (to be defined)
    isOverriddenMethod(node) {
        const annotationNodes = node.descendantsOfType("marker_annotation");
        if (annotationNodes.length > 0) {
            return true;
        }
        return false;
    }
    getAccessModifier(modifiers) {
        const accessModifier = modifiers.find((mod) => ["public", "private", "protected"].includes(mod));
        return accessModifier || "public";
    }
    extractMethodName(node) {
        const nameNode = node.childForFieldName("name");
        return nameNode ? nameNode.text : "Unknown";
    }
    extractMethodReturnType(methodNode) {
        // Check if method is void
        const voidTypeNode = methodNode.childForFieldName("void_type");
        if (voidTypeNode) {
            return "void";
        }
        const integralTypeNode = methodNode.descendantsOfType("integral_type")[0];
        if (integralTypeNode) {
            return integralTypeNode.text;
        }
        const typeNode = methodNode.descendantsOfType("type_identifier")[0];
        if (typeNode) {
            return typeNode.text;
        }
        return "No_Type";
    }
    isAbstractMethod(methodNode) {
        const modifierNodes = methodNode.descendantsOfType("modifiers");
        for (const modNode of modifierNodes) {
            if (modNode.text.includes("abstract")) {
                return true;
            }
        }
        return false;
    }
    findParentClass(node, classes) {
        const className = node.parent?.type === "class_declaration" ? node.parent.text : "";
        return classes.find((classInfo) => classInfo.name === className) ?? null;
    }
    isAccessor(node, methodName) {
        // Check if the method name follows accessor naming pattern
        if (!methodName.startsWith("get") &&
            !methodName.startsWith("Get") &&
            !methodName.startsWith("set") &&
            !methodName.startsWith("Set")) {
            return false;
        }
        // Check method modifiers
        const modifiers = this.extractMethodModifiers(node);
        if (modifiers.includes("protected") || modifiers.includes("static")) {
            return false;
        }
        const bodyNode = node.childForFieldName("body");
        if (!bodyNode) {
            return false;
        }
        const statements = bodyNode.namedChildren;
        // More strict check for statement count (only 1 for getters)
        if ((methodName.startsWith("get") || methodName.startsWith("Get")) &&
            statements.length > 1) {
            return false;
        }
        else if (statements.length > 3) {
            return false;
        }
        // Check for control structures
        const controlStructures = bodyNode.descendantsOfType([
            "if_statement",
            "for_statement",
            "while_statement",
            "try_statement",
            "switch_statement",
        ]);
        if (controlStructures.length > 0) {
            return false;
        }
        // Check for new object creation in getters
        if (methodName.startsWith("get") || methodName.startsWith("Get")) {
            // If a getter contains "new" keyword or has variable declarations, it's not a pure accessor
            if (bodyNode.text.includes("new ") ||
                this.hasLocalVariableDeclarations(bodyNode)) {
                return false;
            }
            // Simple getter should only contain a return statement with the field
            return (bodyNode.text.includes("return") &&
                !bodyNode.text.includes("return new"));
        }
        else {
            // For setters
            return bodyNode.text.includes("=");
        }
    }
    // Helper method to check for local variable declarations
    hasLocalVariableDeclarations(bodyNode) {
        const localVariableDeclarations = bodyNode.descendantsOfType([
            "local_variable_declaration",
            "variable_declaration",
        ]);
        return localVariableDeclarations.length > 0;
    }
    getFieldsUsedInMethod(rootNode, methodName) {
        const fieldsUsed = new Set();
        // First, collect declared variables in this method (to avoid confusion with fields)
        const declaredLocalVars = new Set();
        rootNode.descendantsOfType("variable_declarator").forEach((varNode) => {
            const identifierNode = varNode.childForFieldName("name");
            if (identifierNode) {
                declaredLocalVars.add(identifierNode.text);
            }
        });
        // Traverse all identifiers in the method body
        const bodyNode = rootNode.childForFieldName("body");
        if (bodyNode) {
            bodyNode.descendantsOfType("identifier").forEach((idNode) => {
                const name = idNode.text;
                // If it's not a local variable AND not the method name itself
                if (!declaredLocalVars.has(name) && name !== methodName) {
                    fieldsUsed.add(name);
                }
            });
        }
        return Array.from(fieldsUsed);
    }
    extractMethodAnnotations(node) {
        const annotations = [];
        const annotationNodes = node.descendantsOfType("marker_annotation");
        annotationNodes.forEach((annotation) => {
            annotations.push(annotation.text);
        });
        return annotations;
    }
    extractThrowsClause(node) {
        const throwsNodes = node.descendantsOfType("throw_statement");
        return throwsNodes.map((throwNode) => throwNode.text);
    }
}
exports.MethodExtractor = MethodExtractor;
//# sourceMappingURL=MethodExtractor.js.map