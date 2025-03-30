import Parser from "tree-sitter";

import { MetricCalculator } from "../../Core/MetricCalculator";

import { FolderExtractComponentsFromCode } from "../../Extractors/FolderExtractComponentsFromCode";
import { ClassInfo } from "../../Interface/ClassInfo";
import { FieldInfo } from "../../Interface/FieldInfo";

import { MethodInfo } from "../../Interface/MethodInfo";
interface Reference {
  name: string;
  type: "field" | "method";
}

export class JavaAccessofImportData extends MetricCalculator {
  calculate(
    node: any,
    FECFC: FolderExtractComponentsFromCode,
    Filename: string
  ): number {
    console.log("\n[FDP] Starting calculation for file:", Filename);
    let allClasses: ClassInfo[] = [];
    let allMethods: MethodInfo[] = [];
    let allFields: FieldInfo[] = [];

    const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);
    console.log("[FDP] Found file components:", !!fileParsedComponents);

    if (fileParsedComponents) {
      const classGroups = fileParsedComponents.classes;
      classGroups.forEach((classGroup) => {
        allClasses = [...allClasses, ...classGroup.classes];
        allMethods = [...allMethods, ...classGroup.methods];
        allFields = [...allFields, ...classGroup.fields];
      });

      console.log(
        "[FDP] Classes found:",
        allClasses.map((c) => c.name)
      );
      allClasses.forEach((cls) => {
        console.log("[FDP] Class:", cls.name, "Parent:", cls.parent || "none");
      });
    }

    return this.calculateFDP(
      node,
      allClasses,
      allMethods,
      allFields,
      FECFC,
      Filename
    );
  }

  private calculateFDP(
    rootNode: Parser.SyntaxNode,
    currentClasses: ClassInfo[],
    methods: MethodInfo[],
    fields: FieldInfo[],
    FECFC: FolderExtractComponentsFromCode,
    Filename: string
  ): number {
    const foreignClassesWithFieldAccess = new Set<string>();
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
    const isForeignClass = (type: string): boolean => {
      const baseType = type.split("<")[0].trim();
      return !primitiveTypes.has(baseType) && baseType !== currentClassName;
    };

    // Map field names to their types (if foreign)
    const fieldTypes = new Map<string, string>();

    fields.forEach((field) => {
      if (isForeignClass(field.type)) {
        fieldTypes.set(field.name, field.type);
        console.log(
          `[FDP] Found field of foreign type: ${field.name} (${field.type})`
        );
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
            foreignClassesWithFieldAccess.add(foreignType!);
            console.log(
              `[FDP] Found direct field access to foreign class ${foreignType} through ${fieldAccess}`
            );
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
