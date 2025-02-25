"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsFactory = void 0;
// ..
const JavaAMW_1 = require("../Metrics/Java/JavaAMW");
const JavaDAC_1 = require("../Metrics/Java/JavaDAC");
const JavaLOCC_1 = require("../Metrics/Java/JavaLOCC");
const JavaNAbsm_1 = require("../Metrics/Java/JavaNAbsm");
const JavaNOA_1 = require("../Metrics/Java/JavaNOA");
const JavaNOAM_1 = require("../Metrics/Java/JavaNOAM");
const JavaNOM_1 = require("../Metrics/Java/JavaNOM");
const JavaNOPA_1 = require("../Metrics/Java/JavaNOPA");
const JavaNProtM_1 = require("../Metrics/Java/JavaNProtM");
const JavaWMC_1 = require("../Metrics/Java/JavaWMC");
const JavaWOC_1 = require("../Metrics/Java/JavaWOC");
const JavaDIT_1 = require("../Metrics/Java/JavaDIT");
const JavaNAS_1 = require("../Metrics/Java/JavaNAS");
const JavaTCC_1 = require("../Metrics/Java/JavaTCC");
const PythonCC_1 = require("../Metrics/Python/PythonCC");
const PythonNOA_1 = require("../Metrics/Python/PythonNOA");
const PythonNOAM_1 = require("../Metrics/Python/PythonNOAM");
const PythonNOM_1 = require("../Metrics/Python/PythonNOM");
const JavaFDP_1 = require("../Metrics/Java/JavaFDP");
const JavaPNAS_1 = require("../Metrics/Java/JavaPNAS");
const JavaCBO_1 = require("../Metrics/Java/JavaCBO");
class MetricsFactory {
    // Public static method to create a metric object based on the language and metric name
    static CreateMetric(metricName, language) {
        switch (language) {
            case "java":
                return MetricsFactory.createJavaMetric(metricName);
            case "python":
                return MetricsFactory.createPythonMetric(metricName);
            default:
                return null;
        }
    }
    // Dynamically create Java metric object
    static createJavaMetric(metricName) {
        switch (metricName) {
            case "LOC":
                return new JavaLOCC_1.JavaLOCMetric();
            case "WMC":
                return new JavaWMC_1.JavaWeightedMethodCount();
            case `WOC`:
                return new JavaWOC_1.JavaWeightOfAClass();
            case `AMW`:
                return new JavaAMW_1.JavaAverageMethodWeight();
            // case `ATFD`:
            //   return new JavaAccessToForeignData();
            case `FDP`:
                return new JavaFDP_1.JavaAccessofImportData();
            //  case `LAA`:
            // return new JavaLocalityofAttributeAccess();
            // case `NrFE`:
            // return new JavaNumberofFeatureEnvyMethods();
            case `CBO`:
                return new JavaCBO_1.JavaCouplingBetweenObjects();
            case `DAC`:
                return new JavaDAC_1.JavaDataAbstractionCoupling();
            case "NOA":
                return new JavaNOA_1.JavaNumberOfAttributes();
            case "NOM":
                return new JavaNOM_1.JavaNumberOfMethods();
            case "NOAM":
                return new JavaNOAM_1.JavaNumberOfAccessorMethods();
            case "NOPA":
                return new JavaNOPA_1.JavaNumberOfPublicAttributes();
            case "NAbsm":
                return new JavaNAbsm_1.JavaNumberOfAbstractClassesM();
            case "NProtM":
                return new JavaNProtM_1.JavaNumberOfProtectedMethods();
            // case "CognitiveComplexity":
            //   return new JavaCognitiveComplexityMetric();
            // case "NDU":
            // return new NDUCalculation();
            case "NAS":
                return new JavaNAS_1.JavaNumberOfAddedServices();
            case "PNAS":
                return new JavaPNAS_1.JavaProportionOfNewAddedServices();
            // case "BUR":
            // return new BURCalculation();
            // case "NOD":
            //   return new NODCalculation();
            // case "NODD":
            //   return new NODDCalculation();
            case "TCC":
                return new JavaTCC_1.TCCCalculation();
            case "DIT":
                return new JavaDIT_1.JavaDepthOfInheritanceTree();
            default:
                return null;
        }
    }
    // Dynamically create Python metric object
    static createPythonMetric(metricName) {
        switch (metricName) {
            case "LOC":
            // return new PythonLOCMetric();
            case "CC":
                return new PythonCC_1.PythonCyclomaticComplexityMetric();
            case "NOA":
                return new PythonNOA_1.PythonNumberofAttributesMetric();
            case "NOM":
                return new PythonNOM_1.PythonNumberOfMethodsMetric();
            case "NOAM":
                return new PythonNOAM_1.PythonNumberOfAccessorMethods();
            default:
                return null;
        }
    }
}
exports.MetricsFactory = MetricsFactory;
//# sourceMappingURL=MetricsFactory.js.map