"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaNumberOfAddedServices = void 0;
const MetricCalculator_1 = require("../../Core/MetricCalculator");
class JavaNumberOfAddedServices extends MetricCalculator_1.MetricCalculator {
    calculate(node, FECFC, Filename) {
        let allClasses = [];
        let allMethods = [];
        let allFields = [];
        const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);
        if (fileParsedComponents) {
            const classGroups = fileParsedComponents.classes;
            classGroups.forEach((classGroup) => {
                allClasses = [...allClasses, ...classGroup.classes];
                allMethods = [...allMethods, ...classGroup.methods];
                allFields = [...allFields, ...classGroup.fields];
            });
        }
        return this.findNAS(allClasses, allMethods, FECFC);
    }
    findNAS(classes, methods, FECFC) {
        // Exit early if no classes or no ancestors
        const hasAncestors = classes.length > 0 && classes[0]?.parent;
        if (!hasAncestors) {
            console.log("[NAS] No ancestors found. NAS = 0");
            return 0;
        }
        // Apply filters in sequence, similar to the original code:
        // 1. Get public methods
        let filteredMethods = methods.filter((method) => {
            const isPublic = method.modifiers.includes("public");
            if (!isPublic) {
                console.log(`[NAS] Skipped method (not public): ${method.name}`);
            }
            return isPublic;
        });
        console.log(`[NAS] Public Methods: ${filteredMethods.length}`);
        // 2. Filter out constructors
        filteredMethods = filteredMethods.filter((method) => {
            const isNotConstructor = !method.isConstructor;
            if (!isNotConstructor) {
                console.log(`[NAS] Skipped method (constructor): ${method.name}`);
            }
            return isNotConstructor;
        });
        console.log(`[NAS] Public Non-Constructor Methods: ${filteredMethods.length}`);
        // 3. Filter out overridden methods
        filteredMethods = filteredMethods.filter((method) => {
            const isNotOverridden = !method.isOverridden;
            if (!isNotOverridden) {
                console.log(`[NAS] Skipped method (overridden): ${method.name}`);
            }
            return isNotOverridden;
        });
        console.log(`[NAS] Public Non-Constructor Non-Overridden Methods: ${filteredMethods.length}`);
        // 4. Filter out accessor methods
        filteredMethods = filteredMethods.filter((method) => {
            const isNotAccessor = !method.isAccessor;
            if (!isNotAccessor) {
                console.log(`[NAS] Skipped method (accessor): ${method.name}`);
            }
            return isNotAccessor;
        });
        // The final count after all filters is the NAS
        const NAS = filteredMethods.length;
        console.log(`[NAS] Final NAS: ${NAS}`);
        return NAS;
    }
}
exports.JavaNumberOfAddedServices = JavaNumberOfAddedServices;
//# sourceMappingURL=JavaNAS.js.map