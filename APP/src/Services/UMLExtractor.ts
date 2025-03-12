import * as fs from "fs";
import * as path from "path";

interface NodeData {
  id: string;
  label: string;
}

interface UMLData {
  nodes: { data: NodeData }[];
}

export class UMLExtractor {
  public static extract(classesData: any) {
    if (!classesData || !Array.isArray(classesData.classes)) {
      console.error("❌ Invalid class data format:", JSON.stringify(classesData, null, 2));
      return;
    }

    console.log("✅ Extracting UML from:", JSON.stringify(classesData, null, 2));

    const umlData: UMLData = { nodes: [] };

    for (const classFile of classesData.classes) {
      if (!Array.isArray(classFile.classes)) {
        console.warn("⚠️ Skipping invalid class file:", classFile);
        continue;
      }

      for (const classInfo of classFile.classes) {
        if (!classInfo.name) {
          console.warn("⚠️ Skipping class without name:", classInfo);
          continue;
        }

        // Add class node
        const classLabel = `${classInfo.isAbstract ? "Abstract " : ""}${classInfo.isInterface ? "Interface " : ""}${classInfo.name}`;
        umlData.nodes.push({ data: { id: classInfo.name, label: classLabel } });

        // Extract Fields
        if (Array.isArray(classFile.fields)) {
          for (const field of classFile.fields) {
            const fieldLabel = `Field: ${field.name} : ${field.type || "unknown"}`;
            umlData.nodes.push({ data: { id: `${classInfo.name}.${field.name}`, label: fieldLabel } });
          }
        }

        // Extract Methods
        if (Array.isArray(classInfo.methods)) {
          for (const method of classInfo.methods) {
            const methodLabel = `Method: ${method.name}(${method.params?.join(", ") || ""}) : ${method.returnType}`;
            umlData.nodes.push({ data: { id: `${classInfo.name}.${method.name}`, label: methodLabel } });
          }
        }
      }
    }

    // Ensure Results directory exists
    const resultsDir = path.join(__dirname, "..", "src", "Results").replace(/out[\\\/]?/, "");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save extracted UML data
    const filePath = path.join(resultsDir, "ExtractedClasses.json");
    try {
      fs.writeFileSync(filePath, JSON.stringify(umlData, null, 2), "utf8");
      console.log("✅ UML data successfully written to", filePath);
    } catch (err) {
      console.error("❌ Error writing UML data:", err);
    }
  }
}
