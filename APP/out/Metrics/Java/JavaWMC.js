"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaWeightedMethodCount = void 0;
const MetricCalculator_1 = require("../../Core/MetricCalculator");
class JavaWeightedMethodCount extends MetricCalculator_1.MetricCalculator {
    calculate(node, FECFC, Filename) {
        console.log(`[WMC] Starting WMC calculation for ${Filename}`);
        let allClasses = [];
        let allMethods = [];
        let allFields = [];
        const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);
        if (fileParsedComponents) {
            const classGroups = fileParsedComponents.classes;
            console.log(`[WMC] Found ${classGroups.length} class groups in file`);
            classGroups.forEach((classGroup) => {
                console.log(`[WMC] Processing class group with ${classGroup.classes.length} classes and ${classGroup.methods.length} methods`);
                allClasses = allClasses.concat(classGroup.classes);
                allMethods = allMethods.concat(classGroup.methods);
                allFields = allFields.concat(classGroup.fields);
            });
        }
        // Get the class info to check if it's abstract
        const classInfo = allClasses.length > 0 ? allClasses[0] : null;
        console.log(`[WMC] Class is abstract: ${classInfo?.isAbstract}`);
        console.log(`[WMC] Total methods to analyze: ${allMethods.length}`);
        const result = this.calculateWeightedMethodCount(allMethods, classInfo);
        console.log(`[WMC] Final WMC value: ${result}`);
        return result;
    }
    calculateWeightedMethodCount(methods, classInfo) {
        const decisionTypes = new Set([
            "if_statement",
            "for_statement",
            "while_statement",
            "do_statement",
            "switch_statement",
            "case",
            "catch_clause",
            "condition",
            "ternary_expression",
            "logical_expression",
        ]);
        // Get array of abstract method names if we have a class that's abstract
        const abstractMethodNames = [];
        if (classInfo?.isAbstract) {
            // In the Account class, deposit and withdraw are abstract methods
            methods.forEach((method) => {
                // Check common indicators of abstract methods
                if (method.modifiers?.includes("abstract") ||
                    // For abstract methods without bodies
                    (method.methodBody?.length === 0 &&
                        !method.isConstructor &&
                        !method.isAccessor)) {
                    abstractMethodNames.push(method.name);
                    console.log(`[WMC] Identified abstract method: ${method.name}`);
                }
            });
        }
        return methods.reduce((total, method) => {
            console.log(`[WMC] Analyzing method: ${method.name}, isConstructor: ${method.isConstructor}, methodBody: ${method.methodBody ? method.methodBody.length : "null"} elements`);
            // Skip abstract methods based on our identified list
            if (abstractMethodNames.includes(method.name)) {
                console.log(`[WMC] Skipping abstract method ${method.name}`);
                return total;
            }
            let complexity = 1; // Base complexity for any implemented method
            console.log(`[WMC] Base complexity for ${method.name}: ${complexity}`);
            // If the method has a body, analyze it for additional complexity
            if (method.methodBody && method.methodBody.length > 0) {
                console.log(`[WMC] Method ${method.name} has body with statements: ${JSON.stringify(method.methodBody)}`);
                for (const stmt of method.methodBody) {
                    if (decisionTypes.has(stmt)) {
                        complexity++;
                        console.log(`[WMC] Found decision point "${stmt}" in ${method.name}, complexity now: ${complexity}`);
                    }
                }
            }
            console.log(`[WMC] Final complexity for ${method.name}: ${complexity}, running total: ${total + complexity}`);
            return total + complexity;
        }, 0);
    }
}
exports.JavaWeightedMethodCount = JavaWeightedMethodCount;
//# sourceMappingURL=JavaWMC.js.map