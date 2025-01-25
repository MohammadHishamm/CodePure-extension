import Parser from "tree-sitter";

import { MetricCalculator } from "../../Core/MetricCalculator";
import { ClassInfo } from "../../Interface/ClassInfo";
import { MethodInfo } from "../../Interface/MethodInfo";
import { FieldInfo } from "../../Interface/FieldInfo";
import { FileExtractComponentsFromCode } from "../../Extractors/FileExtractComponentsFromCode";

export class JavaAccessToForeignData extends MetricCalculator {
  calculate(node: any): number {
    console.log("[ATFD] Starting calculation");
    console.log("[ATFD] Input node type:", node ? node.type : "null/undefined");

    const extractcomponentsfromcode = new FileExtractComponentsFromCode();

    const Classes = extractcomponentsfromcode.extractClasses(node);
    console.log(
      "[ATFD] Extracted Classes:",
      Classes.map((c) => c.name)
    );

    const methods = extractcomponentsfromcode.extractMethods(node, Classes);
    console.log(
      "[ATFD] Extracted Methods:",
      methods.map((m) => m.name)
    );

    const Fields = extractcomponentsfromcode.extractFields(node, Classes);
    console.log(
      "[ATFD] Extracted Fields:",
      Fields.map((f) => f.name)
    );

    const ATFD = this.calculateAccessToForeignData(
      node,
      Classes,
      methods,
      Fields,
      extractcomponentsfromcode
    );

    console.log("[ATFD] Final Metric Value:", ATFD);
    return ATFD;
  }

  private calculateAccessToForeignData(
    rootNode: Parser.SyntaxNode,
    currentClasses: ClassInfo[],
    methods: MethodInfo[],
    fields: FieldInfo[],
    extractcomponentsfromcode: FileExtractComponentsFromCode
  ): number {
    console.log("[ATFD:calculateAccessToForeignData] Starting method");

    // Filter out constant fields
    const nonConstantFields = fields.filter(
      (field) =>
        !field.modifiers.includes("final") &&
        !field.modifiers.includes("static")
    );
    console.log(
      "[ATFD] Non-constant Fields:",
      nonConstantFields.map((f) => f.name)
    );

    // Track unique foreign classes accessed
    const foreignClassesAccessed = new Set<string>();

    // Check each method for foreign data access
    methods.forEach((method) => {
      console.log(`[ATFD] Processing method: ${method.name}`);

      // Skip constructors and accessors
      if (method.isConstructor || method.isAccessor) {
        console.log(
          `[ATFD] Skipping method ${method.name} - constructor or accessor`
        );
        return;
      }

      // Find the method's node in the syntax tree
      const methodNode = this.findMethodNodeByPosition(rootNode, method);
      if (!methodNode) {
        console.log(`[ATFD] No node found for method ${method.name}`);
        return;
      }

      // Get all fields from current class and its ancestors
      const currentClassFields = this.getClassAndAncestorFields(
        method,
        currentClasses,
        fields
      );
      console.log(
        `[ATFD] Current class fields for ${method.name}:`,
        currentClassFields
      );

      // Extract references within the method
      const references = this.extractReferencesFromMethod(
        methodNode,
        extractcomponentsfromcode
      );
      console.log(`[ATFD] References in method ${method.name}:`, references);

      references.forEach((reference) => {
        // Skip if reference is a local class field
        if (currentClassFields.includes(reference.name)) {
          console.log(
            `[ATFD] Skipping local field reference: ${reference.name}`
          );
          return;
        }

        // Determine the class of the referenced entity
        const referenceClass = this.findReferenceOwnerClass(
          reference,
          currentClasses
        );
        console.log(
          `[ATFD] Reference class for ${reference.name}:`,
          referenceClass?.name
        );

        // Check if the reference is from a different class and not an ancestor
        if (
          referenceClass &&
          !this.isLocalClassAccess(referenceClass, currentClasses)
        ) {
          console.log(`[ATFD] Adding foreign class: ${referenceClass.name}`);
          foreignClassesAccessed.add(referenceClass.name);
        }
      });
    });

    console.log(
      "[ATFD] Foreign Classes Accessed:",
      Array.from(foreignClassesAccessed)
    );
    return foreignClassesAccessed.size;
  }

  private getClassAndAncestorFields(
    method: MethodInfo,
    currentClasses: ClassInfo[],
    allFields: FieldInfo[]
  ): string[] {
    console.log("[getClassAndAncestorFields] Starting method");

    // Find the class containing the method
    const methodClass = currentClasses.find(
      (cls) =>
        method.startPosition.row >= cls.startPosition.row &&
        method.endPosition.row <= cls.endPosition.row
    );
    console.log("[getClassAndAncestorFields] Method Class:", methodClass?.name);

    if (!methodClass) {
      console.log("[getClassAndAncestorFields] No method class found");
      return [];
    }

    // Collect fields from the current class and its ancestors
    const classFields = allFields
      .filter(
        (field) =>
          field.startPosition.row >= methodClass.startPosition.row &&
          field.endPosition.row <= methodClass.endPosition.row
      )
      .map((field) => field.name);
    console.log(
      "[getClassAndAncestorFields] Current Class Fields:",
      classFields
    );

    // If the class has a parent, include its fields too
    if (methodClass.parent) {
      const ancestorFields = allFields
        .filter((field) => {
          const ancestorClass = currentClasses.find(
            (cls) => cls.name === methodClass.parent
          );
          return (
            ancestorClass &&
            field.startPosition.row >= ancestorClass.startPosition.row &&
            field.endPosition.row <= ancestorClass.endPosition.row
          );
        })
        .map((field) => field.name);
      console.log(
        "[getClassAndAncestorFields] Ancestor Fields:",
        ancestorFields
      );

      return [...classFields, ...ancestorFields];
    }

    return classFields;
  }

  private findMethodNodeByPosition(
    rootNode: Parser.SyntaxNode,
    method: MethodInfo
  ): Parser.SyntaxNode | null {
    console.log("[findMethodNodeByPosition] Starting method");
    console.log("[findMethodNodeByPosition] Method:", method.name);

    // Traverse the tree to find the method node matching the MethodInfo positions
    const methodNodes = rootNode.descendantsOfType("method_declaration");
    console.log(
      "[findMethodNodeByPosition] Total method nodes found:",
      methodNodes.length
    );

    for (const node of methodNodes) {
      const methodName = node.childForFieldName("name")?.text;
      const startPos = node.startPosition;
      const endPos = node.endPosition;

      // Match by method name and position
      if (
        methodName === method.name &&
        startPos.row === method.startPosition.row &&
        startPos.column === method.startPosition.column &&
        endPos.row === method.endPosition.row &&
        endPos.column === method.endPosition.column
      ) {
        console.log("[findMethodNodeByPosition] Matching method node found");
        return node;
      }
    }

    console.log("[findMethodNodeByPosition] No matching method node found");
    return null;
  }

  private extractReferencesFromMethod(
    methodNode: Parser.SyntaxNode,
    extractcomponentsfromcode: FileExtractComponentsFromCode
  ): any[] {
    console.log("[extractReferencesFromMethod] Starting method");

    const references: any[] = [];
    const bodyNode = methodNode.childForFieldName("body");

    console.log("[extractReferencesFromMethod] Body node exists:", !!bodyNode);

    if (bodyNode) {
      // Extract identifiers and member access nodes
      const referenceNodes = bodyNode.descendantsOfType([
        "identifier",
        "member_access",
      ]);

      console.log(
        "[extractReferencesFromMethod] Reference nodes found:",
        referenceNodes.length
      );

      referenceNodes.forEach((node) => {
        const reference = {
          name: node.text,
          startPosition: node.startPosition,
          endPosition: node.endPosition,
        };
        references.push(reference);
      });
    }

    console.log(
      "[extractReferencesFromMethod] Total references:",
      references.length
    );
    return references;
  }

  private findReferenceOwnerClass(
    reference: any,
    currentClasses: ClassInfo[]
  ): ClassInfo | null {
    console.log("[findReferenceOwnerClass] Starting method");
    console.log("[findReferenceOwnerClass] Reference:", reference.name);

    // Iterate over classes to find the one that contains the reference
    for (const cls of currentClasses) {
      if (
        reference.startPosition.row >= cls.startPosition.row &&
        reference.endPosition.row <= cls.endPosition.row
      ) {
        console.log("[findReferenceOwnerClass] Owner class found:", cls.name);
        return cls;
      }
    }

    console.log("[findReferenceOwnerClass] No owner class found");
    return null;
  }

  private isLocalClassAccess(
    accessedClass: ClassInfo,
    currentClasses: ClassInfo[]
  ): boolean {
    console.log("[isLocalClassAccess] Starting method");
    console.log("[isLocalClassAccess] Accessed class:", accessedClass.name);

    const isLocal = currentClasses.some(
      (cls) =>
        cls.name === accessedClass.name ||
        (cls.parent && cls.parent === accessedClass.name)
    );

    console.log("[isLocalClassAccess] Is local access:", isLocal);
    return isLocal;
  }
}
