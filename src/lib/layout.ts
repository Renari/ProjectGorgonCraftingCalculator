import type { CraftingNode } from './types';
import { Position, type Node, type Edge } from '@xyflow/svelte';

export function treeToFlowElements(root: CraftingNode): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Simple auto-layout state
    const levelWidths = new Map<number, number>();
    const nodeWidth = 220;
    const nodeHeight = 100;
    const paddingX = 40;
    const paddingY = 80;

    function traverse(node: CraftingNode, depth: number): { x: number, y: number } {
        const currentLevelWidth = levelWidths.get(depth) || 0;
        
        let subTreeWidth = 0;
        let childrenPositions = [];

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const childPos = traverse(child, depth + 1);
                childrenPositions.push(childPos);
                
                edges.push({
                    id: `e-${child.id}-${node.id}`,
                    source: child.id,
                    target: node.id,
                    sourceHandle: 'source-right',
                    targetHandle: 'target-left',
                    type: 'step',
                    animated: true,
                    style: "stroke: var(--accent); stroke-width: 2px;"
                });
            }
            // Center parent above children
            const firstChildX = childrenPositions[0].x;
            const lastChildX = childrenPositions[childrenPositions.length - 1].x;
            subTreeWidth = lastChildX - firstChildX;
        }

        let x = currentLevelWidth;
        if (subTreeWidth > 0) {
            // If children span a width, parent should be centered, but ensure it doesn't overlap left bounds
            x = Math.max(currentLevelWidth, childrenPositions[0].x + subTreeWidth / 2);
        }

        const y = depth * (nodeHeight + paddingY);
        
        // Update level width for the next sibling
        levelWidths.set(depth, Math.max(currentLevelWidth, x + nodeWidth + paddingX));

        nodes.push({
            id: node.id,
            position: { x, y },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            data: { 
                id: node.id,
                label: node.name,
                quantity: node.quantity,
                icon: node.icon,
                profession: node.profession,
                level: node.level,
                isRaw: node.isRaw,
                source: node.source,
                availableRecipes: node.availableRecipes,
                selectedRecipeIdx: node.selectedRecipeIdx,
                isApproximate: node.isApproximate,
                obtainingMethods: node.obtainingMethods,
                byproducts: node.byproducts,
                isCompleted: node.isCompleted
            },
            type: 'craftingNode'
        });

        return { x, y };
    }

    traverse(root, 0);

    return { nodes, edges };
}
