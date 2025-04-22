# Zoomable Sunburst Visualization

This is a TypeScript implementation of the D3.js Zoomable Sunburst Visualization, converted from an Observable notebook.

## Features

- Interactive zoomable sunburst diagram
- Smooth transitions between hierarchy levels
- Responsive design that works on various screen sizes
- Built with TypeScript for improved type safety and code quality

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Docker (optional, for containerized deployment)

## Local Development

1. Clone the repository:

```bash
git clone <repository-url>
cd zoomable-sunburst
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

This will start a development server at http://localhost:3000 with hot reloading enabled.

## Building for Production

To build the application for production:

```bash
npm run build
```

This will create optimized production files in the `dist` directory.

## Running with Docker

You can easily build and run the application using Docker:

1. Build the Docker image:

```bash
docker build -t zoomable-sunburst .
```

2. Run the Docker container:

```bash
docker run -p 8080:80 zoomable-sunburst
```

3. Open your browser and navigate to http://localhost:8080

## Project Structure

- `src/` - TypeScript source code
  - `index.ts` - Entry point for the application
  - `sunburst.ts` - Main Sunburst visualization implementation
  - `types.ts` - TypeScript type definitions
- `public/` - Static assets
  - `index.html` - HTML template
  - `style.css` - CSS styles
  - `flare-2.json` - Hierarchical data used for the visualization

## How to Use the Visualization

The Zoomable Sunburst diagram shows a hierarchical data structure where:

- Each arc represents a node in the hierarchy
- The center circle represents the root
- Only two levels of the hierarchy are visible at once
- Click on any arc to zoom in and focus on that part of the hierarchy
- Click on the center circle to zoom out one level

## License

This project is based on [D3.js](https://d3js.org/) examples, which are distributed under the [ISC License](https://opensource.org/licenses/ISC).

## Acknowledgements

The original visualization was created by [Observable](https://observablehq.com/) and is based on [D3.js](https://d3js.org/).