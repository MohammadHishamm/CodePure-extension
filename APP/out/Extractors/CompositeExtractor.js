"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeExtractor = void 0;
const ClassExtractor_1 = require("./ClassExtractor");
const MethodExtractor_1 = require("./MethodExtractor");
const FieldExtractor_1 = require("./FieldExtractor");
class CompositeExtractor {
    extractClassGroup(rootNode, fileName) {
        // Extract class declarations
        let classNodes = rootNode.descendantsOfType("class_declaration");
        const interfaceNodes = rootNode.descendantsOfType("interface_declaration");
        // Handle cases where no classes are found
        if (classNodes.length === 0) {
            if (interfaceNodes.length !== 0) {
                classNodes = interfaceNodes;
            }
            else {
                console.warn(`No Class found in file: ${fileName}`);
                return [];
            }
        }
        const classExtractor = new ClassExtractor_1.ClassExtractor();
        const methodExtractor = new MethodExtractor_1.MethodExtractor();
        const fieldExtractor = new FieldExtractor_1.FieldExtractor();
        const allClasses = classExtractor.extractClasses(rootNode);
        const methods = methodExtractor.extractMethods(rootNode, allClasses);
        const fields = fieldExtractor.extractFields(rootNode, methods);
        return [
            {
                fileName: fileName,
                name: allClasses[0].name ?? "Unknown",
                classes: allClasses,
                methods: methods,
                fields: fields,
            },
        ];
    }
}
exports.CompositeExtractor = CompositeExtractor;
//# sourceMappingURL=CompositeExtractor.js.map