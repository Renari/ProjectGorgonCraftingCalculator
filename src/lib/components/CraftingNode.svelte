<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { Recipe, ByproductGroup } from '../types';
  import { getIconUrl } from '../utils';
  export let data: { id: string, label: string, quantity: number, icon?: string, isRaw: boolean, source?: string, profession?: string, level?: number, availableRecipes?: Recipe[], selectedRecipeIdx?: number, isApproximate?: boolean, obtainingMethods?: string[], byproducts?: ByproductGroup[], isCompleted?: boolean };

  function extractSources(sourceStr?: string) {
    if (!sourceStr) return null;
    let result = { type: 'Source', items: [] as string[] };
    
    if (sourceStr.includes('Training:')) {
      result.type = 'Training';
      result.items = sourceStr.split('Training:').map(s => s.trim()).filter(Boolean);
    } else if (sourceStr.includes('Leveling:')) {
      result.type = 'Leveling';
      result.items = sourceStr.split('Leveling:').map(s => s.trim()).filter(Boolean);
    } else {
      result.items = [sourceStr];
    }
    return result;
  }

  function openRecipeModal(event: Event) {
    const customEvent = new CustomEvent('openRecipeModal', { 
        detail: { 
          itemName: data.label, 
          recipes: data.availableRecipes, 
          currentIdx: data.selectedRecipeIdx 
        },
        bubbles: true,
        composed: true 
    });
    (event.target as HTMLElement).dispatchEvent(customEvent);
  }

  function openObtainModal(event: Event) {
    const customEvent = new CustomEvent('openObtainModal', { 
        detail: { 
          itemName: data.label, 
          methods: data.obtainingMethods 
        },
        bubbles: true,
        composed: true 
    });
    (event.target as HTMLElement).dispatchEvent(customEvent);
  }

  function toggleCompleted(event: Event) {
    const customEvent = new CustomEvent('toggleCompleted', { 
        detail: { 
          id: data.id 
        },
        bubbles: true,
        composed: true 
    });
    (event.target as HTMLElement).dispatchEvent(customEvent);
  }

  $: sourceData = extractSources(data.source);
</script>

<div class="custom-node" class:raw={data.isRaw} class:completed={data.isCompleted}>
  <div class="header">
    {#if data.icon}
      <img src={getIconUrl(data.icon)} alt={data.label} class="icon" />
    {/if}
    <div class="title">{data.label}</div>
    <div class="qty" class:approx={data.isApproximate} title={data.isApproximate ? "Approximated requirement based on calculated yields." : ""}>
      {data.isApproximate ? '≈' : 'x'}{data.quantity}
    </div>
  </div>

  {#if data.byproducts && data.byproducts.length > 0}
    <div class="byproducts">
      <div class="bp-header">Also Produces:</div>
      <div class="bp-list">
        {#each data.byproducts as bpGroup}
          <details class="bp-group">
            <summary class="bp-item bp-summary">
              {#if bpGroup.icon}
                <img src={getIconUrl(bpGroup.icon)} alt={bpGroup.name} class="bp-icon"/>
              {/if}
              <span class="bp-name">{bpGroup.name} <span class="bp-qty" class:approx={bpGroup.isApproximate}>{bpGroup.isApproximate ? '≈' + (bpGroup.totalExpectedQuantity).toFixed(1).replace(/\.0$/, '') : 'x' + Math.floor(bpGroup.totalExpectedQuantity)}</span></span>
            </summary>
            <div class="bp-details-list">
              {#each bpGroup.details as detail}
                <div class="bp-detail-item">
                  <span class="bp-qty" class:approx={detail.chance !== undefined}>x{Math.round(detail.quantity)}</span>
                  {#if detail.chance}
                    <span class="bp-chance" title="{(detail.chance * 100).toFixed(0)}% chance to produce per craft">{(detail.chance * 100).toFixed(0)}%</span>
                  {:else}
                    <span class="bp-chance guaranteed">100%</span>
                  {/if}
                </div>
              {/each}
            </div>
          </details>
        {/each}
      </div>
    </div>
  {/if}
  
  {#if !data.isRaw}
    {#if data.profession}
      <div class="profession-badge">
        <span class="prof">{data.profession}</span>
        {#if data.level !== undefined && data.level > 0}
          <span class="lvl">Lvl {data.level}</span>
        {/if}
      </div>
    {/if}
    {#if sourceData}
      {#if sourceData.type === 'Leveling'}
        <div class="source">Leveling</div>
      {:else}
        <details class="source-details">
          <summary>{sourceData.type}</summary>
          <ul>
            {#each sourceData.items as item}
              <li>{item}</li>
            {/each}
          </ul>
        </details>
      {/if}
    {/if}
  {:else if data.obtainingMethods && data.obtainingMethods.length > 0}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="source obtain-methods" on:click={openObtainModal}>
      🔍 Surveying
    </div>
  {:else}
    <div class="source raw-badge">Raw Material</div>
  {/if}

  {#if data.availableRecipes && data.availableRecipes.length > 1}
    <button class="alt-recipe-btn nodrag" title="Alternative Recipes Available" on:click={openRecipeModal}>
      ⟳
    </button>
  {/if}

  {#if data.id !== 'root'}
    <button class="completion-toggle nodrag" class:active={data.isCompleted} on:click|stopPropagation|preventDefault={toggleCompleted} on:pointerdown|stopPropagation title={data.isCompleted ? "Mark as Incomplete" : "Mark as Already Owned/Completed"}>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
  {/if}

  <Handle id="target-left" type="target" position={Position.Left} />
  <Handle id="source-right" type="source" position={Position.Right} />
</div>

<style>
  .custom-node {
    background: rgba(22, 27, 34, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(48, 54, 61, 0.8);
    border-radius: 8px;
    padding: 12px;
    min-width: 180px;
    color: var(--text-main);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .custom-node:hover {
    border-color: var(--accent);
    box-shadow: 0 0 15px rgba(88, 166, 255, 0.3);
    transform: translateY(-2px);
  }

  .raw {
    border-color: #3fb950;
  }
  
  .raw:hover {
     border-color: #56d364;
     box-shadow: 0 0 15px rgba(86, 211, 100, 0.3);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .qty {
    background: var(--accent);
    color: #000;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
  }

  .raw .qty {
    background: #3fb950;
  }

  .obtain-methods {
    background: rgba(88, 166, 255, 0.15);
    color: #58a6ff;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    display: inline-block;
    border: 1px solid rgba(88, 166, 255, 0.3);
  }

  .obtain-methods:hover {
    background: rgba(88, 166, 255, 0.3);
    border-color: #58a6ff;
  }

  .qty.approx {
    background: #d29922;
    color: #fff;
  }

  .title {
    font-size: 0.95em;
    flex-grow: 1;
  }

  .icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    border-radius: 4px;
  }

  .byproducts {
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bp-header {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .bp-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bp-group {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    overflow: hidden;
  }

  .bp-summary {
    cursor: pointer;
    padding: 4px 6px;
    user-select: none;
    transition: background 0.1s;
    list-style: none; /* Hide default arrow */
  }
  
  .bp-summary::-webkit-details-marker {
    display: none;
  }

  .bp-summary:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .bp-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bp-details-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 6px 6px 32px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .bp-detail-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
  }

  .bp-icon {
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }

  .bp-name {
    color: var(--text-muted);
    font-size: 0.85rem;
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bp-qty {
    color: var(--accent);
    font-weight: 500;
  }
  
  .bp-qty.approx {
    color: #ffd33d;
  }

  .bp-chance {
    color: var(--text-main);
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 12px;
    font-weight: 500;
  }
  
  .bp-chance.guaranteed {
    background: rgba(86, 211, 100, 0.15);
    color: #56d364;
  }

  .profession-badge {
    display: flex;
    justify-content: space-between;
    font-size: 0.75em;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border-color);
  }

  .prof {
    color: var(--accent);
    font-weight: 500;
  }

  .lvl {
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.1);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .source {
    font-size: 0.75em;
    color: var(--text-muted);
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border-color);
    opacity: 0.8;
  }

  .source-details {
    font-size: 0.75em;
    color: var(--text-muted);
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border-color);
  }
  .source-details summary {
    cursor: pointer;
    font-weight: 500;
    color: var(--text-color);
    outline: none;
    user-select: none;
  }
  .source-details summary:hover {
    color: var(--accent);
  }
  .source-details ul {
    margin: 4px 0 0 0;
    padding-left: 16px;
    list-style-type: disc;
  }
  .source-details li {
    margin-bottom: 2px;
  }

  .raw-badge {
    color: #3fb950;
    font-weight: 500;
  }

  .alt-recipe-btn {
    position: absolute;
    left: -12px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent);
    color: #000;
    border: 2px solid #161b22;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    z-index: 10;
    transition: all 0.2s ease;
    padding: 0;
    box-shadow: 0 0 8px rgba(88, 166, 255, 0.4);
  }

  .alt-recipe-btn:hover {
    transform: translateY(-50%) scale(1.15);
    background: #79c0ff;
    box-shadow: 0 0 12px rgba(88, 166, 255, 0.6);
  }

  .custom-node.completed {
    background: rgba(48, 54, 61, 0.4);
    border-color: rgba(48, 54, 61, 0.6);
    opacity: 0.7;
  }
  
  .custom-node.completed .icon,
  .custom-node.completed .source {
    filter: grayscale(100%);
    opacity: 0.6;
  }

  .completion-toggle {
    position: absolute;
    right: -10px;
    top: -10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #161b22;
    color: var(--text-muted);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s ease;
    padding: 0;
  }

  .completion-toggle:hover {
    transform: scale(1.15);
    border-color: #3fb950;
    color: #3fb950;
  }

  .completion-toggle.active {
    background: #3fb950;
    border-color: #3fb950;
    color: #fff;
    box-shadow: 0 0 10px rgba(63, 185, 80, 0.4);
  }
</style>
