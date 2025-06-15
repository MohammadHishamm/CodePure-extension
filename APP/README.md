# CodePure "Code Smells Detector"

*CodePure* is a powerful Visual Studio Code extension designed to help developers write cleaner, more maintainable code by automatically detecting and addressing common code smells. It enhances your coding workflow by providing insights and suggestions tailored to your coding standards.

## Features

1. **Real-time Code Smell Detection**: 
   Automatically analyzes code, identifying common code smells as you type.

2. **Code Smell Categorization**: 
   Organizes detected smells into categories, such as complexity, maintainability, and readability.

3. **Detailed Explanations & Suggestions**: 
   Provides concise explanations of detected smells and best-practice suggestions to resolve them.

4. **Customizable Thresholds**: 
   Users can set their own detection criteria for certain smells, such as method length or class size, tailoring the extension to their coding standards.

5. **Code Smell Dashboard**: 
   A comprehensive view that summarizes the total number and types of smells detected across the entire project, enabling developers to monitor progress over time.

6. **Quick-Fix Integrations**: 
   Suggests potential fixes for certain types of smells and offers one-click code refactoring options, simplifying the developer's workflow.

7. **Cross-Language Support**: 
   Compatible with multiple programming languages.

   (APP\src\Assets\codepure-logo.png)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

This extension requires Visual Studio Code version 1.56.0 or higher. Ensure that you have the following dependencies installed:

- Node.js (v14 or higher)
- Relevant language support extensions for the programming languages you wish to analyze.

## Extension Settings

This extension contributes the following settings:

* `codepure.enable`: Enable or disable the *CodePure* extension.
* `codepure.threshold`: Set customizable thresholds for code smell detection.

## Known Issues

- Some users may experience lag during real-time analysis on very large codebases. We are working on optimizing performance.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of *CodePure* with core features.

### 1.0.1

Fixed issue with incorrect categorization of certain code smells.

### 1.1.0

Added customizable thresholds and improved dashboard functionalities.

---

## Following Extension Guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For More Information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
