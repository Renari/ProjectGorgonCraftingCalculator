<script lang="ts">
  import { SvelteFlow, Controls, Background, BackgroundVariant, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import CustomNode from './CraftingNode.svelte';
  import FitViewHandler from './FitViewHandler.svelte';

  const nodeTypes = {
    craftingNode: CustomNode
  };

  export let initialNodes: Node[] = [];
  export let initialEdges: Edge[] = [];

  // Use reactivity to update the flow when props change
  $: nodes = initialNodes.map(n => ({ ...n, type: 'craftingNode' }));
  $: edges = initialEdges;

  type RawTotal = { label: string, icon?: string, quantity: number };

  // Compute total raw materials directly from nodes
  $: rawTotals = Array.from(
    nodes
      .filter((n: any) => n.data?.isRaw)
      .reduce((acc: Map<string, RawTotal>, n: any) => {
        const item = acc.get(n.data.label) || { label: n.data.label, icon: n.data.icon, quantity: 0 };
        item.quantity += n.data.quantity;
        return acc.set(n.data.label, item);
      }, new Map<string, RawTotal>())
      .values()
  ) as RawTotal[];

  function getIconUrl(iconName?: string) {
    if (!iconName) return '';
    if (iconName.startsWith('http')) return iconName;
    return new URL(`../../assets/${iconName}`, import.meta.url).href;
  }
</script>

<div class="flow-wrapper">
  {#if nodes.length > 0}
    <SvelteFlow {nodes} {edges} {nodeTypes} fitView minZoom={0.2} maxZoom={4} colorMode="dark">
      <Background variant={BackgroundVariant.Dots} gap={24} size={2} patternColor="rgba(255,255,255,0.05)" />
      <Controls />
      <FitViewHandler nodesLength={nodes.length} />
    </SvelteFlow>
    
    {#if rawTotals.length > 0}
      <div class="totals-bar">
        <div class="totals-header">Total Raw Materials Required</div>
        <div class="totals-list">
          {#each rawTotals as total}
            <div class="total-item">
              {#if total.icon}
                <img src={getIconUrl(total.icon)} alt={total.label} class="total-icon" />
              {/if}
              <span class="total-label">{total.label}</span>
              <span class="total-qty">x{total.quantity}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <h2>Select an item to craft</h2>
      <p>The crafting tree will appear here.</p>
    </div>
  {/if}
</div>

<style>
  .flow-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    background: #06090f;
  }

  .empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--text-muted);
  }

  .empty-state h2 {
    color: var(--text-main);
    font-weight: 300;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .totals-bar {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(13, 17, 23, 0.85); /* Slightly transparent dark panel */
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 12px 24px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    max-width: 90%;
  }

  .totals-header {
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 600;
  }

  .totals-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
  }

  .total-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.05);
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .total-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    border-radius: 4px;
  }

  .total-label {
    font-size: 0.9em;
    font-weight: 500;
  }

  .total-qty {
    background: #3fb950;
    color: #000;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8em;
    font-weight: 600;
  }
</style>
