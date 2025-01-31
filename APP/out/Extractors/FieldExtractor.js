"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldExtractor = void 0;
class FieldExtractor {
    // Extract field-related features from the parsed code
    extractFields(rootNode, methods) {
        const fieldNodes = rootNode.descendantsOfType("field_declaration");
        return fieldNodes.map((node) => {
            let modifiers = "public";
            let type = "Unknown";
            let name = "Unnamed";
            let isEncapsulated = false; // By default assume no encapsulation
            // Iterate over the field declaration nodes
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                if (child.type === "modifiers") {
                    modifiers = child.children.length > 0 ? child.children[0].text : "";
                }
                else if (child.type.includes('type')) {
                    type = child.text; // Extract type (e.g., int, String)
                }
                else if (child.type.includes('variable_declarator')) {
                    const identifierNode = child.children.find(subChild => subChild.type === "identifier");
                    if (identifierNode) {
                        name = identifierNode.text; // Extract field name
                    }
                }
            }
            isEncapsulated = this.hasGetterSetter(name, methods);
            return {
                name,
                type,
                modifiers,
                isEncapsulated,
                startPosition: node.startPosition,
                endPosition: node.endPosition,
            };
        });
    }
    hasGetterSetter(fieldName, methods) {
        // Ensure the first letter of the field name is capitalized for matching with the getter/setter patterns
        let capitalizedFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        // Patterns for getter and setter methods (case-insensitive)
        const getterPattern = new RegExp(`get${capitalizedFieldName}`);
        const setterPattern = new RegExp(`set${capitalizedFieldName}`);
        // Arrays to store method names being checked
        const getterMethods = [];
        const setterMethods = [];
        // Iterate through methods to check for matching getter and setter methods
        let hasGetter = false;
        let hasSetter = false;
        methods.forEach((method) => {
            // Check if the method matches the getter pattern
            if (getterPattern.test(method.name)) {
                getterMethods.push(method.name); // Add to getterMethods array if matched
                hasGetter = true;
            }
            // Check if the method matches the setter pattern
            if (setterPattern.test(method.name)) {
                setterMethods.push(method.name); // Add to setterMethods array if matched
                hasSetter = true;
            }
        });
        // Return true if both getter and setter methods are found
        if (hasGetter && hasSetter) {
            return true; // Field is encapsulated
        }
        else {
            return false; // Field is NOT encapsulated
        }
    }
}
exports.FieldExtractor = FieldExtractor;
//# sourceMappingURL=FieldExtractor.js.map