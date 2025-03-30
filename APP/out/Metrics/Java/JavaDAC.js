"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaDataAbstractionCoupling = void 0;
const MetricCalculator_1 = require("../../Core/MetricCalculator");
class JavaDataAbstractionCoupling extends MetricCalculator_1.MetricCalculator {
    calculate(node, FECFC, Filename) {
        let allClasses = [];
        let allMethods = [];
        let allFields = [];
        console.log(`[DAC] Calculating DAC for file: ${Filename}`);
        const fileParsedComponents = FECFC.getParsedComponentsByFileName(Filename);
        if (fileParsedComponents) {
            const classGroups = fileParsedComponents.classes;
            console.log(`[DAC] Found ${classGroups.length} class groups in file`);
            classGroups.forEach((classGroup, index) => {
                console.log(`[DAC] Processing class group ${index + 1}:`);
                console.log(`[DAC] - Classes: ${classGroup.classes.length}`);
                console.log(`[DAC] - Methods: ${classGroup.methods.length}`);
                console.log(`[DAC] - Fields: ${classGroup.fields.length}`);
                allClasses = [...allClasses, ...classGroup.classes];
                allMethods = [...allMethods, ...classGroup.methods];
                allFields = [...allFields, ...classGroup.fields];
            });
        }
        else {
            console.log(`[DAC] No parsed components found for file: ${Filename}`);
        }
        console.log(`[DAC] Total fields to analyze for DAC: ${allFields.length}`);
        const DAC = this.findDataAbstractionCoupling(allFields);
        console.log(`[DAC] Final DAC value: ${DAC}`);
        return DAC;
    }
    findDataAbstractionCoupling(Fields) {
        let DAC = 0; // Initialize DAC counter
        const usedClassTypes = new Set(); // To track unique types
        console.log("[DAC] Starting DAC calculation...");
        // List of primitive types to ignore - convert all to lowercase for case-insensitive comparison
        const primitiveTypesList = [
            "int",
            "float",
            "double",
            "boolean",
            "char",
            "byte",
            "short",
            "long",
            "void",
            // Primitive arrays
            "int[]",
            "float[]",
            "double[]",
            "boolean[]",
            "char[]",
            "byte[]",
            "short[]",
            "long[]",
            "int[][]",
            "float[][]",
            "double[][]",
            "boolean[][]",
            "char[][]",
            "byte[][]",
            "short[][]",
            "long[][]",
            // Wrapper classes
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
            "Number",
            // Array versions of wrapper classes
            "String[]",
            "Integer[]",
            "Float[]",
            "Double[]",
            "Boolean[]",
            "Character[]",
            "Byte[]",
            "Short[]",
            "Long[]",
            // Common Java library classes
            "Object",
            "Class",
            "Exception",
            "RuntimeException",
            "Throwable",
            "Error",
            "Thread",
            "Runnable",
            "System",
            "Math",
            "Runtime",
            "Process",
            "ProcessBuilder",
            "SecurityManager",
            // Java Collections Framework
            "Collection",
            "List",
            "ArrayList",
            "LinkedList",
            "Vector",
            "Stack",
            "Set",
            "HashSet",
            "TreeSet",
            "LinkedHashSet",
            "Map",
            "HashMap",
            "TreeMap",
            "LinkedHashMap",
            "Hashtable",
            "Properties",
            "Queue",
            "Deque",
            "PriorityQueue",
            "ArrayDeque",
            "Iterator",
            "Enumeration",
            "Comparator",
            "Comparable",
            // Java I/O
            "File",
            "InputStream",
            "OutputStream",
            "Reader",
            "Writer",
            "BufferedReader",
            "BufferedWriter",
            "FileInputStream",
            "FileOutputStream",
            "FileReader",
            "FileWriter",
            // Java Utility Classes
            "Date",
            "Calendar",
            "GregorianCalendar",
            "TimeZone",
            "Locale",
            "Random",
            "Scanner",
            "StringTokenizer",
            "UUID",
            "Timer",
            "TimerTask",
            "BigInteger",
            "BigDecimal",
            "Optional",
            "Stream",
            "Arrays",
            "Collections",
            // Java Concurrency
            "Thread",
            "Runnable",
            "Callable",
            "Future",
            "ExecutorService",
            "Executor",
            "Lock",
            "ReentrantLock",
            "Condition",
            "Semaphore",
            "CountDownLatch",
            "CyclicBarrier",
            "AtomicInteger",
            "AtomicLong",
            "AtomicBoolean",
            "AtomicReference",
            // Java Reflection
            "Class",
            "Method",
            "Field",
            "Constructor",
            "Modifier",
            "Proxy",
            "InvocationHandler",
            // Java NIO
            "Buffer",
            "ByteBuffer",
            "CharBuffer",
            "Path",
            "Paths",
            "Files",
            "Channel",
            "Selector",
        ];
        // Convert all primitive types to lowercase for case-insensitive comparison
        const primitiveTypes = new Set(primitiveTypesList.map((type) => type.toLowerCase()));
        console.log("[DAC] Primitive types that will be ignored:", primitiveTypesList);
        console.log("[DAC] Analyzing fields for non-primitive types:");
        for (const field of Fields) {
            const fieldType = field.type;
            console.log(`[DAC] Field: ${field.name || "unnamed"}, Type: ${fieldType || "undefined"}`);
            if (!fieldType) {
                console.log(`[DAC] Field has no type, returning current DAC: ${DAC}`);
                return DAC;
            }
            // Extract generic types if present (e.g., "List<Book>")
            const genericMatch = fieldType.match(/^(\w+)<(.+)>$/);
            if (genericMatch) {
                console.log(`[DAC] Found generic type: ${fieldType}`);
                console.log(`[DAC] Container: ${genericMatch[1]}, Element: ${genericMatch[2]}`);
                console.log(`[DAC] Note: Current implementation skips processing generic types`);
            }
            else {
                // Convert field type to lowercase for case-insensitive comparison with primitives
                if (!primitiveTypes.has(fieldType.toLowerCase())) {
                    if (!usedClassTypes.has(fieldType)) {
                        usedClassTypes.add(fieldType);
                        DAC++;
                        console.log(`[DAC] ✅ COUNTED as DAC: ${fieldType} (new non-primitive type)`);
                    }
                    else {
                        console.log(`[DAC] ⏭️ SKIPPED: ${fieldType} (already counted)`);
                    }
                }
                else {
                    console.log(`[DAC] ⏭️ SKIPPED: ${fieldType} (primitive type)`);
                }
            }
        }
        console.log("[DAC] DAC calculation complete");
        console.log("[DAC] Types counted towards DAC:", [...usedClassTypes]);
        console.log(`[DAC] Final DAC count: ${DAC}`);
        return DAC; // Return the final count
    }
}
exports.JavaDataAbstractionCoupling = JavaDataAbstractionCoupling;
//# sourceMappingURL=JavaDAC.js.map