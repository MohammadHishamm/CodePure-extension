# CodePure: Smart Code Smell Detection extension on VS

![CodePure Logo](./APP/src/Assets/codepure-logo.png) 

**CodePure** is an advanced VS Code extension that detects and highlights code smells using extracted metrics. It leverages **Tree-sitter** for code extraction, processes the data into JSON, and applies **iPlasma-inspired rules** to identify problematic code structures.

## 🚀 Features

### 🔍 **Code Smell Detection & Highlighting**
CodePure analyzes your code and visually highlights problematic sections based on defined metrics:

- **Brain Class**
  - Highlights based on **WMC > 87** (method heads) and **LOC > 351** (class head).
  - Provides messages suggesting code improvements.
- **Data Class**
  - Detects classes with minimal behavior (low method complexity, high attribute usage).
- **God Class**
  - Flags excessively large classes with high complexity and responsibility.
- **Schizo Class** *(Future Testing Needed)*
  - Identifies classes with conflicting responsibilities.

### 🤖 **Quick AI Fix**
- Automatically suggests refactoring solutions for detected code smells.
- Helps developers quickly improve code quality with minimal manual effort.

### ✨ **Advanced Highlighting System**
- **Real-time visual cues** for detected code smells.
- Different colors and markers for various issues, ensuring quick identification.

### 📊 **Metrics-Based Analysis**
CodePure retrieves metrics from a precomputed **JSON file** instead of recalculating them, improving efficiency. Extracted metrics include:
- **WMC (Weighted Methods per Class)**
- **LOC (Lines of Code)**
- **NrBm (Number of Brain Methods)**
- **CBO (Coupling Between Objects)**
- **NOA (Number of Attributes)**

### 📐 **Class Diagram Generation**
- Generates a **comprehensive class diagram** for the entire project.
- Uses the extracted **JSON data** to visualize class structures and relationships.

### 🛠 **Code Extraction & Parsing**
- Uses **Tree-sitter** to extract code structure.
- Saves extracted data in **JSON format** for easy readability and further processing.
- Powers a **Class Diagram Generator** using the parsed JSON data.

### 🧠 **Custom AI Model for Detection**
- The **AI model was trained by us** specifically for CodePure.
- Optimized for detecting **Brain Class, Data Class, God Class, and Schizo Class**.
- Continuously improved based on real-world testing.

### 🧪 **Accuracy Evaluation & Testing**
CodePure was tested on **medium-sized GitHub repositories**:
- ✅ **Data Class detection**: Always accurate.
- ⚖ **God Class detection**: 50% accuracy.
- 🔬 **Further testing required** for **Brain Class** & **Schizo Class**.

## 📦 Installation
1. Download the extension from the VS Code Marketplace *(link to be added)*.
2. Open VS Code and navigate to **Extensions**.
3. Search for **CodePure** and install.
4. Restart VS Code if necessary.

## 🚀 Usage
1. Open a project in VS Code.
2. **CodePure automatically detects and highlights** code smells.
3. Use **Quick AI Fix** to resolve issues faster.
4. Generate a **Class Diagram** for a better project overview.
5. Check the provided messages and refactor accordingly.

## 📌 Roadmap
- ✅ Current Features: Brain Class, Data Class, God Class detection.
- 🛠 In Progress: Schizo Class detection improvements.
- 🔍 Future: Enhanced visualization & customization options.

## 📞 Contact & Contributions
We welcome contributions! Feel free to:
- Submit issues on **GitHub** *(repo link here)*
- Suggest improvements & optimizations
- Help refine detection accuracy with new test cases

---

**Code smarter with CodePure! 🚀**

