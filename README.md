# Project Gorgon Crafting Calculator

An interactive, visual flowchart calculator for crafting recipes in the MMORPG [Project Gorgon](https://projectgorgon.com/). This application shows recipes in a dynamic node-based tree, allowing players to easily understand the full raw material requirements and multi-step processes for complex crafts.

![Crafting Flowchart Preview](static/og-image.png)

## Features

- **Dynamic Flowcharts**: Visualizes complex crafting chains (e.g., Alchemy, Fletching, Cooking) using SvelteFlow.
- **Recursive Material Calculation**: Automatically calculates the base raw materials needed for intermediate nested outputs.
- **Live Search & Filtering**: Quickly find specific recipes by name or filter by entirely by crafting skill.

## Tech Stack

- **Frontend**: SvelteKit, TypeScript, SvelteFlow (for diagramming), Dagre (for auto-layout).

## Getting Started

### Prerequisites
- Node.js (v18+)

### Running Locally

1. Clone the repository and navigate into the directory.
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173/`.
