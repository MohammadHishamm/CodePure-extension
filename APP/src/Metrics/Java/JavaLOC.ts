import { MetricCalculator } from '../../Core/MetricCalculator';

export class JavaLOCMetric extends MetricCalculator {
    calculate(node: any, sourceCode: string): number {
        const startLine = node.startPosition.row;  // Get start line of the node
        const endLine = node.endPosition.row;  // Get end line of the node

        // Return the number of lines between start and end (inclusive)
        return endLine - startLine + 1;
    }
}
