<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { Recipe } from '../types';
  
  export let data: { id: string, label: string, quantity: number, icon?: string, isRaw: boolean, source?: string, profession?: string, level?: number, availableRecipes?: Recipe[], selectedRecipeIdx?: number };

  function getIconUrl(iconName?: string) {
    if (!iconName) return '';
    if (iconName.startsWith('http')) return iconName;
    return new URL(`../../assets/${iconName}`, import.meta.url).href;
  }

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

  $: sourceData = extractSources(data.source);
</script>

<div class="custom-node" class:raw={data.isRaw}>
  <div class="header">
    {#if data.icon}
      <img src={getIconUrl(data.icon)} alt={data.label} class="icon" />
    {/if}
    <div class="title">{data.label}</div>
    <div class="qty">x{data.quantity}</div>
  </div>
  
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
  {/if}

  {#if data.isRaw}
     <div class="source raw-badge">Raw Material</div>
  {/if}

  {#if data.availableRecipes && data.availableRecipes.length > 1}
    <button class="alt-recipe-btn" title="Alternative Recipes Available" on:click={openRecipeModal}>
      ⟳
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
    border-color: #3fb950; /* Green tint for raw materials */
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
</style>
