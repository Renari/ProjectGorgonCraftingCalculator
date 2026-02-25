<script lang="ts">
  import { onMount } from 'svelte';
  import CraftingFlow from '$lib/components/CraftingFlow.svelte';
  import { getAvailableItemsWithDetails, getAvailableSkills, buildCraftingTree, getSurveyDetails } from '$lib/calculator';
  import { treeToFlowElements } from '$lib/layout';
  import { getIconUrl } from '$lib/utils';
  import type { ObtainingMethod } from '$lib/types';
  import Dagre from '@dagrejs/dagre';

  // State
  type ItemDetail = { name: string, icon?: string, skill?: string, level?: number };

  let availableItems: ItemDetail[] = [];
  let availableSkills: string[] = [];
  let selectedSkillFilter = 'All';
  let sortMode: 'A-Z' | 'Level' = 'A-Z';
  let sortAscending = true;
  let showSkillFilterMenu = false;
  let showSortMenu = false;
  let selectedItem = '';
  let targetQuantity = 1;
  let searchQuery = '';

  let nodes = [];
  let edges = [];

  // Track user-selected variant index for identical-output recipes (e.g. Gold Ore -> Acorns vs Lower level)
  let selectedRecipeIndices: Record<string, number> = {};

  // Modal State
  let showRecipeModal = false;
  let modalItemName = '';
  let modalRecipes: any[] = [];
  let modalCurrentIdx = 0;

  // Obtaining Methods Modal State
  let showObtainModal = false;
  let obtainItemName = '';
  let obtainMethods: ObtainingMethod[] = [];

  $: sortedFilteredItems = (() => {
    let items = availableItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedSkillFilter === 'All' || item.skill === selectedSkillFilter)
    );

    items.sort((a, b) => {
      let comparison = 0;
      if (sortMode === 'Level') {
        const levelA = a.level ?? 0;
        const levelB = b.level ?? 0;
        if (levelA !== levelB) {
          comparison = levelA - levelB;
        } else {
          comparison = a.name.localeCompare(b.name);
        }
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return sortAscending ? comparison : -comparison;
    });

    return items;
  })();

  onMount(() => {
    window.addEventListener('openRecipeModal', handleOpenRecipeModal as EventListener);
    window.addEventListener('openObtainModal', handleOpenObtainModal as EventListener);

    availableItems = getAvailableItemsWithDetails();
    availableSkills = getAvailableSkills();
    
    const savedItem = localStorage.getItem('calc_selectedItem');
    const savedQty = localStorage.getItem('calc_targetQuantity');
    const savedIndices = localStorage.getItem('calc_selectedRecipeIndices');

    if (savedItem && availableItems.some(i => i.name === savedItem)) {
      selectedItem = savedItem;
    } else {
      selectedItem = ''; // No default selection
    }

    if (savedQty) {
      targetQuantity = parseInt(savedQty, 10) || 1;
    }

    if (savedIndices) {
      try {
        selectedRecipeIndices = JSON.parse(savedIndices);
      } catch (e) {
        selectedRecipeIndices = {};
      }
    }

    if (selectedItem) {
      calculate();
    }

    return () => {
      window.removeEventListener('openRecipeModal', handleOpenRecipeModal as EventListener);
      window.removeEventListener('openObtainModal', handleOpenObtainModal as EventListener);
    };
  });

  // Save state tracking
  $: if (typeof window !== 'undefined') {
    if (selectedItem) localStorage.setItem('calc_selectedItem', selectedItem);
    localStorage.setItem('calc_targetQuantity', targetQuantity.toString());
    localStorage.setItem('calc_selectedRecipeIndices', JSON.stringify(selectedRecipeIndices));
  }

  function selectItem(name: string) {
    selectedItem = name;
    // Reset any custom recipe selections when choosing a completely new root target
    selectedRecipeIndices = {};
    calculate();
  }

  function handleOpenRecipeModal(event: CustomEvent) {
    const { itemName, recipes, currentIdx } = event.detail;
    modalItemName = itemName;
    modalRecipes = recipes;
    modalCurrentIdx = currentIdx;
    showRecipeModal = true;
  }

  function selectRecipeFromModal(idx: number) {
    selectedRecipeIndices[modalItemName] = idx;
    showRecipeModal = false;
    calculate();
  }

  function closeRecipeModal() {
    showRecipeModal = false;
  }

  function handleOpenObtainModal(event: CustomEvent) {
    const { itemName, methods } = event.detail;
    obtainItemName = itemName;
    obtainMethods = methods;
    showObtainModal = true;
  }

  function selectObtainMethod(methodName: string) {
    showObtainModal = false;
    selectItem(methodName);
  }

  function closeObtainModal() {
    showObtainModal = false;
  }

  // Simple layout engine using dagre instead of the manual simple one to make it look premium and organized
  function applyDagreLayout(nodesArr, edgesArr) {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 50, edgesep: 50, ranksep: 150 });

    nodesArr.forEach(node => {
      // Calculate dynamic node heights to prevent layout overlap
      let h = 90;
      if (node.data) {
        if (node.data.byproducts && node.data.byproducts.length > 0) {
          h += 30 + (node.data.byproducts.length * 28);
        }
        if (node.data.profession || node.data.isRaw || node.data.obtainingMethods) {
          h += 36;
        }
      }
      g.setNode(node.id, { width: 230, height: h });
    });

    edgesArr.forEach(edge => {
      g.setEdge(edge.source, edge.target);
    });

    Dagre.layout(g);

    return nodesArr.map(node => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        targetPosition: node.targetPosition,
        sourcePosition: node.sourcePosition,
        position: {
          x: nodeWithPosition.x - (nodeWithPosition.width / 2),
          y: nodeWithPosition.y - (nodeWithPosition.height / 2)
        }
      };
    });
  }

  function calculate() {
    if (!selectedItem || targetQuantity < 1) return;
    
    // Pass user's explicit recipe overrides so calculator knows which variant to plot
    const tree = buildCraftingTree(selectedItem, targetQuantity, "root", selectedRecipeIndices);
    const elements = treeToFlowElements(tree);
    
    // We apply dagre for an actual directed acyclic graph layout (tree structure)
    // The simple layout in layout.ts gives x, y, but dagre does it perfectly.
    nodes = applyDagreLayout(elements.nodes, elements.edges);
    edges = elements.edges;
  }
</script>

<div class="app-layout">
  <aside class="sidebar">
    <div class="logo">
      <h1>Project Gorgon</h1>
      <span>Crafting Calculator</span>
    </div>

    <div class="control-group">
      <label for="itemSearch">Item to Craft</label>
      <div class="search-filter-row">
        <input id="itemSearch" type="text" placeholder="Search..." bind:value={searchQuery} />
        
        <div class="filter-dropdown-container">
          <button 
            type="button"
            class="filter-btn" 
            class:active={selectedSkillFilter !== 'All'} 
            on:click={(e) => { e.stopPropagation(); showSortMenu = false; showSkillFilterMenu = !showSkillFilterMenu; }}
            title="Filter by Skill"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
          
          {#if showSkillFilterMenu}
            <div class="filter-menu">
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="filter-option" 
                class:selected={selectedSkillFilter === 'All'} 
                on:click={() => { selectedSkillFilter = 'All'; showSkillFilterMenu = false; }}
              >
                All Skills
              </div>
              {#each availableSkills as skill}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div 
                  class="filter-option" 
                  class:selected={selectedSkillFilter === skill} 
                  on:click={() => { selectedSkillFilter = skill; showSkillFilterMenu = false; }}
                >
                  {skill}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="filter-dropdown-container">
          <button 
            type="button"
            class="filter-btn" 
            class:active={sortMode !== 'A-Z' || !sortAscending} 
            on:click={(e) => { e.stopPropagation(); showSkillFilterMenu = false; showSortMenu = !showSortMenu; }}
            title="Sort Options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
          </button>
          
          {#if showSortMenu}
            <div class="filter-menu sort-menu">
              <div class="filter-header">Sort By</div>
              <div class="sort-toggle-group">
                <button 
                  class="sort-toggle-btn" 
                  class:active={sortMode === 'A-Z'} 
                  on:click={() => { sortMode = 'A-Z'; showSortMenu = false; }}
                >
                  A-Z
                </button>
                <button 
                  class="sort-toggle-btn" 
                  class:active={sortMode === 'Level'} 
                  on:click={() => { sortMode = 'Level'; showSortMenu = false; }}
                >
                  Level
                </button>
              </div>

              <div class="filter-divider"></div>
              <div class="filter-header">Order</div>
              <div class="sort-toggle-group">
                <button 
                  class="sort-toggle-btn" 
                  class:active={sortAscending === true} 
                  on:click={() => { sortAscending = true; showSortMenu = false; }}
                >
                  Asc
                </button>
                <button 
                  class="sort-toggle-btn" 
                  class:active={sortAscending === false} 
                  on:click={() => { sortAscending = false; showSortMenu = false; }}
                >
                  Desc
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="item-list">
      {#each sortedFilteredItems as item}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div 
          class="item-list-row" 
          class:selected={selectedItem === item.name}
          on:click={() => selectItem(item.name)}
        >
          <div class="item-list-main">
            {#if item.icon}
              <img src={getIconUrl(item.icon)} alt={item.name} class="item-list-icon" />
            {/if}
            <span class="item-name">{item.name}</span>
          </div>
          {#if item.skill}
            <span class="item-skill">{item.skill.substring(0, 3)} {item.level}</span>
          {/if}
        </div>
      {/each}
      {#if sortedFilteredItems.length === 0}
        <div class="no-results">No items found.</div>
      {/if}
    </div>

    <div class="control-group">
      <label for="qtyInput">Quantity Required</label>
      <input id="qtyInput" type="number" min="1" max="100000" bind:value={targetQuantity} on:change={calculate} on:keyup={(e) => e.key === 'Enter' && calculate()} />
    </div>

    <div class="info-box">
      <p>Select an item and quantity to see its full raw material breakdown as an interactive flowchart.</p>
    </div>
  </aside>

  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <main class="canvas-area">
    <CraftingFlow initialNodes={nodes} initialEdges={edges} />
  </main>
</div>

<svelte:window on:click={() => { showSkillFilterMenu = false; showSortMenu = false; }} />

{#if showRecipeModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={closeRecipeModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Alternative Recipes for {modalItemName}</h2>
        <button class="close-btn" on:click={closeRecipeModal}>&times;</button>
      </div>
      <div class="modal-body">
        {#each modalRecipes as recipe, idx}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div 
            class="recipe-card" 
            class:active={idx === modalCurrentIdx}
            on:click={() => selectRecipeFromModal(idx)}
          >
            <div class="recipe-card-header">
              <span class="prof">{recipe.profession} Lvl {recipe.level}</span>
              {#if idx === modalCurrentIdx}
                <span class="active-badge">Active</span>
              {/if}
            </div>
            <div class="recipe-ingredients">
              {#each recipe.ingredients as ing}
                <div class="ingredient-row">
                  {#if ing.icon}
                    <img src={getIconUrl(ing.icon)} alt={ing.name} class="ing-icon" />
                  {/if}
                  <span>{ing.name} x{ing.quantity}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

{#if showObtainModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={closeObtainModal}>
    <div class="modal-content obtain-modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Obtaining {obtainItemName}</h2>
        <button class="close-btn" on:click={closeObtainModal}>&times;</button>
      </div>
      <div class="modal-body">
        <p class="obtain-desc">This raw material can be gathered using the following methods:</p>
        <div class="obtain-methods-list">
          {#each obtainMethods as method}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="obtain-card" on:click={() => selectObtainMethod(method.name)}>
              <div class="obtain-card-header">
                <img src={getIconUrl('icon_5305.png')} alt="Map" class="method-icon" />
                <div class="method-info">
                  <span class="prof">Surveying</span>
                  <span class="method-name">{method.name}</span>
                  <div class="method-reqs">
                    {#if method.surveyingLevel}
                      <span class="req survey-req">Surveying Lvl {method.surveyingLevel}</span>
                    {/if}
                    {#if method.miningLevel}
                      <span class="req mining-req">Mining Lvl {method.miningLevel}</span>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="method-outputs">
                <div class="output-items">
                  {#each getSurveyDetails(method.name) as output}
                    <div class="output-item" title={output.name}>
                      {#if output.icon}
                        <img src={getIconUrl(output.icon)} alt={output.name} class="output-icon" />
                      {/if}
                      <span>{output.name}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .app-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  .sidebar {
    width: 320px;
    background: var(--panel-bg);
    border-right: 1px solid var(--border-color);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    z-index: 10;
    backdrop-filter: blur(20px);
    box-shadow: 2px 0 15px rgba(0,0,0,0.5);
  }

  .canvas-area {
    flex-grow: 1;
    position: relative;
  }

  .logo h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 0;
    letter-spacing: -0.5px;
  }
  
  .logo span {
    color: var(--accent);
    font-size: 0.9rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }


  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    width: 450px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
  }
  .modal-header h2 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-main);
  }
  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
  }
  .close-btn:hover { color: #fff; }
  .modal-body {
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .recipe-card {
    background: rgba(22, 27, 34, 0.6);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .recipe-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .recipe-card.active {
    border-color: var(--accent);
    background: rgba(88, 166, 255, 0.1);
  }
  .recipe-card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-weight: bold;
  }
  .recipe-card-header .prof { color: var(--accent); }
  .active-badge {
    background: var(--accent);
    color: #000;
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 12px;
  }
  .ingredient-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--text-main);
    margin-bottom: 4px;
  }
  .ing-icon { width: 20px; height: 20px; border-radius: 4px; }

  /* Obtaining Modal Styles */
  .obtain-modal-content {
    width: 480px;
  }
  
  .obtain-desc {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-top: 0;
    margin-bottom: 8px;
  }

  .obtain-methods-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .obtain-card {
    background: rgba(22, 27, 34, 0.6);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .obtain-card:hover {
    border-color: #58a6ff;
    background: rgba(88, 166, 255, 0.1);
    transform: translateX(4px);
  }

  .obtain-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .method-icon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    background: rgba(0,0,0,0.3);
    padding: 2px;
  }

  .method-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .method-info .prof {
    font-size: 0.75rem;
    color: #58a6ff;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .method-info .method-name {
    font-size: 1rem;
    color: var(--text-main);
    font-weight: 500;
  }

  .method-reqs {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .method-reqs .req {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
  }

  .method-reqs .survey-req {
    color: #58a6ff;
    border: 1px solid rgba(88, 166, 255, 0.3);
  }

  .method-reqs .mining-req {
    color: #ffd33d;
    border: 1px solid rgba(255, 211, 61, 0.3);
  }

  .method-outputs {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: rgba(0, 0, 0, 0.2);
    padding: 8px;
    border-radius: 6px;
  }

  .output-items {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .output-item {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.85rem;
    color: var(--text-main);
  }

  .output-icon {
    width: 16px;
    height: 16px;
    border-radius: 2px;
  }

  .search-filter-row {
    display: flex;
    gap: 8px;
    position: relative;
  }
  
  .search-filter-row input {
    flex-grow: 1;
    min-width: 0;
  }
  
  .filter-dropdown-container {
    position: relative;
    display: flex;
  }

  .filter-btn {
    background: rgba(13, 17, 23, 0.8);
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    padding: 0 12px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    height: 100%;
  }

  .filter-btn:hover {
    color: var(--text-main);
    border-color: var(--accent);
  }

  .filter-btn.active {
    color: var(--accent);
    border-color: rgba(88, 166, 255, 0.5);
    background: rgba(88, 166, 255, 0.1);
  }

  .filter-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 200px;
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    z-index: 100;
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    backdrop-filter: blur(20px);
  }

  .filter-option {
    padding: 8px 16px;
    font-size: 0.9rem;
    color: var(--text-main);
    cursor: pointer;
    transition: all 0.1s;
  }

  .filter-option:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .filter-option.selected {
    color: var(--accent);
    background: rgba(88, 166, 255, 0.1);
  }

  .sort-menu {
    width: 180px;
    padding: 12px;
  }

  .sort-toggle-group {
    display: flex;
    gap: 6px;
    margin: 6px 4px 12px 4px;
  }

  .sort-toggle-btn {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-muted);
    padding: 6px 0;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sort-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-main);
  }

  .sort-toggle-btn.active {
    background: rgba(88, 166, 255, 0.15);
    border-color: rgba(88, 166, 255, 0.4);
    color: var(--accent);
    font-weight: 500;
  }

  .filter-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 8px 0;
  }

  .filter-header {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 2px 4px;
    font-weight: 700;
  }

  input {
    background: rgba(13, 17, 23, 0.8);
    border: 1px solid var(--border-color);
    color: var(--text-main);
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 0.95rem;
    width: 100%;
    outline: none;
    transition: border-color 0.2s;
  }

  input:focus {
    border-color: var(--accent);
  }

  .info-box {
    margin-top: auto;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.5;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .item-list {
    flex-grow: 1;
    overflow-y: auto;
    background: rgba(13, 17, 23, 0.4);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    padding: 6px;
    gap: 2px;
    min-height: 200px;
  }

  .item-list::-webkit-scrollbar {
    width: 6px;
  }
  .item-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .item-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .item-list-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .item-list-main {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .item-list-row:hover .item-list-main {
    color: var(--text-main);
  }

  .item-list-row.selected {
    background: rgba(88, 166, 255, 0.15);
  }

  .item-list-row.selected .item-list-main {
    color: var(--accent);
    font-weight: 500;
  }

  .item-skill {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .item-list-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    border-radius: 4px;
  }

  .no-results {
    padding: 12px;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
