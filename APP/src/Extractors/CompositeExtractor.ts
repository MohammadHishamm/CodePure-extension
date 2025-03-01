import Parser from "tree-sitter";

import { ClassGroup } from "../Interface/ClassGroup";
import { ClassExtractor } from "./ClassExtractor";
import { MethodExtractor } from "./MethodExtractor";
import { FieldExtractor } from "./FieldExtractor";

export class CompositeExtractor {
  public extractClassGroup(
    rootNode: Parser.SyntaxNode,
    fileName: string
  ): ClassGroup[] 
  {
    // Extract class declarations
    let classNodes = rootNode.descendantsOfType("class_declaration");
    const interfaceNodes = rootNode.descendantsOfType("interface_declaration");

    // Handle cases where no classes are found
    if (classNodes.length === 0) {
      if (interfaceNodes.length !== 0) {
        classNodes = interfaceNodes;
      } else {
        console.warn(`No Class found in file: ${fileName}`);
        return [];
      }
    }

    const classExtractor = new ClassExtractor();
    const methodExtractor = new MethodExtractor();
    const fieldExtractor = new FieldExtractor();
    
    const allClasses = classExtractor.extractClasses(rootNode);
    const methods = methodExtractor.extractMethods(rootNode, allClasses);
    const fields = fieldExtractor.extractFields(rootNode, methods);
    
    return [
      {
        fileName: fileName,
        name: allClasses[0].name ?? "Unknown", 
        classes: allClasses,
        methods: methods,
        fields: fields, 
      },
    ];
  }
}
