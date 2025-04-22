import * as d3 from 'd3';
import { DatasetType, HierarchyNodeWithData } from './types';

// Define HierarchyNode type based on your data structure
type HierarchyNode = d3.HierarchyNode<DatasetType>;

export class ZoomableSunburst {
	private width: number;
	private height: number;
	private radius: number;
	private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private color: d3.ScaleOrdinal<string, string>;
	private arc: d3.Arc<any, any>;
	private data: DatasetType;
	// Initialize properties that will be defined in initialize()
	private root!: HierarchyNodeWithData;
	private path!: d3.Selection<Element, HierarchyNodeWithData, any, any>;
	private label!: d3.Selection<Element, HierarchyNodeWithData, any, any>;
	private parent!: d3.Selection<SVGCircleElement, HierarchyNodeWithData, any, any>;

	constructor(selector: string, width: number, data: DatasetType) {
		this.width = width;
		this.height = width;
		this.radius = width / 6;
		this.data = data;

		// Create the color scale
		this.color = d3.scaleOrdinal<string>()
			.domain(data.children.map(d => d.name))
			.range(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

		// Create the SVG container
		this.svg = d3.select(selector)
			.append("svg")
			.attr("viewBox", [-width / 2, -this.height / 2, width, width])
			.style("font", "10px sans-serif") as d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;

		// Create the arc generator
		this.arc = d3.arc<any, any>()
			.startAngle(d => d.x0)
			.endAngle(d => d.x1)
			.padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
			.padRadius(this.radius * 1.5)
			.innerRadius(d => d.y0 * this.radius)
			.outerRadius(d => Math.max(d.y0 * this.radius, d.y1 * this.radius - 1));

		// Initialize the visualization
		this.initialize();
	}

	private initialize(): void {
		// Compute the layout
		const hierarchy = d3.hierarchy(this.data)
			.sum(d => (d as any).value || 0)
			.sort((a, b) => ((b as any).value || 0) - ((a as any).value || 0));

		// Cast the result of partition to HierarchyNodeWithData
		this.root = d3.partition<DatasetType>()
			.size([2 * Math.PI, hierarchy.height + 1])(hierarchy) as unknown as HierarchyNodeWithData;

		// Initialize current state for each node
		this.root.each(d => {
			(d as HierarchyNodeWithData).current = {
				x0: (d as HierarchyNodeWithData).x0,
				x1: (d as HierarchyNodeWithData).x1,
				y0: (d as HierarchyNodeWithData).y0,
				y1: (d as HierarchyNodeWithData).y1
			};
		});

		// Append the arcs
		this.path = this.svg.append("g")
			.selectAll<Element, HierarchyNodeWithData>("path")
			.data(this.root.descendants().slice(1))
			.join("path")
			.attr("fill", d => {
				let node = d;
				while (node.depth > 1) {
					node = node.parent!;
				}
				return this.color(node.data.name);
			})
			.attr("fill-opacity", d => this.arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
			.attr("pointer-events", d => this.arcVisible(d.current) ? "auto" : "none")
			.attr("d", d => this.arc(d.current));

		// Make arcs clickable if they have children
		this.path.filter((d: HierarchyNodeWithData) => !!d.children)
			.style("cursor", "pointer")
			.on("click", (event: MouseEvent, d: HierarchyNodeWithData) => this.clicked(event, d));

		// Append titles for accessibility
		const format = d3.format(",d");
		this.path.append("title")
			.text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value ?? 0)}`);

		// Append the labels
		this.label = this.svg.append("g")
			.attr("pointer-events", "none")
			.attr("text-anchor", "middle")
			.style("user-select", "none")
			.selectAll<Element, HierarchyNodeWithData>("text")
			.data(this.root.descendants().slice(1))
			.join("text")
			.attr("dy", "0.35em")
			.attr("fill-opacity", d => +this.labelVisible(d.current))
			.attr("transform", d => this.labelTransform(d.current))
			.text(d => d.data.name);

		// Append the center circle (for zooming out)
		this.parent = this.svg.append("circle")
			.datum(this.root)
			.attr("r", this.radius)
			.attr("fill", "none")
			.attr("pointer-events", "all")
			.on("click", (event, d) => this.clicked(event, d));
	}

	private clicked(event: MouseEvent, p: HierarchyNodeWithData): void {
		this.parent.datum(p.parent || this.root);

		this.root.each(d => {
			d.target = {
				x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
				x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
				y0: Math.max(0, d.y0 - p.depth),
				y1: Math.max(0, d.y1 - p.depth)
			};
		});

		const t = this.svg.transition().duration(event.altKey ? 7500 : 750);

		// Transition the data on all arcs
		this.path.transition(t as any)
			.tween("data", d => {
				const i = d3.interpolate(d.current, d.target!);
				return (t: number) => d.current = i(t);
			})
			.filter(function (d) {
				// Use 'this' bound to the SVG element and our object method
				return !!(+this.getAttribute("fill-opacity")!);
			})
			.attr("fill-opacity", d => this.arcVisible(d.target!) ? (d.children ? 0.6 : 0.4) : 0)
			.attr("pointer-events", d => this.arcVisible(d.target!) ? "auto" : "none")
			.attrTween("d", (d) => {
				const interpolate = d3.interpolate(d.current, d.target!);
				// Use an arrow function to preserve 'this'
				return (t: number) => {
					const interpolated = interpolate(t);
					// Call the arc generator with the interpolated data
					return (this.arc(interpolated) ?? "") as string;
				};
			});

		// Transition the labels
		this.label.filter(function (d) {
			// Use 'this' bound to the SVG element and our object method
			return !!(+this.getAttribute("fill-opacity")!);
		})
			.transition(t as any)
			.attr("fill-opacity", d => +this.labelVisible(d.target!))
			.attrTween("transform", d => () => this.labelTransform(d.current));
	}

	private arcVisible(d: { y0: number, y1: number, x0: number, x1: number }): boolean {
		return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
	}

	private labelVisible(d: { y0: number, y1: number, x0: number, x1: number }): boolean {
		return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
	}

	private labelTransform(d: { y0: number, y1: number, x0: number, x1: number }): string {
		const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
		const y = (d.y0 + d.y1) / 2 * this.radius;
		return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
	}
}