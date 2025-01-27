import Parser from "tree-sitter";

import { MetricCalculator } from "../../Core/MetricCalculator";
import { ExtractComponentsFromCode } from "../../Extractors/ExtractComponentsFromCode";
import { FolderExtractComponentsFromCode } from "../../Extractors/FolderExtractComponentsFromCode";
import { ClassInfo } from "../../Interface/ClassInfo";
import { FieldInfo } from "../../Interface/FieldInfo";
import { FileParsedComponents } from "../../Interface/FileParsedComponents";
import { MethodInfo } from "../../Interface/MethodInfo";
interface Reference {
  name: string;
  type: "field" | "method";
}

export class JavaAccessToForeignData extends MetricCalculator {
  calculate(
    node: any,
    sourceCode: string,
    FECFC: FolderExtractComponentsFromCode
  ): number {
    const extractcomponentsfromcode = new ExtractComponentsFromCode();

    const Classes = extractcomponentsfromcode.extractClasses(node);
    const methods = extractcomponentsfromcode.extractMethods(node, Classes);

    const Fields = extractcomponentsfromcode.extractFields(node, Classes);

    const ATFD = this.calculateAccessToForeignData(
      node,
      Classes,
      methods,
      Fields,
      FECFC
    );

    console.log("[ATFD] Final Metric Value:", ATFD);
    return ATFD;
  }

  private calculateAccessToForeignData(
    rootNode: Parser.SyntaxNode,
    currentClasses: ClassInfo[],
    methods: MethodInfo[],
    fields: FieldInfo[],
    FECFC: FolderExtractComponentsFromCode
  ): number {
    // Filter out constant fields (including static final variables)
    const nonConstantFields = fields.filter(
      (field) =>
        !field.modifiers.includes("final") &&
        !field.modifiers.includes("static")
    );

    // Track unique foreign field and method references
    const foreignReferences = new Set<string>();

    // Check each method for foreign data access
    methods.forEach((method) => {
      // Skip constructors and accessors
      if (method.isConstructor || method.isAccessor) {
        return; // Skip this method if it is a constructor or accessor
      }

      // Find the method's node in the syntax tree
      const methodNode = this.findMethodNodeByPosition(rootNode, method);
      if (!methodNode) {
        return;
      }

      // Get all fields from the current class and its ancestors
      const currentClassFields = this.getClassAndAncestorFields(
        method,
        currentClasses,
        fields
      );

      // Extract references within the method
      const references = this.extractReferencesFromMethod(methodNode, FECFC);

      references.forEach((reference) => {
        // Skip if reference is a local class field
        if (currentClassFields.includes(reference.name)) {
          return;
        }

        // Determine the class of the referenced entity
        const referenceClass = this.findReferenceOwnerClass(
          reference,
          currentClasses
        );

        // Check if the reference is a method or field and if it's from a different class
        if (
          referenceClass &&
          !this.isLocalClassAccess(referenceClass, currentClasses)
        ) {
          if (reference.type === "method") {
            // Additional check for isAccessor
            const referencedMethod = methods.find(
              (m) => m.name === reference.name
            );

            foreignReferences.add(`method:${reference.name}`);
          } else {
            foreignReferences.add(`field:${reference.name}`);
          }
        }
      });
    });

    console.log(
      "[ATFD] Foreign References Accessed:",
      Array.from(foreignReferences)
    );
    return foreignReferences.size;
  }

  private findMethodNodeByPosition(
    rootNode: Parser.SyntaxNode,
    method: MethodInfo
  ): Parser.SyntaxNode | null {
    const findMethodNode = (
      node: Parser.SyntaxNode
    ): Parser.SyntaxNode | null => {
      // Check if the node is a method declaration and matches the position
      if (
        node.type === "method_declaration" &&
        this.isNodePositionMatch(node, method.startPosition, method.endPosition)
      ) {
        return node;
      }

      // Recursively search child nodes
      for (let child of node.children) {
        const foundNode = findMethodNode(child);
        if (foundNode) {
          return foundNode;
        }
      }

      return null;
    };

    return findMethodNode(rootNode);
  }

  /**
   * Check if a node's position matches the given method positions
   */
  private isNodePositionMatch(
    node: Parser.SyntaxNode,
    startPos: Parser.Point,
    endPos: Parser.Point
  ): boolean {
    const nodeStart = node.startPosition;
    const nodeEnd = node.endPosition;

    return (
      nodeStart.row === startPos.row &&
      nodeStart.column === startPos.column &&
      nodeEnd.row === endPos.row &&
      nodeEnd.column === endPos.column
    );
  }

  /**
   * Get fields from the current class and its ancestors
   */
  private getClassAndAncestorFields(
    method: MethodInfo,
    classes: ClassInfo[],
    fields: FieldInfo[]
  ): string[] {
    // Find the class containing the method
    const containingClass = classes.find(
      (cls) =>
        method.startPosition.row >= cls.startPosition.row &&
        method.endPosition.row <= cls.endPosition.row
    );

    if (!containingClass) {
      return [];
    }

    // Collect fields from the current class and its ancestors
    const classFields = fields
      .filter(
        (field) =>
          field.startPosition.row >= containingClass.startPosition.row &&
          field.startPosition.row <= containingClass.endPosition.row
      )
      .map((field) => field.name);

    // If the class has a parent, also include fields from parent classes
    if (containingClass.parent) {
      const parentClass = classes.find(
        (cls) => cls.name === containingClass.parent
      );
      if (parentClass) {
        const parentFields = fields
          .filter(
            (field) =>
              field.startPosition.row >= parentClass.startPosition.row &&
              field.startPosition.row <= parentClass.endPosition.row
          )
          .map((field) => field.name);

        return [...classFields, ...parentFields];
      }
    }

    return classFields;
  }

  /**
   * Extract references from a method node
   */
  private extractReferencesFromMethod(
    methodNode: Parser.SyntaxNode,
    FECFC: FolderExtractComponentsFromCode
  ): Reference[] {
    const references: Reference[] = [];

    const findReferences = (node: Parser.SyntaxNode) => {
      // Check for field or method references
      if (node.type === "identifier") {
        // You might want to add more sophisticated checks here
        references.push({
          name: node.text,
          type: this.determineReferenceType(node, FECFC),
        });
      }

      // Recursively search child nodes
      for (let child of node.children) {
        findReferences(child);
      }
    };

    findReferences(methodNode);

    // Remove duplicates
    return Array.from(new Set(references.map((r) => r.name)))
      .map((name) => references.find((r) => r.name === name)!)
      .filter(Boolean);
  }

  /**
   * Determine if a reference is a field or method
   */
  private determineReferenceType(
    node: Parser.SyntaxNode,
    FECFC: FolderExtractComponentsFromCode
  ): "field" | "method" {
    const parsedComponents = FECFC.getParsedComponentsFromFile();

    for (const fileComponents of parsedComponents) {
      for (const classInfo of fileComponents.classes) {
        // Check if the reference is a field
        const isField = classInfo.fields.some((f) => f.name === node.text);
        if (isField) {
          return "field";
        }

        // Check if the reference is a method
        const isMethod = classInfo.methods.some((m) => m.name === node.text);
        if (isMethod) {
          return "method"; // Correctly handle method references here
        }
      }
    }

    return "field"; // Default to field if cannot determine
  }

  /**
   * Find the class that owns the referenced entity
   */
  private findReferenceOwnerClass(
    reference: Reference,
    currentClasses: ClassInfo[]
  ): ClassInfo | undefined {
    const parsedComponents = this.getParsedComponentsFromFolder();

    const nonModelClasses = [
      "String",
      "Integer",
      "Double",
      "Boolean",
      "int",
      "double",
      "boolean",
      "float",
      "long",
      "char",
      "byte",
      "short",
    ];

    // Skip non-model classes
    if (nonModelClasses.includes(reference.name)) {
      return undefined;
    }

    for (const fileComponents of parsedComponents) {
      for (const classInfo of fileComponents.classes) {
        // More flexible matching to catch various reference types
        const matchField = classInfo.fields.some(
          (f) =>
            f.name.split(" ")[0] === reference.name &&
            reference.type === "field"
        );

        const matchMethod = classInfo.methods.some(
          (m) =>
            m.name === reference.name &&
            reference.type === "method" &&
            (m.name.startsWith("get") ||
              m.name.startsWith("Get") ||
              m.name.startsWith("set") ||
              m.name.startsWith("Set"))
        );

        if (matchField || matchMethod) {
          return {
            name: classInfo.name,
            extendedclass: "",
            isAbstract: false,
            isInterface: false,
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 0 },
          };
        }
      }
    }

    return undefined;
  }
  /**
   * Check if the reference is from a local class or its ancestors
   */
  private isLocalClassAccess(
    referenceClass: ClassInfo,
    currentClasses: ClassInfo[]
  ): boolean {
    // Check if the reference class is in the current set of classes
    const isInCurrentClasses = currentClasses.some(
      (cls) => cls.name === referenceClass.name
    );

    // Check for ancestor relationship
    const hasAncestorRelationship = currentClasses.some(
      (cls) => cls.parent === referenceClass.name
    );

    return isInCurrentClasses || hasAncestorRelationship;
  }

  private getParsedComponentsFromFolder(): FileParsedComponents[] {
    // Use the method from FolderExtractComponentsFromCode
    const folderExtractor = new FolderExtractComponentsFromCode();
    return folderExtractor.getParsedComponentsFromFile();
  }
}
