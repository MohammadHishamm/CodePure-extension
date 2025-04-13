import { MetricCalculator } from "../../Core/MetricCalculator";
import { FolderExtractComponentsFromCode } from "../../Extractors/FolderExtractComponentsFromCode";
import { ClassInfo } from "../../Interface/ClassInfo";
import { MethodInfo } from "../../Interface/MethodInfo";
import { FieldInfo } from "../../Interface/FieldInfo";

export class JavaWeightedMethodCount extends MetricCalculator {
  calculate(
    node: any,
    FECFC: FolderExtractComponentsFromCode,
    Filename: string
  ): number {
    console.log(`[WMC] Starting WMC calculation for ${Filename}`);

    let allClasses: ClassInfo[] = [];
    let allMethods: MethodInfo[] = [];
    let allFields: FieldInfo[] = [];

    const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);

    if (fileParsedComponents) {
      const classGroups = fileParsedComponents.classes;
      console.log(`[WMC] Found ${classGroups.length} class groups in file`);

      classGroups.forEach((classGroup) => {
        console.log(
          `[WMC] Processing class group with ${classGroup.classes.length} classes and ${classGroup.methods.length} methods`
        );
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

  private calculateWeightedMethodCount(
    methods: MethodInfo[],
    classInfo: ClassInfo | null
  ): number {
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
    const abstractMethodNames: string[] = [];
    if (classInfo?.isAbstract) {
      // In the Account class, deposit and withdraw are abstract methods
      methods.forEach((method) => {
        // Check common indicators of abstract methods
        if (
          method.modifiers?.includes("abstract") ||
          // For abstract methods without bodies
          (method.methodBody?.length === 0 &&
            !method.isConstructor &&
            !method.isAccessor)
        ) {
          abstractMethodNames.push(method.name);
          console.log(`[WMC] Identified abstract method: ${method.name}`);
        }
      });
    }

    return methods.reduce((total, method) => {
      console.log(
        `[WMC] Analyzing method: ${method.name}, isConstructor: ${
          method.isConstructor
        }, methodBody: ${
          method.methodBody ? method.methodBody.length : "null"
        } elements`
      );

      // Skip abstract methods based on our identified list
      if (abstractMethodNames.includes(method.name)) {
        console.log(`[WMC] Skipping abstract method ${method.name}`);
        return total;
      }

      let complexity = 1; // Base complexity for any implemented method
      console.log(`[WMC] Base complexity for ${method.name}: ${complexity}`);

      // If the method has a body, analyze it for additional complexity
      if (method.methodBody && method.methodBody.length > 0) {
        console.log(
          `[WMC] Method ${
            method.name
          } has body with statements: ${JSON.stringify(method.methodBody)}`
        );
        for (const stmt of method.methodBody) {
          if (decisionTypes.has(stmt)) {
            complexity++;
            console.log(
              `[WMC] Found decision point "${stmt}" in ${method.name}, complexity now: ${complexity}`
            );
          }
        }
      }

      console.log(
        `[WMC] Final complexity for ${
          method.name
        }: ${complexity}, running total: ${total + complexity}`
      );
      return total + complexity;
    }, 0);
  }
}
