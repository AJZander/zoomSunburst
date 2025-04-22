import { ZoomableSunburst } from './sunburst';
import { DatasetType } from './types';

// Reference to current visualization instance for cleanup
let currentVisualization: ZoomableSunburst | null = null;

// Main function to initialize the visualization
async function main(): Promise<void> {
  try {
    // Clean up any existing visualization
    if (currentVisualization) {
      const chartContainer = document.getElementById('chart');
      if (chartContainer) {
        chartContainer.innerHTML = '';
      }
      currentVisualization = null;
    }

    // Fetch the flare-2.json data
    const response = await fetch('flare-2.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data: DatasetType = await response.json();

    // Calculate container width (respecting responsive design)
    const chartContainer = document.getElementById('chart');
    if (!chartContainer) {
      throw new Error('Chart container not found');
    }

    // Get the width of the chart container
    // Use a minimum width to ensure visibility
    const width = Math.min(928, Math.max(300, chartContainer.clientWidth));

    // Initialize the zoomable sunburst
    currentVisualization = new ZoomableSunburst('#chart', width, data);

    console.log('Sunburst visualization initialized successfully');
  } catch (error) {
    console.error('Error initializing sunburst visualization:', error);

    // Display error message to the user
    const chartContainer = document.getElementById('chart');
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div style="color: red; text-align: center; padding: 2rem;">
          <h3>Error loading visualization</h3>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `;
    }
  }
}

// Efficient resize handling with debounce
function debounce(func: Function, wait: number): (...args: any[]) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: any[]): void => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Run the main function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', main);

// Add window resize handling for responsiveness
window.addEventListener('resize', debounce(() => {
  main();
}, 250));

// Add TypeScript declaration for our custom window property
declare global {
  interface Window {
    resizeTimeout: number | ReturnType<typeof setTimeout> | undefined;
  }
}

// Add type augmentation for d3 to include missing properties
declare module 'd3' {
  export interface HierarchyRectangularNode<Datum> extends d3.HierarchyNode<Datum> {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  }
}