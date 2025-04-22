import * as d3 from 'd3';
import { DatasetType, HierarchyNodeWithData } from './types';

export class ZoomableSunburst {
	private width: number;
	private height: number;
	private radius: number;
	private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private color: d3.ScaleOrdinal<string, string>;
	private arc: d3.Arc<any, any>;
	private data: DatasetType;
	private format = d3.format(",d"); // Move format here for reuse
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
			.sum(d => {
				// Ensure value is properly calculated for all nodes
				return typeof (d as any).value === "number" ? (d as any).value : 0;
			})
			.sort((a, b) => (b.value || 0) - (a.value || 0));

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
				// Find the top-level ancestor to determine color
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

		// Append titles for accessibility and tooltips
		this.path.append("title")
			.text(d => {
				const ancestorNames = d.ancestors().map(d => d.data.name).reverse().join("/");
				return `${ancestorNames}\n${this.format(d.value || 0)}`;
			});

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
		// Update parent to clicked node's parent, or root if clicking center
		this.parent.datum(p.parent || this.root);

		// Calculate new target positions for all nodes
		this.root.each(d => {
			d.target = {
				x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
				x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
				y0: Math.max(0, d.y0 - p.depth),
				y1: Math.max(0, d.y1 - p.depth)
			};
		});

		// Create transition with appropriate duration
		const t = this.svg.transition().duration(event.altKey ? 7500 : 750);

		// Transition the data on all arcs, even the ones that aren't visible,
		// so that if this transition is interrupted, entering arcs will start
		// the next transition from the desired position.
		this.path.transition(t as any)
			.tween("data", d => {
				const i = d3.interpolate(d.current, d.target!);
				return (t: number) => d.current = i(t);
			});

		// Update fill-opacity and pointer-events during transition
		this.path.transition(t as any)
			.filter(function (d) {
				// Include arcs that are either currently visible or will be visible
				return !!(+this.getAttribute("fill-opacity")! || (d.target && d.target.y1 <= 3 && d.target.y0 >= 1));
			})
			.attr("fill-opacity", d => this.arcVisible(d.target!) ? (d.children ? 0.6 : 0.4) : 0)
			.attr("pointer-events", d => this.arcVisible(d.target!) ? "auto" : "none");

		// Update the arc paths during transition
		this.path.transition(t as any)
			.attrTween("d", d => {
				const interpolate = d3.interpolate(d.current, d.target!);
				return (t: number) => {
					const interpolated = interpolate(t);
					return this.arc(interpolated) || "";
				};
			});

		// Transition the labels
		this.label.transition(t as any)
			.filter(function (d) {
				// Include labels that are either currently visible or will be visible
				return !!(+this.getAttribute("fill-opacity")! || (d.target && d.target.y1 <= 3 && d.target.y0 >= 1));
			})
			.attr("fill-opacity", d => +this.labelVisible(d.target!))
			.attrTween("transform", d => {
				const interpolate = d3.interpolate(d.current, d.target!);
				return (t: number) => this.labelTransform(interpolate(t));
			});
	}

	private arcVisible(d: { y0: number, y1: number, x0: number, x1: number }): boolean {
		// An arc is visible if it's within the view boundaries and has a non-zero angle
		return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
	}

	private labelVisible(d: { y0: number, y1: number, x0: number, x1: number }): boolean {
		// A label is visible if it's within the view boundaries and the arc is large enough to fit text
		return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
	}

	private labelTransform(d: { y0: number, y1: number, x0: number, x1: number }): string {
		// Calculate the position and rotation for the label
		const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
		const y = (d.y0 + d.y1) / 2 * this.radius;
		return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
	}
}