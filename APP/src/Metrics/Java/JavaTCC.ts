import { MetricCalculator } from "../../Core/MetricCalculator";
import { FolderExtractComponentsFromCode } from "../../Extractors/FolderExtractComponentsFromCode";
import { ClassInfo } from "../../Interface/ClassInfo";
import { MethodInfo } from "../../Interface/MethodInfo";
import { FieldInfo } from "../../Interface/FieldInfo";

export class TCCCalculation extends MetricCalculator {
  calculate(
    node: any,
    FECFC: FolderExtractComponentsFromCode,
    Filename: string
  ): number {
    console.log(`[TCC] Starting calculation for ${Filename}`);
    let allMethods: MethodInfo[] = [];
    let allFields: FieldInfo[] = [];

    const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);

    if (fileParsedComponents) {
      const classGroups = fileParsedComponents.classes;
      console.log(
        `[TCC] Found ${classGroups.length} class groups in ${Filename}`
      );

      classGroups.forEach((classGroup, index) => {
        console.log(
          `[TCC] Processing class group #${index + 1}: ${
            classGroup.name || "unnamed"
          }`
        );
        console.log(
          `[TCC] Adding ${classGroup.methods.length} methods and ${classGroup.fields.length} fields`
        );
        allMethods = allMethods.concat(classGroup.methods);
        allFields = allFields.concat(classGroup.fields);
      });
    } else {
      console.log(`[TCC] No parsed components found for ${Filename}`);
    }

    console.log(
      `[TCC] Total methods: ${allMethods.length}, Total fields: ${allFields.length}`
    );
    console.log(
      `[TCC] Field names: ${allFields.map((f) => f.name).join(", ")}`
    );

    const TCC = this.calculateTCC(allMethods, allFields);
    console.log(`[TCC] Final TCC value for ${Filename}: ${TCC}`);
    return TCC;
  }

  private calculateTCC(methods: MethodInfo[], fields: FieldInfo[]): number {
    // Filter out constructors, as in the Java implementation
    const relevantMethods = methods.filter((method) => !method.isConstructor);
    console.log(
      `[TCC] Filtered out constructors. Relevant methods: ${relevantMethods.length}`
    );
    console.log(
      `[TCC] Method names: ${relevantMethods.map((m) => m.name).join(", ")}`
    );

    const numMethods = relevantMethods.length;

    // If there are 0 or 1 methods, return that number as the TCC
    if (numMethods <= 1) {
      console.log(
        `[TCC] Not enough methods (${numMethods}). Returning ${numMethods}`
      );
      return numMethods;
    }

    let cohesivePairs = 0;
    console.log(
      `[TCC] Calculating cohesive pairs for ${numMethods} methods...`
    );

    // For each method, find all other methods that share at least one field access
    for (let i = 0; i < relevantMethods.length; i++) {
      const methodA = relevantMethods[i];
      console.log(`[TCC] Analyzing method: ${methodA.name}`);
      console.log(
        `[TCC] Fields used by ${methodA.name}: ${
          methodA.fieldsUsed.join(", ") || "none"
        }`
      );

      // Create a set of methods that access the same fields as methodA
      const methodsAccessingSameFields = new Set<string>();

      // For each field used by methodA
      for (const fieldName of methodA.fieldsUsed) {
        console.log(
          `[TCC] Checking field "${fieldName}" used by ${methodA.name}`
        );

        // Find all methods that use this field (except methodA itself)
        for (const methodB of relevantMethods) {
          if (methodB !== methodA && methodB.fieldsUsed.includes(fieldName)) {
            methodsAccessingSameFields.add(methodB.name);
            console.log(
              `[TCC] Found method ${methodB.name} also using field "${fieldName}"`
            );
          }
        }
      }

      console.log(
        `[TCC] Method ${methodA.name} shares field access with ${
          methodsAccessingSameFields.size
        } other methods: ${Array.from(methodsAccessingSameFields).join(", ")}`
      );
      // Add the number of methods that share fields with methodA
      cohesivePairs += methodsAccessingSameFields.size;
    }

    // Each connected pair is counted twice (once from each method's perspective)
    // So divide by 2 to get the actual number of connected pairs
    console.log(`[TCC] Raw cohesive pairs (before division): ${cohesivePairs}`);
    cohesivePairs = cohesivePairs / 2;
    console.log(
      `[TCC] Actual cohesive pairs (after division by 2): ${cohesivePairs}`
    );

    // Calculate the maximum possible number of method pairs: n*(n-1)/2
    const maxPossiblePairs = (numMethods * (numMethods - 1)) / 2;
    console.log(
      `[TCC] Maximum possible pairs: ${maxPossiblePairs} = (${numMethods} * ${
        numMethods - 1
      }) / 2`
    );

    // Calculate TCC as the ratio of connected pairs to possible pairs
    const tcc = cohesivePairs / maxPossiblePairs;
    console.log(
      `[TCC] Raw TCC: ${tcc} = ${cohesivePairs} / ${maxPossiblePairs}`
    );

    return parseFloat(tcc.toFixed(2));
  }
}
