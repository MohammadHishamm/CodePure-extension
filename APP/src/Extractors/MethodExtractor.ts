import Parser from "tree-sitter";

import { ClassInfo } from "../Interface/ClassInfo";
import { MethodInfo } from "../Interface/MethodInfo";

export class MethodExtractor {
  // Extract Method Parameters with Types and Annotations
  private extractMethodParams(node: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    const paramNodes = node.descendantsOfType("formal_parameter");
    paramNodes.forEach((paramNode) => {
      const typeNode = paramNode.childForFieldName("type");
      const type = typeNode ? typeNode.text : "Unknown"; // Extract parameter type
      const nameNode = paramNode.childForFieldName("name");
      const name = nameNode ? nameNode.text : "Unnamed"; // Extract parameter name
      const annotations = this.extractParameterAnnotations(paramNode); // Extract annotations
      params.push(`${annotations.join(", ")} ${type} ${name}`);
    });
    return params;
  }

  private extractParameterAnnotations(node: Parser.SyntaxNode): string[] {
    const annotations: string[] = [];
    const annotationNodes = node.descendantsOfType("annotation");
    annotationNodes.forEach((annotation) => {
      annotations.push(annotation.text);
    });
    return annotations;
  }

  // Extract Access Modifiers like static, final, synchronized, etc.
  private extractMethodModifiers(node: Parser.SyntaxNode): string[] {
    const modifiers: string[] = [];
    const methodText = node.text;
    const possibleModifiers = [
      "public",
      "private",
      "protected",
      "static",
      "final",
      "synchronized",
    ];

    possibleModifiers.forEach((mod) => {
      if (methodText.split(/\s+/)[0] === mod) {
        modifiers.push(mod);
      }
    });

    return modifiers;
  }

  private extractStatementsRecursively(
    node: Parser.SyntaxNode,
    bodyStatements: string[]
  ) {

    if (node.type === "if_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "for_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "while_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "do_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "try_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "expression_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "break_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "continue_statement") {
      bodyStatements.push(node.type);
    } else if (node.type === "ternary_expression") {
      bodyStatements.push(node.type);
    } else if (node.type === "condition" || node.type === "binary_expression") {
      const conditionText = node.text || "";
      const booleanOperators = (conditionText.match(/&&|\|\|/g) || []).length;
      if (booleanOperators > 0) {
        bodyStatements.push("condition");
      }
    } else if (node.type === "catch_clause") {
      bodyStatements.push(node.type);
    } else if (node.type === "case") {
      bodyStatements.push(node.type);
    } else if (node.type === "throw_statement") {
      bodyStatements.push(node.type);
    }
    node.children.forEach((child) => {
      this.extractStatementsRecursively(child, bodyStatements);
    });
  }

  // Detect Field Access in Method Body
  private extractFieldAccesses(node: Parser.SyntaxNode): string[] {
    const fieldAccesses: string[] = [];
    const bodyNode = node.childForFieldName("body");

    if (bodyNode) {
      bodyNode.descendantsOfType("field_access").forEach((fieldNode) => {
        const objectNode = fieldNode.child(0); // Usually the object before the dot
        const fieldIdentifier = fieldNode.child(2); // Usually the field after the dot

        if (objectNode && fieldIdentifier) {
          const fieldAccessText = `${objectNode.text}.${fieldIdentifier.text}`;

          // Exclude System.out or similar print/log calls
          if (!fieldAccessText.includes("System.out")) {
            fieldAccesses.push(fieldAccessText);
          }
        }
      });
    }

    return fieldAccesses;
  }

  // Call this function instead of looping manually
  private extractStatements(bodyNode: Parser.SyntaxNode): string[] {
    const bodyStatements: string[] = [];
    if (bodyNode) {
      this.extractStatementsRecursively(bodyNode, bodyStatements);
    }
    return bodyStatements;
  }

  // Extract Local Variables Declared Inside the Method
  private extractLocalVariables(node: Parser.SyntaxNode): string[] {
    const localVars: string[] = [];
    const bodyNode = node.childForFieldName("body");

    if (bodyNode) {
      bodyNode
        .descendantsOfType("variable_declarator")
        .forEach((declarator) => {
          const varName =
            declarator.childForFieldName("name")?.text ?? "Unnamed";

          // Try to find the type in the parent node (e.g., variable_declaration)
          const parent = declarator.parent;
          const varType = parent?.childForFieldName("type")?.text;
          parent?.child(0)?.text; // Sometimes the type is the first child
          ("Unknown");

          localVars.push(`${varType}`);
        });
    }
    return localVars;
  }

  // Track Method Calls Inside the Method Body
  private extractMethodCalls(node: Parser.SyntaxNode): string[] {
    const methodCalls: string[] = [];
    const bodyNode = node.childForFieldName("body");

    if (bodyNode) {
      bodyNode.descendantsOfType("method_invocation").forEach((callNode) => {
        const objectNode = callNode.childForFieldName("object");
        const methodNode = callNode.childForFieldName("name");

        if (objectNode && methodNode) {
          const methodCall = `${objectNode.text}.${methodNode.text}`;

          // Exclude System.out calls
          if (!methodCall.includes("System.out")) {
            methodCalls.push(methodCall);
          }
        } else if (methodNode) {
          const methodCall = methodNode.text;

          // Exclude System.out calls for static methods
          if (!methodCall.includes("System.out")) {
            methodCalls.push(methodCall); // For static calls without object
          }
        }
      });
    }

    return methodCalls;
  }

  // Extract Method Information Including All Details
  public extractMethods(
    rootNode: Parser.SyntaxNode,
    classes: ClassInfo[]
  ): MethodInfo[] {
    // Collect all method and constructor declarations
    const methodNodes = [
      ...rootNode.descendantsOfType("constructor_declaration"),
      ...rootNode.descendantsOfType("method_declaration"),
    ];

    return methodNodes.map((node) => {
      const modifiers = this.extractMethodModifiers(node);
      const name = this.extractMethodName(node);

      return {
        name,
        modifiers: this.getAccessModifier(modifiers),
        params: this.extractMethodParams(node),
        returnType: this.extractMethodReturnType(node),
        isAbstract: this.isAbstractMethod(node),
        isConstructor: node.type === "constructor_declaration",
        isAccessor: this.isAccessor(node, name),
        isOverridden: this.isOverriddenMethod(node),
        fieldsUsed: this.getFieldsUsedInMethod(node, name),
        annotations: this.extractMethodAnnotations(node),
        throwsClause: this.extractThrowsClause(node),
        methodBody: this.extractStatements(node),
        localVariables: this.extractLocalVariables(node),
        methodCalls: this.extractMethodCalls(node),
        fieldAccess: this.extractFieldAccesses(node),
        parent: this.findParentClass(node, classes),
        startPosition: node.startPosition,
        endPosition: node.endPosition,
      };
    });
  }

  // Helper Methods (to be defined)
  private isOverriddenMethod(node: Parser.SyntaxNode): boolean {
    const annotationNodes = node.descendantsOfType("marker_annotation");

    if (annotationNodes.length > 0) {
      return true;
    }

    return false;
  }

  private getAccessModifier(modifiers: string[]): string {
    const accessModifier = modifiers.find((mod) =>
      ["public", "private", "protected"].includes(mod)
    );

    return accessModifier || "public";
  }

  private extractMethodName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName("name");
    return nameNode ? nameNode.text : "Unknown";
  }

  private extractMethodReturnType(methodNode: Parser.SyntaxNode): string {
    // Check if method is void
    const voidTypeNode = methodNode.childForFieldName("void_type");
    if (voidTypeNode) {
      return "void";
    }

    const integralTypeNode = methodNode.descendantsOfType("integral_type")[0];
    if (integralTypeNode) {
      return integralTypeNode.text;
    }

    const typeNode = methodNode.descendantsOfType("type_identifier")[0];
    if (typeNode) {
      return typeNode.text;
    }

    return "No_Type";
  }

  private isAbstractMethod(methodNode: Parser.SyntaxNode): boolean {
    const modifierNodes = methodNode.descendantsOfType("modifiers");
  
    for (const modNode of modifierNodes) {
      if (modNode.text.includes("abstract")) {
        return true;
      }
    }
  
    return false;
  }
   
  private findParentClass(
    node: Parser.SyntaxNode,
    classes: ClassInfo[]
  ): ClassInfo | null {
    const className =
      node.parent?.type === "class_declaration" ? node.parent.text : "";
    return classes.find((classInfo) => classInfo.name === className) ?? null;
  }

  public isAccessor(node: Parser.SyntaxNode, methodName: string): boolean {
    if (
      !methodName.startsWith("get") &&
      !methodName.startsWith("Get") &&
      !methodName.startsWith("set") &&
      !methodName.startsWith("Set")
    ) {
      return false;
    }

    const modifiers = this.extractMethodModifiers(node);
    if (modifiers.includes("protected") || modifiers.includes("static")) {
      return false;
    }

    const bodyNode = node.childForFieldName("body");
    if (!bodyNode) {
      return false;
    }

    const statements = bodyNode.namedChildren;
    if (statements.length > 3) {
      return false;
    }

    const controlStructures = bodyNode.descendantsOfType([
      "if_statement",
      "for_statement",
      "while_statement",
      "try_statement",
      "switch_statement",
    ]);

    if (controlStructures.length > 0) {
      return false;
    }

    if (methodName.startsWith("get") || methodName.startsWith("Get")) {
      return bodyNode.text.includes("return");
    } else {
      return bodyNode.text.includes("=");
    }
  }

  public getFieldsUsedInMethod(
    rootNode: Parser.SyntaxNode,
    MethodName: string
  ): string[] {
    const fieldsUsed: string[] = [];

    const accessNodes = rootNode.descendantsOfType("variable_declarator");
    accessNodes.forEach((accessNode) => {
      const fieldName = accessNode.text;
      if (
        fieldName &&
        !fieldsUsed.includes(fieldName) &&
        fieldName !== MethodName
      ) {
        const identifierNode = accessNode.children.find(
          (subChild) => subChild.type === "identifier"
        );
        if (identifierNode) {
          fieldsUsed.push(identifierNode.text); // Add unique field names accessed
        }
      }
    });

    return fieldsUsed;
  }

  private extractMethodAnnotations(node: Parser.SyntaxNode): string[] {
    const annotations: string[] = [];
    const annotationNodes = node.descendantsOfType("marker_annotation");
    annotationNodes.forEach((annotation) => {
      annotations.push(annotation.text);
    });
    return annotations;
  }

  private extractThrowsClause(node: Parser.SyntaxNode): string[] {
    const throwsNodes = node.descendantsOfType("throw_statement");
    return throwsNodes.map((throwNode) => throwNode.text);
  }
}
