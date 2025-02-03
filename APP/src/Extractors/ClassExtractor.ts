import Parser from "tree-sitter";

import { ClassInfo } from "../Interface/ClassInfo";

export class ClassExtractor 
{  
  // Main function to extract all classes
  public extractClasses(rootNode: Parser.SyntaxNode): ClassInfo[] 
  {



    let classNodes = rootNode.descendantsOfType("class_declaration");
    
    let classInfos:ClassInfo[] = [] ;
   
    if(classNodes.length === 0)
    {
      const interfaceNode =  rootNode.descendantsOfType("interface_declaration");

      if(interfaceNode.length !== 0)
      {
        classNodes = interfaceNode;
      }
    }

    const { extendedClass, implementedInterfaces } = this.extractInheritanceInfo(classNodes);
    classInfos = this.extractClassInfo(classNodes, extendedClass, implementedInterfaces);

    return classInfos;
  }

  // Function to extract inheritance information (extends and implements)
  private extractInheritanceInfo(classNodes: Parser.SyntaxNode[]): { extendedClass: string | undefined; implementedInterfaces: string[] } {
    let extendedClass: string | undefined;
    let implementedInterfaces: string[] = [];

    classNodes.forEach((node) => {
      const extendsNode = node.childForFieldName("superclass");
      const implementsNode = node.childForFieldName("interfaces");

      if (extendsNode) {
        extendedClass = extendsNode.text.trim().replace(/^(extends|implements)\s*/, "");
      }

      if (implementsNode) {
        implementedInterfaces = implementsNode.text.split(",").map((i) => i.trim());
      }
    });

    return { extendedClass, implementedInterfaces };
  }

  // Function to extract all class information
  private extractClassInfo(
    classNodes: Parser.SyntaxNode[], 
    extendedClass: string | undefined, 
    implementedInterfaces: string[]
  ): ClassInfo[] {
    return classNodes.map((node) => {
      const modifiers = this.extractModifiers(node);
      const AccessLevel = this.getAccessModifier(modifiers);
      const annotations = this.extractAnnotations(node);
      const isNested = this.isNestedClass(node);
      const genericParams = this.extractGenericParams(node);
      const hasConstructor = this.hasConstructor(node);
      const bodyNode = node.childForFieldName("body");
      
      return {
        name: node.childForFieldName("name")?.text ?? "Unknown",
        implementedInterfaces,
        isAbstract: node.type === "abstract",  // Changed here,
        isFinal: modifiers.some((mod) => mod === "final"),
        isInterface: node.type === "interface_declaration",
        AccessLevel,
        annotations,
        startPosition: bodyNode?.startPosition ?? node.startPosition,
        endPosition: bodyNode?.endPosition ?? node.endPosition,
        parent: extendedClass,
        isNested,
        genericParams,
        hasConstructor,
      };
    });
  }

  // Function to extract modifiers from the class
  private extractModifiers(node: Parser.SyntaxNode): string[] {
    return node.children
      .filter((child) => child.type === "modifiers")
      .map((child) => child.text);
  }

  
  private getAccessModifier(modifiers: string[]): string {
    const modifier = modifiers.find((mod) => ["public", "private", "protected"].includes(mod));
    return modifier ?? "public";
}

  // Function to extract annotations from the class
  private extractAnnotations(node: Parser.SyntaxNode): string[] {
    return node.children
      .filter((child) => child.type === "marker_annotation")
      .map((child) => child.text);
  }

  // Function to check if a class is nested
  private isNestedClass(node: Parser.SyntaxNode): boolean {
    return node.parent?.type === "class_declaration";
  }

  // Function to extract generic parameters from the class
  private extractGenericParams(node: Parser.SyntaxNode): string | undefined {
    const genericParamsNode = node.childForFieldName("type_parameters");
    return genericParamsNode ? genericParamsNode.text : undefined;
  }

  // Function to check if the class has a constructor
  private hasConstructor(node: Parser.SyntaxNode): boolean {
    const bodyNode = node.childForFieldName("body");
    if(bodyNode)
    {
        if(bodyNode.descendantsOfType("constructor_declaration").length > 0)
        {
            return true;
        }
    }
    return false;
  }
}
