export const getParentWithDepth = (d, depth) => {
	let parent = d.parent;
	while(parent && parent.depth > depth)
		parent = parent.parent;
	return depth === parent?.depth ? parent : null;
};