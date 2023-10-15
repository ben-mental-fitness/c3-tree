import * as d3 from 'd3';

export const radialTreeLineFunction = d3.linkRadial()
	.source((d) => {
		const x = d.source.x;
		const y = d.source.y + (d.source.parent ? (d.source.parent.y - d.source.y) * 0.7 : 0);
		if(d.source.depth === 1)
			return { x: x, y: y / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) * 60 }
		else
			return { x: x, y: y }
	})
	.target((d) => ({
		x: d.target.x,
		y: d.target.y + (d.target.parent && d.target.children ? (d.target.parent.y - d.target.y) * 0.7 : 0),
	}))
	.angle((d) => d.x)
	.radius((d) => d.y);

export const connectedEdgesLineFunction = d3.lineRadial()
	.curve(d3.curveBundle.beta(0.9))
	.radius((d) => d.y)
	.angle((d) => d.x);

export const separationFunction = (a, b) => {
	if((a.parent && !a.parent.data.visible) && (b.parent && !b.parent.data.visible))
		return 0.05;
	else if(!a.data.visible && !b.data.visible) 
		return a.parent?.parent === b.parent?.parent ? 0.2 : 2;
	else if(!a.data.visible || !b.data.visible)
		return a.parent?.parent === b.parent?.parent ? 0.5 : 1;
	else
		return a.parent == b.parent ? 2 : 3;
};