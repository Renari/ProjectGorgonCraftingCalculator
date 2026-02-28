<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Project Gorgon Crafting Calculator" />
  <meta property="og:description" content="An interactive flowchart calculator for Project Gorgon crafting recipes." />
  <meta property="og:image" content={new URL(`${base}/og-image.png`, $page.url).href} />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:title" content="Project Gorgon Crafting Calculator" />
  <meta property="twitter:description" content="An interactive flowchart calculator for Project Gorgon crafting recipes." />
  <meta property="twitter:image" content={new URL(`${base}/og-image.png`, $page.url).href} />
</svelte:head>

{@render children()}
