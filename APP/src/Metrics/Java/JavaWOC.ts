import { MetricCalculator } from "../../Core/MetricCalculator";
import { FolderExtractComponentsFromCode } from "../../Extractors/FolderExtractComponentsFromCode";
import { ClassInfo } from "../../Interface/ClassInfo";
import { FieldInfo } from "../../Interface/FieldInfo";
import { MethodInfo } from "../../Interface/MethodInfo";

export class JavaWeightOfAClass extends MetricCalculator {
  //TODO FECFC , FileParsedComponents
  calculate(
    node: any,
    FECFC: FolderExtractComponentsFromCode,
    Filename: string
  ): number {
    console.log(`[WOC] Starting calculation for ${Filename}`);

    let allClasses: ClassInfo[] = [];
    let allMethods: MethodInfo[] = [];
    let allFields: FieldInfo[] = [];

    const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);

    if (fileParsedComponents) {
      console.log(`[WOC] Found parsed components for ${Filename}`);
      const classGroups = fileParsedComponents.classes;
      classGroups.forEach((classGroup) => {
        allClasses = allClasses.concat(classGroup.classes);
        allMethods = allMethods.concat(classGroup.methods);
        allFields = allFields.concat(classGroup.fields);
      });

      console.log(
        `[WOC] Extracted ${allClasses.length} classes, ${allMethods.length} methods, ${allFields.length} fields`
      );
    } else {
      console.log(`[WOC] No parsed components found for ${Filename}`);
    }

    const WOC = this.calculateWeight(allMethods, allFields);
    console.log(`[WOC] Final WOC value: ${WOC}`);

    return WOC;
  }

  private calculateWeight(methods: MethodInfo[], fields: FieldInfo[]): number {
    let totalPublicInterface = 0; // All public methods (non-constructor) + public attributes
    let accessorInterface = 0; // Accessor methods + public attributes

    console.log(
      `[WOC] Analyzing ${methods.length} methods and ${fields.length} fields`
    );

    // Process methods
    methods.forEach((method) => {
      if (!method.isConstructor && method.modifiers.includes("public")) {
        totalPublicInterface++;
        console.log(
          `[WOC] Found public non-constructor method: ${method.name}, incrementing totalPublicInterface to ${totalPublicInterface}`
        );

        if (method.isAccessor) {
          accessorInterface++;
          console.log(
            `[WOC] Method ${method.name} is an accessor, incrementing accessorInterface to ${accessorInterface}`
          );
        }
      } else {
        if (method.isConstructor) {
          console.log(`[WOC] Skipping constructor method: ${method.name}`);
        } else if (!method.modifiers.includes("public")) {
          console.log(`[WOC] Skipping non-public method: ${method.name}`);
        }
      }
    });

    // Process fields
    fields.forEach((field) => {
      if (field.modifiers.includes("public") && !field.isEncapsulated) {
        totalPublicInterface++;
        accessorInterface++; // Public fields are counted in both
        console.log(
          `[WOC] Found public non-encapsulated field: ${field.name}, incrementing totalPublicInterface to ${totalPublicInterface} and accessorInterface to ${accessorInterface}`
        );
      } else {
        console.log(
          `[WOC] Skipping field: ${
            field.name
          } - public: ${field.modifiers.includes("public")}, encapsulated: ${
            field.isEncapsulated
          }`
        );
      }
    });

    console.log(
      `[WOC] Final counts - totalPublicInterface: ${totalPublicInterface}, accessorInterface: ${accessorInterface}`
    );

    if (totalPublicInterface === 0) {
      console.log(`[WOC] totalPublicInterface is 0, returning WOC = 0`);
      return 0;
    }

    const result = 1 - accessorInterface / totalPublicInterface;
    console.log(
      `[WOC] Calculation: 1 - (${accessorInterface} / ${totalPublicInterface}) = ${result}`
    );

    return result;
  }
}
