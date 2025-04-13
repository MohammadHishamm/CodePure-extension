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
    findParentClass(node, classes) {
        const className = node.parent?.type === "class_declaration" ? node.parent.text : "";
        return classes.find((classInfo) => classInfo.name === className) ?? null;
    }
    isAccessor(node, methodName) {
        if (!methodName.startsWith("get") &&
            !methodName.startsWith("Get") &&
            !methodName.startsWith("set") &&
            !methodName.startsWith("Set")) {
            return false;
        }
        const modifiers = this.extractMethodModifiers(node);
        if (modifiers.includes("protected") || modifiers.includes("static")) {
            return false;
        }
        const bodyNode = node.childForFieldName("body");
        if (!bodyNode) {
            return false;
        }
        const statements = bodyNode.namedChildren;
        if (statements.length > 3) {
            return false;
        }
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
        if (methodName.startsWith("get") || methodName.startsWith("Get")) {
            return bodyNode.text.includes("return");
        }
        else {
            return bodyNode.text.includes("=");
        }
    }
    getFieldsUsedInMethod(rootNode, MethodName) {
        const fieldsUsed = [];
        const accessNodes = rootNode.descendantsOfType("variable_declarator");
        accessNodes.forEach((accessNode) => {
            const fieldName = accessNode.text;
            if (fieldName &&
                !fieldsUsed.includes(fieldName) &&
                fieldName !== MethodName) {
                const identifierNode = accessNode.children.find((subChild) => subChild.type === "identifier");
                if (identifierNode) {
                    fieldsUsed.push(identifierNode.text); // Add unique field names accessed
                }
            }
        });
        return fieldsUsed;
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