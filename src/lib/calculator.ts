import type { Recipe, CraftingNode, ObtainingMethod } from './types';
import recipesData from './recipes.json';
import obtainingData from './obtaining_methods.json';

const recipes: Recipe[] = recipesData as Recipe[];
const obtainingMethodsMap: Record<string, ObtainingMethod[]> = obtainingData as Record<string, ObtainingMethod[]>;

// Map items to their available recipes (can be multiple for e.g. Gold Ore)
const recipeMap = new Map<string, Recipe[]>();
const iconMap = new Map<string, string>();

for (const r of recipes) {
    if (r.results.length > 0) {
        // Assume first result as the primary output identifier
        const itemName = r.results[0].name;
        
        if (!recipeMap.has(itemName)) {
            recipeMap.set(itemName, []);
        }
        recipeMap.get(itemName)!.push(r);
        
        for (const res of r.results) {
            if (res.icon) iconMap.set(res.name, res.icon);
        }
    }
    for (const ing of r.ingredients) {
        if (ing.icon) iconMap.set(ing.name, ing.icon);
    }
}

const surveyOutputsMap = new Map<string, string[]>();
for (const [item, methods] of Object.entries(obtainingMethodsMap)) {
    for (const method of methods) {
        if (!surveyOutputsMap.has(method.name)) {
            surveyOutputsMap.set(method.name, []);
        }
        surveyOutputsMap.get(method.name).push(item);
    }
}

export function getAvailableItems(): string[] {
    return Array.from(recipeMap.keys()).sort();
}

export function getAvailableSkills(): string[] {
    const skills = new Set<string>();
    for (const recipes of recipeMap.values()) {
        for (const r of recipes) {
            if (r.profession) skills.add(r.profession);
        }
    }
    return Array.from(skills).sort();
}

export function getAvailableItemsWithDetails(): { name: string, icon?: string, skill?: string, level?: number }[] {
    const items = Array.from(recipeMap.keys()).map(name => {
        const recipes = recipeMap.get(name)!;
        const displayRecipe = recipes.reduce((prev, curr) => curr.level < prev.level ? curr : prev, recipes[0]);
        return {
            name,
            icon: iconMap.get(name),
            skill: displayRecipe?.profession,
            level: displayRecipe?.level
        };
    });

    items.sort((a, b) => {
        const levelA = a.level ?? 0;
        const levelB = b.level ?? 0;
        if (levelA !== levelB) {
            return levelA - levelB;
        }
        return a.name.localeCompare(b.name);
    });

    return items;
}

export function getSurveyDetails(surveyName: string): { name: string, icon?: string }[] {
    const outputs = surveyOutputsMap.get(surveyName) || [];
    return outputs.map(name => ({
        name,
        icon: iconMap.get(name)
    }));
}

export function buildCraftingTree(
    itemName: string, 
    targetQuantity: number, 
    nodeIdPrefix: string = "root",
    selectedRecipeIndices: Record<string, number> = {},
    completedNodes: string[] = []
): CraftingNode {
    let availableRecipes = recipeMap.get(itemName);

    // Fallback heuristic for Gorgon-specific recipes like "Drying Box of Beginner's Arrow Shafts" -> "Beginner's Arrow Shafts"
    if (!availableRecipes || availableRecipes.length === 0) {
        const altName = `Drying Box of ${itemName}`;
        availableRecipes = recipeMap.get(altName);
    }

    if (!availableRecipes || availableRecipes.length === 0) {
        // Raw material (no recipe found)
        return {
            id: nodeIdPrefix,
            name: itemName,
            quantity: targetQuantity,
            icon: iconMap.get(itemName),
            isRaw: true,
            isCompleted: completedNodes.includes(nodeIdPrefix),
            obtainingMethods: obtainingMethodsMap[itemName] || []
        };
    }

    const recipeIdx = selectedRecipeIndices[itemName] || 0;
    // Bound check just in case
    const recipe = availableRecipes[Math.min(recipeIdx, availableRecipes.length - 1)];

    // Identify primary result vs byproducts
    let primaryResult = recipe.results.find(r => r.name === itemName);
    if (!primaryResult) primaryResult = recipe.results[0];
    
    let outputQty = primaryResult?.quantity || 1;
    let byproductsRaw = recipe.results.filter(r => r !== primaryResult);
    
    let expectedOutputPerCraft = outputQty;
    let isOutputApproximate = false;

    // Assimilate identical byproducts into the expected yield math, but keep them in the array for UI rendering
    for (const bp of byproductsRaw) {
        if (bp.name === itemName) {
            expectedOutputPerCraft += bp.quantity * (bp.chance || 1.0);
            isOutputApproximate = true;
        }
    }

    // We need to craft `craftsNeeded` times to meet or exceed targetQuantity
    const craftsNeeded = Math.ceil(targetQuantity / expectedOutputPerCraft);
    const actualOutput = Math.floor(craftsNeeded * expectedOutputPerCraft);

    const isCompleted = completedNodes.includes(nodeIdPrefix);

    const children: CraftingNode[] = isCompleted ? [] : recipe.ingredients.map((ing, index) => {
        let reqQty = ing.quantity * craftsNeeded;
        let isApproximate = false;
        
        if (ing.consume_chance !== undefined && ing.consume_chance < 1.0) {
            reqQty = Math.ceil(reqQty * ing.consume_chance);
            isApproximate = true;
        }

        const childNode = buildCraftingTree(
            ing.name, 
            reqQty, 
            `${nodeIdPrefix}-${index}`,
            selectedRecipeIndices,
            completedNodes
        );
        
        if (isApproximate) {
            childNode.isApproximate = true;
        }
        
        return childNode;
    });

    let byproducts = undefined;
    if (byproductsRaw.length > 0) {
        const bpMap = new Map<string, any>();
        
        for (const bp of byproductsRaw) {
            const group = bpMap.get(bp.name) || {
                name: bp.name,
                totalExpectedQuantity: 0,
                isApproximate: false,
                icon: bp.icon,
                details: []
            };
            
            const expectedYield = bp.quantity * (bp.chance || 1.0) * craftsNeeded;
            group.totalExpectedQuantity += expectedYield;
            
            if (bp.chance !== undefined && bp.chance < 1.0) {
                group.isApproximate = true;
            }
            
            group.details.push({
                quantity: bp.quantity * craftsNeeded,
                chance: bp.chance
            });
            
            bpMap.set(bp.name, group);
        }
        
        byproducts = Array.from(bpMap.values());
    }

    const node: CraftingNode = {
        id: nodeIdPrefix,
        name: itemName,
        quantity: actualOutput, // Display the actual amount we will produce
        icon: iconMap.get(itemName),
        profession: recipe.profession,
        level: recipe.level,
        source: recipe.source,
        isRaw: false,
        isCompleted: isCompleted,
        allChildrenCompleted: !isCompleted && children.length > 0 && children.every(c => c.isCompleted || c.allChildrenCompleted),
        children: children,
        availableRecipes: availableRecipes,
        selectedRecipeIdx: Math.min(recipeIdx, availableRecipes.length - 1),
        byproducts
    };

    if (isOutputApproximate) {
        node.isApproximate = true;
    }

    return node;
}
