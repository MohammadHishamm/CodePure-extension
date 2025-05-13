import * as fs from "fs";
import * as path from "path";

interface NodeData {
  id: string;
  label: string;
}

interface EdgeData {
  source: string;
  target: string;
  label: string;
}

interface UMLData {
  nodes: { data: NodeData }[];
  edges: { data: EdgeData }[];
}

export class UMLExtractor {
  public static extract(classesData: any) {

    if (!classesData || !Array.isArray(classesData.classes)) {
      console.error(
        "Invalid class data format:",
        JSON.stringify(classesData, null, 2)
      );
      return;
    }

    const umlData: UMLData = { nodes: [], edges: [] };
    const classNames = new Set<string>();

    for (const classFile of classesData.classes) {
      if (!Array.isArray(classFile.classes)) {
        console.warn("Skipping invalid class file:", classFile);
        continue;
      }

      for (const classInfo of classFile.classes) {
        if (!classInfo.name) {
          console.warn("Skipping class without name:", classInfo);
          continue;
        }

        classNames.add(classInfo.name);
        const classLabel = `${classInfo.isAbstract ? "Abstract " : ""}${classInfo.isInterface ? "Interface " : ""
          }${classInfo.name}`;
        umlData.nodes.push({
          data: {
            id: classInfo.name,
            label: this.addSpaceBetweenWords(classLabel),
          },
        });

        // Inheritance (extends)
        if (classInfo.parent) {
          umlData.edges.push({
            data: {
              source: classInfo.parent,
              target: classInfo.name,
              label: "uses",
            },
          });
        }

        // Interface Implementation
        if (classInfo.isInterface) {
          umlData.nodes.push({
            data: { id: classInfo.name, label: `Interface ${classInfo.name}` },
          });
        }

        if (Array.isArray(classInfo.implements)) {
          for (const iface of classInfo.implements) {
            umlData.edges.push({
              data: {
                source: iface,
                target: classInfo.name,
                label: "implements",
              },
            });
          }
        }

        // Fields (Associations)
        if (Array.isArray(classFile.fields)) {
          for (const field of classFile.fields) {
            const fieldLabel = `Field: ${field.name} : ${field.type || "unknown"
              }`;
            umlData.nodes.push({
              data: {
                id: `${classInfo.name}.${field.name}`,
                label: this.addSpaceBetweenWords(fieldLabel),
              },
            });
            if (field.type && classNames.has(field.type)) {
              umlData.edges.push({
                data: {
                  source: classInfo.name,
                  target: field.type,
                  label: "has",
                },
              });
            }
          }
        }

        // Methods
        if (Array.isArray(classFile.methods)) {
          for (const method of classFile.methods) {
            if (method.returnType == "No_Type") {
              method.returnType = "void";
            }
            const methodLabel = `Method: ${method.name}(${method.params?.join(", ") || ""
              }) : ${method.returnType}`;
            umlData.nodes.push({
              data: {
                id: `${classInfo.name}.${method.name}`,
                label: this.addSpaceBetweenWords(methodLabel),
              },
            });
          }
        }
      }
    }

    // Ensure Results directory exists
    const resultsDir = path.join(__dirname, "..", "uml").replace(/out[\\\/]?/, "");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save extracted UML data
    // Save or Override extracted UML data
    const filePath = path.join(resultsDir, "ExtractedClasses.json");

    try {
      // Writing new UML data, this will override the existing content.
      fs.writeFileSync(filePath, JSON.stringify(umlData, null, 2), "utf8");
      console.log("UML data successfully written to", filePath);
    } catch (err) {
      console.error("Error writing UML data:", err);
    }
  }

  // Function to add space between every word
  private static addSpaceBetweenWords(label: string): string {
    return label
      .split(/(?=[A-Z])/)
      .join(" ")
      .replace(/([a-z])([A-Z])/g, "$1 $2");
  }
}
