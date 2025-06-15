import { MetricCalculator } from "../Core/MetricCalculator";

// ..
import { JavaAverageMethodWeight } from "../Metrics/Java/JavaAMW";

import { JavaCognitiveComplexityMetric } from "../Metrics/Java/JavaCoC";
import { JavaDataAbstractionCoupling } from "../Metrics/Java/JavaDAC";
import { JavaLOCMetric } from "../Metrics/Java/JavaLOCC";
import { JavaNumberOfAbstractClassesM } from "../Metrics/Java/JavaNAbsm";

import { JavaNumberOfAttributes } from "../Metrics/Java/JavaNOA";
import { JavaNumberOfAccessorMethods } from "../Metrics/Java/JavaNOAM";
import { JavaNumberOfMethods } from "../Metrics/Java/JavaNOM";
import { JavaNumberOfPublicAttributes } from "../Metrics/Java/JavaNOPA";
import { JavaNumberOfProtectedMethods } from "../Metrics/Java/JavaNProtM";
import { JavaWeightedMethodCount } from "../Metrics/Java/JavaWMC";
import { JavaWeightOfAClass } from "../Metrics/Java/JavaWOC";
import { JavaDepthOfInheritanceTree } from "../Metrics/Java/JavaDIT";
import { JavaNumberOfAddedServices } from "../Metrics/Java/JavaNAS";
import { TCCCalculation } from "../Metrics/Java/JavaTCC";


import { JavaAccessofImportData } from "../Metrics/Java/JavaFDP";
import { JavaProportionOfNewAddedServices } from "../Metrics/Java/JavaPNAS";
import { JavaAccessToForeignData } from "../Metrics/Java/JavaATFD ";
import { JavaCouplingBetweenObjects } from "../Metrics/Java/JavaCBO";

export class MetricsFactory {
  // Public static method to create a metric object based on the language and metric name
  public static CreateMetric(
    metricName: string,
    language: string
  ): MetricCalculator | null {
    switch (language) {
      case "java":
        return MetricsFactory.createJavaMetric(metricName);
      case "python":
      default:
        return null;
    }
  }

  // Dynamically create Java metric object
  private static createJavaMetric(metricName: string): MetricCalculator | null {
    switch (metricName) {
      case "LOC":
        return new JavaLOCMetric();
      case "WMC":
        return new JavaWeightedMethodCount();
      case `WOC`:
        return new JavaWeightOfAClass();
      case `AMW`:
        return new JavaAverageMethodWeight();
      // case `ATFD`:
      //   return new JavaAccessToForeignData();
      case `FDP`:
        return new JavaAccessofImportData();
      //  case `LAA`:
      // return new JavaLocalityofAttributeAccess();
      // case `NrFE`:
      // return new JavaNumberofFeatureEnvyMethods();
      case `CBO`:
        return new JavaCouplingBetweenObjects();
      case `DAC`:
        return new JavaDataAbstractionCoupling();
      case "NOA":
        return new JavaNumberOfAttributes();
      case "NOM":
        return new JavaNumberOfMethods();
      case "NOAM":
        return new JavaNumberOfAccessorMethods();
      case "NOPA":
        return new JavaNumberOfPublicAttributes();
      case "NAbsm":
        return new JavaNumberOfAbstractClassesM();
      case "NProtM":
        return new JavaNumberOfProtectedMethods();
      // case "CognitiveComplexity":
      //   return new JavaCognitiveComplexityMetric();
      // case "NDU":
      // return new NDUCalculation();
      case "NAS":
        return new JavaNumberOfAddedServices();
      case "PNAS":
        return new JavaProportionOfNewAddedServices();
      // case "BUR":
      // return new BURCalculation();
      // case "NOD":
      //   return new NODCalculation();
      // case "NODD":
      //   return new NODDCalculation();
      case "TCC":
        return new TCCCalculation();
      case "DIT":
        return new JavaDepthOfInheritanceTree();
      default:
        return null;
    }
  }
}
