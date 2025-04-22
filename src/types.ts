export interface HierarchyNode {
	name: string;
	children?: HierarchyNode[];
	value?: number;
}

export interface HierarchyNodeWithData extends d3.HierarchyNode<HierarchyNode> {
	// Add these properties that d3.partition adds but aren't in the type definition
	x0: number;
	x1: number;
	y0: number;
	y1: number;

	// Fields for animation and interaction
	current: {
		x0: number;
		x1: number;
		y0: number;
		y1: number;
	};
	target?: {
		x0: number;
		x1: number;
		y0: number;
		y1: number;
	};
}

export interface DatasetType {
	name: string;
	children: HierarchyNode[];
}