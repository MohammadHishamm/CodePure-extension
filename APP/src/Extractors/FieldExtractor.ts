import Parser from "tree-sitter";

import { FieldInfo } from "../Interface/FieldInfo";
import { MethodInfo } from "../Interface/MethodInfo";

export class FieldExtractor {
  // Extract field-related features from the parsed code
  public extractFields(
    rootNode: Parser.SyntaxNode,
    methods: MethodInfo[]
  ): FieldInfo[] {
    const fieldNodes = rootNode.descendantsOfType("field_declaration");
    return fieldNodes.map((node) => {
      let modifiers: string = "public";
      let type: string = "Unknown";
      let name: string = "Unnamed";
      let isEncapsulated: boolean = false; // By default assume no encapsulation

      // Iterate over the field declaration nodes
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (child.type === "modifiers") {
          modifiers = child.children.length > 0 ? child.children[0].text : "";
        } else if (child.type.includes("type")) {
          type = child.text; // Extract type (e.g., int, String)
        } else if (child.type.includes("variable_declarator")) {
          const identifierNode = child.children.find(
            (subChild) => subChild.type === "identifier"
          );
          if (identifierNode) {
            name = identifierNode.text; // Extract field name
          }
        }
      }

      // A field is only encapsulated if:
      // 1. It's not public (must be private or protected) AND
      // 2. It has either a getter or setter method
      const hasAccessor = this.hasGetterSetter(name, methods);
      isEncapsulated = modifiers.toLowerCase() !== "public" && hasAccessor;

      return {
        name,
        type,
        modifiers,
        isEncapsulated,
        startPosition: node.startPosition,
        endPosition: node.endPosition,
      };
    });
  }

  private hasGetterSetter(fieldName: string, methods: MethodInfo[]): boolean {
    // Ensure the first letter of the field name is capitalized for matching with the getter/setter patterns
    let capitalizedFieldName =
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    // Patterns for getter and setter methods (case-insensitive)
    const getterPattern = new RegExp(`get${capitalizedFieldName}`);
    const setterPattern = new RegExp(`set${capitalizedFieldName}`);

    // Arrays to store method names being checked (kept for potential debugging)
    const getterMethods: string[] = [];
    const setterMethods: string[] = [];

    // Iterate through methods to check for matching getter and setter methods
    let hasGetter = false;
    let hasSetter = false;

    methods.forEach((method) => {
      // Check if the method matches the getter pattern
      if (getterPattern.test(method.name)) {
        getterMethods.push(method.name);
        hasGetter = true;
      }

      // Check if the method matches the setter pattern
      if (setterPattern.test(method.name)) {
        setterMethods.push(method.name);
        hasSetter = true;
      }
    });

    // Return true if EITHER getter OR setter methods are found
    return hasGetter || hasSetter;
  }
}
