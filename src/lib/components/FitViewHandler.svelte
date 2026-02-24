<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';
  
  export let nodesLength = 0;
  
  const { fitView } = useSvelteFlow();
  
  $: if (nodesLength > 0) {
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 50);
  }
</script>
