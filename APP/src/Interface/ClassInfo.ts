import Parser from "tree-sitter";

export interface ClassInfo {
  name?: string;
  implementedInterfaces?: string[];
  isAbstract?: boolean;
  isFinal?: boolean;
  isInterface?: boolean;
  AccessLevel?:string;
  modifiers?: string[];
  annotations?: string[];
  startPosition: Parser.Point;
  endPosition: Parser.Point;
  isNested?: boolean;
  genericParams?: string;
  hasConstructor?: boolean;
  parent?: string;  
}
