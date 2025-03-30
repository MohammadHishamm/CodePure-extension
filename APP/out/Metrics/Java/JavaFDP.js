"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaAccessofImportData = void 0;
const MetricCalculator_1 = require("../../Core/MetricCalculator");
class JavaAccessofImportData extends MetricCalculator_1.MetricCalculator {
    calculate(node, FECFC, Filename) {
        console.log("\n[FDP] Starting calculation for file:", Filename);
        let allClasses = [];
        let allMethods = [];
        let allFields = [];
        const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);
        console.log("[FDP] Found file components:", !!fileParsedComponents);
        if (fileParsedComponents) {
            const classGroups = fileParsedComponents.classes;
            classGroups.forEach((classGroup) => {
                allClasses = [...allClasses, ...classGroup.classes];
                allMethods = [...allMethods, ...classGroup.methods];
                allFields = [...allFields, ...classGroup.fields];
            });
            console.log("[FDP] Classes found:", allClasses.map((c) => c.name));
            allClasses.forEach((cls) => {
                console.log("[FDP] Class:", cls.name, "Parent:", cls.parent || "none");
            });
        }
        return this.calculateFDP(node, allClasses, allMethods, allFields, FECFC, Filename);
    }
    calculateFDP(rootNode, currentClasses, methods, fields, FECFC, Filename) {
        const foreignClassesWithFieldAccess = new Set();
        const currentClassName = currentClasses[0]?.name;
        if (!currentClassName) {
            console.log("[FDP] No class found in current file");
            return 0;
        }
        // Primitive types to exclude
        const primitiveTypes = new Set([
            "int",
            "float",
            "double",
            "boolean",
            "char",
            "byte",
            "short",
            "long",
            "void",
            "string",
            "String",
            "Integer",
            "Float",
            "Double",
            "Boolean",
            "Character",
            "Byte",
            "Short",
            "Long",
            "Void",
        ]);
        // Helper: Check if a type is foreign
        const isForeignClass = (type) => {
            const baseType = type.split("<")[0].trim();
            return !primitiveTypes.has(baseType) && baseType !== currentClassName;
        };
        // Map field names to their types (if foreign)
        const fieldTypes = new Map();
        fields.forEach((field) => {
            if (isForeignClass(field.type)) {
                fieldTypes.set(field.name, field.type);
                console.log(`[FDP] Found field of foreign type: ${field.name} (${field.type})`);
            }
        });
        // Process methods to find ONLY field accesses (not method calls)
        methods.forEach((method) => {
            // Track which foreign classes are accessed through fields
            if (method.fieldAccess && method.fieldAccess.length > 0) {
                method.fieldAccess.forEach((fieldAccess) => {
                    // Extract the object part (e.g., 'bank' from 'bank.accountNumber')
                    const objectName = fieldAccess.split(".")[0];
                    // If this object is a field of foreign type
                    if (fieldTypes.has(objectName)) {
                        const foreignType = fieldTypes.get(objectName);
                        foreignClassesWithFieldAccess.add(foreignType);
                        console.log(`[FDP] Found direct field access to foreign class ${foreignType} through ${fieldAccess}`);
                    }
                });
            }
        });
        const foreignClasses = Array.from(foreignClassesWithFieldAccess);
        console.log("\n[FDP] Foreign Classes with Field Access:", foreignClasses);
        console.log("[FDP] Total FDP count:", foreignClasses.length);
        return foreignClassesWithFieldAccess.size;
    }
}
exports.JavaAccessofImportData = JavaAccessofImportData;
//# sourceMappingURL=JavaFDP.js.map