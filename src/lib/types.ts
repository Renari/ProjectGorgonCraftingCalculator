export interface RecipeIngredient {
    name: string;
    quantity: number;
    icon?: string;
    consume_chance?: number;
}

export interface RecipeResult {
    name: string;
    quantity: number;
    icon?: string;
}

export interface Recipe {
    profession: string;
    level: number;
    ingredients: RecipeIngredient[];
    results: RecipeResult[];
    source: string;
}

export interface CraftingNode {
    id: string;
    name: string;
    quantity: number;
    icon?: string;
    profession?: string;
    level?: number;
    source?: string;
    isRaw: boolean;
    children?: CraftingNode[];
    availableRecipes?: Recipe[];
    selectedRecipeIdx?: number;
    isApproximate?: boolean;
    obtainingMethods?: string[];
}
