"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaNumberOfAccessorMethods = void 0;
const MetricCalculator_1 = require("../../Core/MetricCalculator");
class JavaNumberOfAccessorMethods extends MetricCalculator_1.MetricCalculator {
    calculate(node, sourceCode, FECFC, Filename) {
        let allClasses = [];
        let allMethods = [];
        let allFields = [];
        const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);
        if (fileParsedComponents) {
            const classGroups = fileParsedComponents.classes;
            classGroups.forEach((classGroup) => {
                allClasses = allClasses.concat(classGroup.classes);
                allMethods = allMethods.concat(classGroup.methods);
                allFields = allFields.concat(classGroup.fields);
            });
        }
        const NOAM = this.findaccessedmethods(allMethods);
        return NOAM;
    }
    findaccessedmethods(Methods) {
        let NOAM = 0; // Initialize DAC counter
        for (const Method of Methods) {
            if (Method.isAccessor) {
                NOAM++;
            }
        }
        return NOAM; // Return the final count
    }
}
exports.JavaNumberOfAccessorMethods = JavaNumberOfAccessorMethods;
//# sourceMappingURL=JavaNOAM.js.map