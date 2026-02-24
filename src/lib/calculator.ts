import type { Recipe, CraftingNode } from './types';
import recipesData from './recipes.json';
import obtainingData from './obtaining_methods.json';

const recipes: Recipe[] = recipesData as Recipe[];
const obtainingMethodsMap: Record<string, string[]> = obtainingData as Record<string, string[]>;

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
for (const [item, surveys] of Object.entries(obtainingMethodsMap)) {
    for (const survey of surveys) {
        if (!surveyOutputsMap.has(survey)) {
            surveyOutputsMap.set(survey, []);
        }
        surveyOutputsMap.get(survey)!.push(item);
    }
}

export function getAvailableItems(): string[] {
    return Array.from(recipeMap.keys()).sort();
}

export function getAvailableItemsWithDetails(): { name: string, icon?: string }[] {
    return Array.from(recipeMap.keys()).sort().map(name => ({
        name,
        icon: iconMap.get(name)
    }));
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
    selectedRecipeIndices: Record<string, number> = {}
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
            obtainingMethods: obtainingMethodsMap[itemName] || []
        };
    }

    const recipeIdx = selectedRecipeIndices[itemName] || 0;
    // Bound check just in case
    const recipe = availableRecipes[Math.min(recipeIdx, availableRecipes.length - 1)];

    const outputQty = recipe.results[0]?.quantity || 1;
    
    // We need to craft `craftsNeeded` times to meet or exceed targetQuantity
    const craftsNeeded = Math.ceil(targetQuantity / outputQty);
    const actualOutput = craftsNeeded * outputQty;

    const children: CraftingNode[] = recipe.ingredients.map((ing, index) => {
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
            selectedRecipeIndices
        );
        
        if (isApproximate) {
            childNode.isApproximate = true;
        }
        
        return childNode;
    });

    return {
        id: nodeIdPrefix,
        name: itemName,
        quantity: actualOutput, // Display the actual amount we will produce
        icon: iconMap.get(itemName),
        profession: recipe.profession,
        level: recipe.level,
        source: recipe.source,
        isRaw: false,
        children,
        availableRecipes: availableRecipes,
        selectedRecipeIdx: Math.min(recipeIdx, availableRecipes.length - 1)
    };
}
