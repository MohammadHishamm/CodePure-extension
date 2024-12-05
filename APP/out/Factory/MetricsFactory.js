"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsFactory = void 0;
const JavaWMC_1 = require("../Metrics/Java/JavaWMC");
const JavaCoC_1 = require("../Metrics/Java/JavaCoC");
const JavaLOCC_1 = require("../Metrics/Java/JavaLOCC");
const JavaNAbsm_1 = require("../Metrics/Java/JavaNAbsm");
const JavaNOA_1 = require("../Metrics/Java/JavaNOA");
const JavaNOAM_1 = require("../Metrics/Java/JavaNOAM");
const JavaNOM_1 = require("../Metrics/Java/JavaNOM");
const JavaNOPA_1 = require("../Metrics/Java/JavaNOPA");
const JavaNProtM_1 = require("../Metrics/Java/JavaNProtM");
const JavaWOC_1 = require("../Metrics/Java/JavaWOC");
const JavaAMW_1 = require("../Metrics/Java/JavaAMW");
const JavaNDU_1 = require("../Metrics/Java/JavaNDU");
const JavaAFTD_1 = require("../Metrics/Java/JavaAFTD ");
const ECFCode_1 = require("../Core/ECFCode");
//import {JavaDataAbstractionCoupling }  from '../Metrics/Java/JavaDAC';
const JavaTCC_1 = require("../Metrics/Java/JavaTCC");
// import { ExtractComponentsFromCode } from '../Metrics/Java/JavaWOC';
const PythonCC_1 = require("../Metrics/Python/PythonCC");
const PythonLOC_1 = require("../Metrics/Python/PythonLOC");
const PythonNOA_1 = require("../Metrics/Python/PythonNOA");
const PythonNOAM_1 = require("../Metrics/Python/PythonNOAM");
const PythonNOM_1 = require("../Metrics/Python/PythonNOM");
class MetricsFactory {
    // Public static method to create a metric object based on the language and metric name
    static CreateMetric(metricName, language) {
        switch (language) {
            case 'java':
                return MetricsFactory.createJavaMetric(metricName);
            case 'python':
                return MetricsFactory.createPythonMetric(metricName);
            default:
                return null;
        }
    }
    // Dynamically create Java metric object
    static createJavaMetric(metricName) {
        switch (metricName) {
            case 'LOC':
                return new JavaLOCC_1.JavaLOCMetric();
            case 'WMC':
                return new JavaWMC_1.JavaWeightedMethodCount();
            case `WOC`:
                return new JavaWOC_1.JavaWeightOfAClass();
            case `AMW`:
                return new JavaAMW_1.JavaAverageMethodWeight();
            case `AFTD`:
                return new JavaAFTD_1.JavaAccessToForeignData();
            // case `DAC`:
            //     return new JavaDataAbstractionCoupling();
            case 'NOA':
                return new JavaNOA_1.JavaNumberOfAttributesMetric();
            case 'NOM':
                return new JavaNOM_1.JavaNumberOfMethodsMetric();
            case 'NOAM':
                return new JavaNOAM_1.JavaNumberOfAccessorMethods();
            case 'NOPA':
                return new JavaNOPA_1.JavaNumberOfPublicAttributesM();
            case 'NAbsm':
                return new JavaNAbsm_1.JavaNumberOfAbstractClassesM();
            case 'NProtM':
                return new JavaNProtM_1.JavaNumberOfProtectedMethodsMetric();
            case 'CognitiveComplexity':
                return new JavaCoC_1.JavaCognitiveComplexityMetric();
            case 'NDU':
                return new JavaNDU_1.NDUCalculation();
            case 'TCC':
                return new JavaTCC_1.TCCCalculation();
            case 'FANOUT':
            case 'FANOUT':
                const javaCode = `

public class Dog extends Animal {
    // Overriding the makeSound method from Animal class
    @Override
    public void makeSound() {
        System.out.println("Dog barks");
    }
}

            

`;
                const parser = new ECFCode_1.ExtractComponentsFromCode(); // Create an instance of CodeParser
                const tree = parser.parseCode(javaCode); // Parse the Java code into a syntax tree
                const components = parser.extractComponents(tree); // Extract classes, methods, and fields
                console.log('Classes:', components.classes);
                console.log('Methods:', components.methods);
                console.log('Fields:', components.fields);
            // console.log('WOC:', components.weight);
            // console.log('Fields:', components.weight);
            default:
                return null;
        }
    }
    // Dynamically create Python metric object
    static createPythonMetric(metricName) {
        switch (metricName) {
            case 'LOC':
                return new PythonLOC_1.PythonLOCMetric();
            case 'CC':
                return new PythonCC_1.PythonCyclomaticComplexityMetric();
            case 'NOA':
                return new PythonNOA_1.PythonNumberofAttributesMetric();
            case 'NOM':
                return new PythonNOM_1.PythonNumberOfMethodsMetric();
            case 'NOAM':
                return new PythonNOAM_1.PythonNumberOfAccessorMethods();
            default:
                return null;
        }
    }
}
exports.MetricsFactory = MetricsFactory;
//# sourceMappingURL=MetricsFactory.js.map