<script type="text/javascript">
	import * as d3 from 'd3';

	import { onMount } from 'svelte';

	import introJs from 'intro.js';
	import 'intro.js/minified/introjs.min.css';

	// menu
	import { Hamburger } from 'svelte-hamburgers';

    import Menu from './Menu.svelte';

    let open;
	// menu

	const introTourSteps = [{
			element: '#main-viz-wrapper',
			intro: ''
		},
		{
			element: '#main-transform',
			intro: 'This is the main visualization. Research themes are displayed with their papers in a hierarchy.'
		},
		{
			element: '#main-transform .text-leaf-interact-area',
			intro: 'Each leaf represents a research paper. These can be clicked to gain additional information.'
		},
		{
			element: '#main-transform .node-group',
			intro: 'Each node is connected according to their relation - a theme may have subthemes or papers, a subtheme has papers. These can be clicked to toggle their visibility.'
		},
		{
			element: '#controls-wrapper',
			intro: 'Here are some additional settings for the visualization.'
		},
	]

	const startIntroTour = () => {
		introJs().start();

		document.querySelector("#main-viz-wrapper").appendChild(document.querySelector(".introjs-overlay"));
		document.querySelector("#main-viz-wrapper").appendChild(document.querySelector(".introjs-helperLayer"));
		document.querySelector("#main-viz-wrapper").appendChild(document.querySelector(".introjs-tooltipReferenceLayer"));
	};

	//
	// config
	//

	const colors = ["#8C88BA", "#BF84AE", "#DB95AC", "#FBB9A6", "#F6A294", "#B0DBEA", "#B3E5BE", "#CFC69D"];
	const animDurationIn = 750;
	const animDurationOut = 400;
	const margin = {
		top: 90,
		right: 90,
		bottom: 90,
		left: 90,
	}

	const brainAspectRatio = 0.822;
	const brainSize = 0.5;

	//
	//
	//

	let simplifiedMode = true;
	let secondTooltip = null;

	let checkboxesChecked = {
	};

	let data;
	let dataSimplified;
	let introData;
	let presets;
	let header;
	let rawData;
	let visibleTeams = [];
	let metaData;
	let root;
	let rootSimplified;
	let twist = 0;
	let selectedNode = undefined;

	let mode = null;
	let width  = null;
	let height = null;
	let canvasWidth = null;
	let canvasHeight = null;
	let tooltipWidth = 800;
	let radius = null;
	let outerRadius = null;

	//
	// show / hide parts
	//

	const showWelcomeDialog = () => {
		d3.select("#welcome-dialog")
			.style("opacity", 0.0)
			.style("display", "block");
		d3.selectAll("#welcome-dialog")
			.transition("opacity")
			.duration(animDurationOut)
			.ease(d3.easeQuadOut)
			.style("opacity", 1.0);
	}

	const hideWelcomeDialog = () => {
		d3.selectAll("#welcome-dialog")
			.transition("opacity")
			.duration(animDurationOut)
			.ease(d3.easeQuadOut)
			.style("opacity", 0.0);
		d3.selectAll("#welcome-dialog")
			.transition("display")
			.delay(animDurationOut)
			.style("display", "none");
	};

	const showMainViz = () => {

		showLoader();
		hideWelcomeDialog();
		checkShowDisplayCompatability();

		d3.select("#tabs-wrapper")
			.transition("opacity")
			.duration(animDurationOut)
			.ease(d3.easeQuadOut)
			.style("opacity", 0.0);

		setTimeout(() => {

			d3.select("#main-viz-wrapper")
				.style("display", "block");

			updateLeafTextAppearence();

			setTimeout(() => {
				hideLoader();
				d3.select("#main-viz-wrapper")
					.transition("opacity")
					.duration(animDurationIn)
					.ease(d3.easeQuadOut)
					.style("opacity", 1.0);
				d3.select("#tabs-wrapper")
					.transition("display")
					.delay(animDurationIn)
					.style("display", "none");
			}, 1000);

		}, animDurationOut);
		
	};

	const showSimplifiedVersion = () => {

		hideWelcomeDialog();
		checkShowDisplayCompatability();

		d3.select("#main-viz-wrapper")
			.style("display", "none")
			.transition("opacity")
			.duration(animDurationOut)
			.ease(d3.easeQuadOut)
			.style("opacity", 0.0);
		d3.select("#tabs-wrapper")
			.style("display", "block")
			.transition("opacity")
			.duration(animDurationIn)
			.ease(d3.easeQuadOut)
			.style("opacity", 1.0);
		d3.select("#main-viz-wrapper")
			.transition("display")
			.delay(animDurationIn)
			.style("display", "none")
			
	};

	//
	// utils
	//

	const showLoader = () => {
		d3.select("#loader").style("display", "block");
	}

	const hideLoader = () => {
		d3.select("#loader").style("display", "none");
	}

	const updateLeafTextAppearence = async (d, line, node) => {

		d3.selectAll("#node-group-wrapper .node-text-1st-line")
			.each(function(d) {
				let text = d.data.text;
				d3.select(this).text(text);
				let computedTextLength = d3.select(this).node().getComputedTextLength();
				while(computedTextLength > 70) {
					text = `${text.slice(0,-5)}`;
					d3.select(this).text(text);
					computedTextLength = d3.select(this).node().getComputedTextLength();
					d.data.textLength = text.length;
				}
			});
		d3.selectAll("#node-group-wrapper .node-text-2nd-line")
			.each(function(d) {
				let text = d.data.text.substr(d.data.textLength);
				d3.select(this).text(text);
				let computedTextLength = d3.select(this).node().getComputedTextLength();
				while(computedTextLength > 70) {
					text = `${text.slice(0,-5)}...`;
					d3.select(this).text(text);
					computedTextLength = d3.select(this).node().getComputedTextLength();
				}
			});

		d3.selectAll("#node-group-simplified-wrapper .node-text-1st-line")
			.each(function(d) {
				let text = d.data.text.substr(d.data.textLength);
				d3.select(this).text(text);
				let computedTextLength = d3.select(this).node().getComputedTextLength();
				while(computedTextLength > 150) {
					text = `${text.slice(0,-5)}...`;
					d3.select(this).text(text);
					computedTextLength = d3.select(this).node().getComputedTextLength();
				}
			});
	}

	const checkShowDisplayCompatability = () => {
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
		const isPortraitView = window.innerWidth < window.innerHeight;

		if(isMobile) {
			//d3.select("#min-width-dialog .please-desktop").style("display", null);
			//d3.select("#min-width-dialog .please-maximize").style("display", "none");
			//d3.select("#min-width-dialog").style("display", "block");
		} else if(isPortraitView) {
			d3.select("#min-width-dialog .please-maximize").style("display", null);
			d3.select("#min-width-dialog .please-desktop").style("display", "none");
			d3.select("#min-width-dialog").style("display", "block");
		}
	}

	const getParentWithDepth = (d, depth) => {
		let parent = d.parent;
		while(parent && parent.depth > depth)
			parent = parent.parent;
		return depth === parent?.depth ? parent : null;
	};

	const setTreeVisibility = (d, visible) => {
		d.visible = visible;
		if(d.children?.length > 0) 
			d.children.map((child) => setTreeVisibility(child, visible));
	};

	const addSVGTextLineBreaks = (text, maxWidth, dy, lineHeight) => {
		const y = text.attr("y");
		const words = text.text().split(/\s+/).reverse();

		let word;
		let line = [];
		let tspan = text
			.text(null)
			.append("tspan")
			.attr("x", 0)
			.attr("y", y)
			.attr("dy", `${dy}em`)
			.attr("data-initial-dy", dy);
		let lineCount = 1;

		while ((word = words.pop())) {
			line.push(word);
			tspan.text(line.join(" "));
			if (line.length > 1 && tspan.node() && tspan.node().getComputedTextLength() > maxWidth) {
				line.pop();
				tspan.text(line.join(" "));
				line = [word];
				tspan = text
					.append("tspan")
					.attr("x", 0)
					.attr("y", y)
					.attr("dy", `${lineHeight}em`)
					.attr("data-initial-dy", lineHeight)
					.text(word);
				lineCount += 1;
			}
		}

		return lineCount;
	};

	//
	// presets dropdown
	//

	const initializePresetsDropdown = (presets) => {
		d3.select("#preset-select")
			.style("display", "block")
			.selectAll("option")
			.data(["No preset (all visible)", ...presets])
			.join("option")
			.attr("value", (d) => d)
			.text((d) => d);

		d3.select("#preset-select")
			.on("change", (event) => {
				const chosenPreset = event.target.value;
				if(chosenPreset === "No preset (all visible)") {
					root.descendants().forEach((d) => d.data.visible = d.depth > 0);
				} else {
					root.descendants().forEach((d) => d.data.visible = false);
					root.descendants().forEach((d) => {
						if(d.data.presets.includes(chosenPreset) && d.depth > 0) {
							d.data.visible = d.depth > 0;
							let parent = d.parent;
							while(parent) {
								parent.data.visible = parent.depth > 0;
								parent = parent.parent;
							}
						}
					})
				}
				rerenderTree();
			});
	};

	//
	// math function definitions
	//

	const radialTreeLineFunction = d3.linkRadial()
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

	const connectedEdgesLineFunction = d3.lineRadial()
		.curve(d3.curveBundle.beta(0.9))
		.radius((d) => d.y)
		.angle((d) => d.x);

	const separationFunction = (a, b) => {
		if((a.parent && !a.parent.data.visible) && (b.parent && !b.parent.data.visible))
			return 0.05;
		else if(!a.data.visible && !b.data.visible) 
			return a.parent?.parent === b.parent?.parent ? 0.2 : 2;
		else if(!a.data.visible || !b.data.visible)
			return a.parent?.parent === b.parent?.parent ? 0.5 : 1;
		else
			return a.parent == b.parent ? 2 : 3;
	};



	

	const nodeOnClick = (d) => {
		if("Members" in d.data.props.info_main) {
			if(visibleTeams.indexOf(d.data.text) !== -1) {
				visibleTeams.splice(visibleTeams.indexOf(d.data.text, 1));
			} else {
				visibleTeams.push(d.data.text);
			}
			rebuildTree();
		} else {
			setTreeVisibility(d.data, !d.data.visible);
			rerenderTree();
		}
	}


	const rerenderTree = async (animated = true) => {

		if(!root || !rootSimplified) return;

		d3.select("#controls-wrapper").style("opacity", simplifiedMode ? "0.0" : "1.0")

		twist = twist > Math.PI * 2.0 ? twist - Math.PI * 2.0 : twist;
		twist = twist < 0 ? twist + Math.PI * 2.0 : twist;

		const treeFunction = d3.cluster().size([2 * Math.PI, radius]);
		treeFunction.separation(separationFunction)(root);
		treeFunction.separation(separationFunction)(rootSimplified);

		const animation = d3.transition().duration(animated ? 750 : 0).ease(d3.easeQuadOut);

		// curves from center to leaves
		//d3.selectAll(".center-to-leaf-path").remove();


		d3.select("#twist-circle")
			.transition(animation)
			.attr("opacity", checkboxesChecked["checkbox-twist-circle"] && !simplifiedMode ? 1.0 : 0.0)
			
			.style("pointer-events", checkboxesChecked["checkbox-twist-circle"] && !simplifiedMode ? "visibleStroke" : "none")
		d3.selectAll("#twist-circle-small-g *")
			.transition(animation)
			.attr("opacity", checkboxesChecked["checkbox-twist-circle"] || simplifiedMode ? 0.0 : 1.0)
			.style("pointer-events", checkboxesChecked["checkbox-twist-circle"] ? "none" : "visibleStroke")

		d3.select("#main-transform")
			.attr("transform", `translate(${canvasWidth / 2.0},${canvasHeight / 2.0}) rotate(${(twist) * 180 / Math.PI})`);

		d3.select("#curves-wrapper-center")
			.transition(animation)
			.attr("opacity",  !simplifiedMode && mode === "viz-select-0" ? 1.0 : 0.0)
		d3.select("#curves-wrapper-simplified")
			.transition(animation)
			.attr("opacity",  simplifiedMode ? 1.0 : 0.0)

		const curvesCenterUpdate = d3.select("#curves-wrapper-center")
			.selectAll(".center-to-leaf-path")
			.data(root.links())
			.call((update) => {
				update.transition(animation)
					.attr("d", radialTreeLineFunction)
					.attr("stroke", (d) => d.target.data.color)
					.attr("stroke-width", 1.5)
					.attr("opacity", (d) => d.source.data.visible/* && d.target.data.visible*/ ? 1.0 : 0.0)
			});

		d3.select("#curves-wrapper-leaves")
			.transition(animation)
			.attr("opacity",  !simplifiedMode && mode === "viz-select-1" ? 1.0 : 0.0);
		d3.select("#curves-wrapper-leaves")
			.selectAll(".leaf-to-leaf-path")
			.data(root.leaves().flatMap((leaf) => {
				return root.leaves().filter(
					(d) => d.data.props.data_source === leaf.data.props.data_source && d !== leaf).map(
					(d) => [leaf, d]);
			}))
			.call((update) => {
				update.transition(animation).attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)))
				.attr("opacity", (d) => d[0].data.visible && d[1].data.visible ? 0.1 : 0.0);
			});

		d3.select("#outer-node-group-wrapper")
			.transition(animation)
			.attr("opacity",  !simplifiedMode ? 1.0 : 0.0)
		d3.select("#outer-node-group-wrapper")
			.selectAll(".outer-node-group")
			.transition(animation)
			.attr("class", "outer-node-group")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${radius + 130},0)`)
			.attr("opacity", (d) => d.data.visible ? 1 : 0)
			.style("pointer-events", (d) => d.data.visible && !simplifiedMode ? "all" : "none")

		d3.selectAll("#node-group-wrapper .node-group")
			.data(root.descendants())
			.call((update) => {
				update.transition(animation)
					.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) 
					translate(${d.depth === 1 ? 55 : d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`)

				update.selectAll(".node-text")
					.attr("x", (d) => {
						let angle = d.x + twist;
						angle = angle > Math.PI * 2.0 ? angle - Math.PI * 2.0 : angle < 0 ? angle + Math.PI * 2.0 : angle;
						return angle < Math.PI ? 12 : -12;
					})
					.attr("text-anchor", (d) => {
						let angle = d.x + twist;
						angle = angle > Math.PI * 2.0 ? angle - Math.PI * 2.0 : angle < 0 ? angle + Math.PI * 2.0 : angle;
						return angle < Math.PI ? "start" : "end";
					})
					.attr("transform", (d) => {
						let angle = d.x + twist;
						angle = angle > Math.PI * 2.0 ? angle - Math.PI * 2.0 : angle < 0 ? angle + Math.PI * 2.0 : angle;
						return `rotate(${angle >= Math.PI ? 180 : 0})`;
					})

				update.selectAll(".node-text").transition(animation)
					.attr("opacity", (d) => (d.data.depth > 2 || d.data.depth === d.data.maxDepth) && (d.data.visible || d.parent?.data.visible) && checkboxesChecked["checkbox-leaf-titles"] && !simplifiedMode && !d.children ? 1.0 : 0.0)

				update.selectAll(".text-leaf-interact-area")
					.style("pointer-events", (d) => d.data.visible && !simplifiedMode ? "all" : "none");

			});
		d3.selectAll("#node-group-wrapper .node-circle")
			.transition(animation)
			.attr("opacity", (d) => mode === "viz-select-0" && !simplifiedMode && (d.data.visible || d.parent?.data.visible || d.parent?.data.id === "r") ? 1.0 : 0.0);

		console.log(d3.selectAll("#node-group-wrapper .node-interact-area"));
		d3.selectAll("#node-group-wrapper .node-interact-area")
			.style("pointer-events", !simplifiedMode && d3.select("#viz-select").node().value === "0" ? "all" : "none")

		d3.selectAll("#node-group-simplified-wrapper .node-group-simplified")
			.data(rootSimplified.descendants())
			.call((update) => {
				update.transition(animation)
					.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) 
					translate(${d.depth === 1 ? 55 : d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`)

				update.selectAll(".node-text")
					.attr("x", (d) => {
						let angle = d.x + twist;
						angle = angle > Math.PI * 2.0 ? angle - Math.PI * 2.0 : angle < 0 ? angle + Math.PI * 2.0 : angle;
						return angle < Math.PI ? 12 : -12;
					})
					.attr("text-anchor", (d) => {
						let angle = d.x + twist;
						angle = angle > Math.PI * 2.0 ? angle - Math.PI * 2.0 : angle < 0 ? angle + Math.PI * 2.0 : angle;
						return angle < Math.PI ? "start" : "end";
					})
					.attr("transform", (d) => {
						let angle = d.x + twist;
						angle = angle > Math.PI * 2.0 ? angle - Math.PI * 2.0 : angle < 0 ? angle + Math.PI * 2.0 : angle;
						return `rotate(${angle >= Math.PI ? 180 : 0})`;
					})

				update.selectAll(".node-text").transition(animation)
					.attr("opacity", (d) => d.data.depth === 2 && checkboxesChecked["checkbox-leaf-titles"] && simplifiedMode && !d.children ? 1.0 : 0.0)

				update.selectAll(".text-leaf-interact-area")
					.style("pointer-events", (d) => simplifiedMode ? "all" : "none");

			});
		d3.selectAll("#node-group-simplified-wrapper .node-circle")
			.transition(animation)
			.attr("opacity", (d) => simplifiedMode ? 1.0 : 0.0);


		d3.select("#category-labels-wrapper")
			.selectAll(".category-labels")
			.data(simplifiedMode ? rootSimplified.descendants().filter((d) => d.depth === 1) : root.descendants().filter((d) => d.depth === 1))
			.transition(animation)
			.attr("transform", (d, i) => {
				const angle = d.x;
				return `rotate(${angle * 180 / Math.PI - 90}) 
				translate(${radius + 200},0)
				rotate(${(-angle - twist) * 180 / Math.PI + 90}) `;

			})
			.attr("text-anchor", (d, i) => {
				let angle = twist + d.x;
				angle = angle > Math.PI * 2.0 ? angle - Math.PI * 2.0 : angle < 0 ? angle + Math.PI * 2.0 : angle;
				return angle < Math.PI ? "start" : "end"
			})
			.attr("dominant-baseline", "middle")
			.attr("font-size", "20px")
			.attr("font-weight", "bold")
			.attr("opacity", (d) => d.data.visible ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
	};



	const createCollapsableRadialTree = (data, separationFunction, radius) => {

		root = d3.hierarchy(data);
		rootSimplified = d3.hierarchy(dataSimplified);

		const treeFunction = d3.cluster().size([2 * Math.PI, radius]);
		treeFunction.separation(separationFunction)(root);
		treeFunction.separation(separationFunction)(rootSimplified);

		d3.select("body")
			.on("click", (event) => {

				if(!d3.select("#sticky-tooltip").empty()) {
					d3.selectAll(`path[data-connection-data-source="${selectedNode.data.props.data_source}"]`) // modular: selectedNode
						.attr("stroke", "#d0d0d0");
					selectedNode = undefined;
					d3.select("#sticky-tooltip").remove();
				}
			});

		d3.select("#d3-canvas").selectAll("*").remove();
		const svg = d3.select("#d3-canvas")
			.attr("opacity", 1.0)
			.attr("viewBox", [0, 0, canvasWidth, canvasHeight])
			.attr("width", canvasWidth)
			.attr("height", canvasHeight)
			.attr("font-family", "sans-serif")
			.attr("font-size", 10)
			.append("g")
			.attr("id", "main-transform")
			//.attr("transform", `translate(${canvasWidth / 2.0},${canvasHeight / 2.0}) rotate(-70)`);
			.attr("transform", `translate(${canvasWidth / 2.0},${canvasHeight / 2.0})`);

		// center image
		d3.select("#d3-canvas")
			.append("image")
			.attr("id", "center-image")
			.attr("opacity", checkboxesChecked["checkbox-image"] ? 1.0 : 0.0)
			.attr("href", "/center_logo.png")
			.attr("width", radius * brainSize)
			.attr("height", radius * brainSize * brainAspectRatio)
			.style("pointer-events", "all")
			.style("cursor", "pointer")
			.attr("transform", `translate(
				${width / 2.0 - radius * brainSize / 2.0},
				${height / 2.0 - radius * brainSize / 2.0 * brainAspectRatio})`)
			.on("click", (event) => {
				simplifiedMode = !simplifiedMode;
				rerenderTree();
			});


		// legend

		const legendWrapper = d3.select("#d3-canvas").append("g")
			.attr("class", "legend-wrapper")

		if(canvasWidth < canvasHeight) {
			const margin = (canvasHeight - canvasWidth) / 2.0;
			legendWrapper
				.attr("transform", `translate(
					${canvasWidth - 150},
					${margin + canvasWidth - 80})`)
		} else {
			const margin = (canvasWidth - canvasHeight) / 2.0;
			legendWrapper
				.attr("transform", `translate(
					${margin + canvasHeight - 150},
					${canvasHeight - 80})`)
		}

		legendWrapper.append("rect")
			.attr("width", 165)
			.attr("height", 115)
			.attr("x", -20)
			.attr("y", -40)
			.attr("fill", "transparent")
			.attr("stroke", "#d0d0d0")
			.attr("stroke-width", 1);
		legendWrapper.append("text")
			.attr("fill", "#d0d0d0")
			.text("Legend")
			.attr("dominant-baseline", "middle")
			.attr("text-anchor", "left")
			.attr("font-size", "120%")
			.attr("x", 15)
			.attr("y", -20)

		legendWrapper.append("circle")
			.attr("fill", "#202020")
			.attr("r", "4");
		legendWrapper.append("text")
			.attr("fill", "#202020")
			.text("Published / Accepted")
			.attr("dominant-baseline", "middle")
			.attr("text-anchor", "left")
			.attr("font-size", "120%")
			.attr("x", 15)

		legendWrapper.append("circle")
			.attr("transform", "translate(0,20)")
			.attr("fill", "transparent")
			.attr("stroke", "#202020")
			.attr("stroke-width", "2")
			.attr("r", "4");
		legendWrapper.append("circle")
			.attr("transform", "translate(0,20)")
			.attr("fill", "#202020")
			.attr("r", "2");
		legendWrapper.append("text")
			.attr("fill", "#202020")
			.text("Submitted")
			.attr("dominant-baseline", "middle")
			.attr("text-anchor", "left")
			.attr("font-size", "120%")
			.attr("x", 15)
			.attr("y", 20);

		legendWrapper.append("circle")
			.attr("transform", "translate(0,40)")
			.attr("fill", "transparent")
			.attr("stroke", "#202020")
			.attr("stroke-width", "2")
			.attr("r", "4");
		legendWrapper.append("text")
			.attr("fill", "#202020")
			.text("Manuscript")
			.attr("dominant-baseline", "middle")
			.attr("text-anchor", "left")
			.attr("font-size", "120%")
			.attr("x", 15)
			.attr("y", 40);

		legendWrapper.append("circle")
			.attr("transform", "translate(0,60)")
			.attr("fill", "#202020")
			.attr("r", "2");
		legendWrapper.append("text")
			.attr("fill", "#202020")
			.text("Unkown")
			.attr("dominant-baseline", "middle")
			.attr("text-anchor", "left")
			.attr("font-size", "120%")
			.attr("x", 15)
			.attr("y", 60);




		// research questions text in the corners (currently only works with 4)
		svg.append("g")
			.attr("id", "category-labels-wrapper")
			.selectAll(".category-labels")
			.data(root.descendants().filter((d) => d.depth === 1))
			.join("text")
			.attr("class", (d) => "category-labels")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) 
				translate(${radius + 100},0)
				rotate(${-d.x * 180 / Math.PI + 90}) `)
			/*.attr("transform", (d, i) => `translate(
			${[0,3].includes(i) ? canvasWidth / 2.0 - radius : canvasWidth / 2.0 + radius},
			${[0,1].includes(i) ? margin.top : canvasHeight - margin.bottom})`)*/
			.attr("text-anchor", (d) => d.x < Math.PI ? "start" : "end")
			.attr("dominant-baseline", "middle")
			.attr("font-size", "20px")
			.attr("font-weight", "bold")
			.attr("opacity", 1.0)
			.attr("fill", (d) => d.data.color)
			.text((d) => d.data.text)
			.each(function(d) {
				addSVGTextLineBreaks(d3.select(this), canvasWidth / 2 - radius - 80, 0, 1.0)
			});

		// curves from center to leaves
		svg.append("g")
			.attr("id", "curves-wrapper-center")
			.attr("fill", "none")
			.attr("opacity", 0.0)
			.selectAll(".center-to-leaf-path")
			.data(root.links())
			.join("path")
			.attr("class", "center-to-leaf-path")
			.attr("d", radialTreeLineFunction)
			.attr("stroke", (d) => d.target.data.color)
			.attr("stroke-width", 1.5)
			.attr("opacity", (d) => d.source.data.depth > 0 ? 1.0 : 0.0);

		// curves from center to leave (simplified version)
		svg.append("g")
			.attr("id", "curves-wrapper-simplified")
			.attr("fill", "none")
			.attr("opacity", 0.0)
			.selectAll(".center-to-leaf-path")
			.data(rootSimplified.links())
			.join("path")
			.attr("class", "center-to-leaf-path")
			.attr("d", radialTreeLineFunction)
			.attr("stroke", (d) => d.target.data.color)
			.attr("stroke-width", 1.5)
			.attr("opacity", (d) => d.source.data.depth > 0 ? 1.0 : 0.0);

		// curves from leaf to leaf (connected edges)
		const leaves = root.leaves();
		svg.append("g")
			.attr("id", "curves-wrapper-leaves")
			.attr("fill", "none")
			.attr("opacity", 0.0)
			.selectAll("path")
			.data(leaves.flatMap((leaf) => {
				return leaves.filter(
					(d) => d.data.props.data_source === leaf.data.props.data_source && d !== leaf).map(
					(d) => [leaf, d]);
				}))
			.join("path")
			.attr("class", "leaf-to-leaf-path")
			.attr("data-connection-data-source", (d) => `${d[0].data.props.data_source}`)
			.attr("fill", "tansparent")
			.attr("stroke", "#d0d0d0")
			.attr("stroke-width", 1.0)
			.attr("opacity", 0.5)
			.attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)));


		const outerNodes = svg.append("g")
			.attr("id", "outer-node-group-wrapper")
			.selectAll(".outer-node-group")
			.data(root.descendants().filter((d) => d.children && d3.sum(d.children.map((child) => child.children !== undefined ? 1 : 0)) === 0))
			.join("g")
			.attr("class", "outer-node-group")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${radius + 130},0)`)

		outerNodes.append("circle")
			.attr("fill", (d) => d.data.color)
			.attr("r", 10)
			.style("cursor", "pointer")

		// texts (leaves etc.)
		const node = svg.append("g")
			.attr("id", "node-group-wrapper")
			.selectAll(".node-group")
			.data(root.descendants())
			.join("g")
			.attr("class", "node-group")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`);

		node.append("text")
			.attr("class", "node-text node-text-1st-line")
			.attr("id", (d) => `${d.data.id}-text`)
			.attr("dy", "0")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			.attr("opacity", (d) => d.data.depth > 2 ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
			.attr("font-size", "10px")
			.style("pointer-events", "none")
			.each(function(d) { updateLeafTextAppearence(d, 1, this); });
		node.append("text")
			.attr("class", "node-text node-text-2nd-line")
			.attr("id", (d) => `${d.data.id}-text-2nd-line`)
			.attr("dy", "1em")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			.attr("opacity", (d) => d.data.depth > 2 ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
			.attr("font-size", "10px")
			.style("pointer-events", "none")
			.each(function(d) { updateLeafTextAppearence(d, 2, this); });
		node.filter((d) => !d.children).append("rect")
			.attr("class", "text-leaf-interact-area")
			.attr("fill", "transparent")
			.attr("opacity", 0.5)
			.attr("y", -10)
			.attr("width", 70)
			.attr("height", 30)
			.style("cursor", "pointer")

		// texts (leaves etc.)
		const nodeSimplified = svg.append("g")
			.attr("id", "node-group-simplified-wrapper")
			.selectAll(".node-group-simplified")
			.data(rootSimplified.descendants())
			.join("g")
			.attr("class", "node-group-simplified")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`);

		nodeSimplified.append("text")
			.attr("class", "node-text node-text-1st-line")
			.attr("id", (d) => `${d.data.id}-text`)
			.attr("dy", "0")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			.attr("opacity", (d) => d.data.depth === 2 ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
			.attr("font-size", "10px")
			.style("pointer-events", "none")
			.each(function(d) { updateLeafTextAppearence(d, 1, this); });
		nodeSimplified.filter((d) => !d.children).append("rect")
			.attr("class", "text-leaf-interact-area")
			.attr("fill", "transparent")
			.attr("opacity", 0.5)
			.attr("y", -10)
			.attr("width", 150)
			.attr("height", 30)
			.style("cursor", "pointer")


		d3.selectAll(".text-leaf-interact-area,.outer-node-group,.category-labels")
			.on("click", (event, d) => {
				event.stopPropagation();
				if(!d3.select("#sticky-tooltip").empty()) d3.select("#sticky-tooltip").remove();

				let createSticky = true;

				if(d.depth === 1) {
					d3.select("#hover-tooltip .table-main .tooltip-tbody").selectAll("*").remove();
					const themeDescRow = d3.select("#hover-tooltip .table-main .tooltip-tbody").append("tr");
					themeDescRow.append("td")
						.append("p")
						.style("white-space", "pre-wrap")
						.text(d.data.props.themeDescLong);
				} else if("Members" in d.data.props.info_main && false) {
					if(visibleTeams.indexOf(d.data.text) !== -1) {
						visibleTeams.splice(visibleTeams.indexOf(d.data.text, 1));
					} else {
						visibleTeams.push(d.data.text);
					}

					createSticky = false;
					rebuildTree();
				}

				if(createSticky) {
					const boundingRect = d3.select("#hover-tooltip.tooltip").node().getBoundingClientRect();
					const pointerPos = [event.pageX, event.pageY];
					let left = event.pageX + tooltipWidth >= width - 20 ? event.pageX - tooltipWidth - 10 : event.pageX + 10;
					let top = event.pageY + boundingRect.height >= height - 20 ? event.pageY - boundingRect.height - 10 : event.pageY + 10;

					if(left < 5) left = 5;
					if(top < 5) top = 5;

					const stickyTooltip = d3.select("#hover-tooltip.tooltip").clone(true)
						.attr("id", "sticky-tooltip")
						.style("display", "block")
						.style("left", `${left}px`)
						.style("top", `${top}px`)
						.style("pointer-events", "all")
						.style("cursor", "move")
						.style("z-index", "99")
						.on("mousedown", (event) => {
							event.stopPropagation();
							event.preventDefault();
							let startPointerPos = [event.pageX, event.pageY];
							let startPos = [
								parseInt(d3.select("#sticky-tooltip").style("left")),
								parseInt(d3.select("#sticky-tooltip").style("top"))
							];
							const boundingRect = d3.select("#sticky-tooltip").node().getBoundingClientRect();
							const tooltipHeight = boundingRect.height;
							d3.select("body")
								.on("mousemove.dragTooltip", (event) => {
									let pointerPos = [event.pageX, event.pageY];
									let deltaX = pointerPos[0] - startPointerPos[0];
									let deltaY = pointerPos[1] - startPointerPos[1];
									if(startPos[0] + deltaX > width - tooltipWidth) {
										deltaX = (width - tooltipWidth) - startPos[0];
									} else if(startPos[0] + deltaX < 0) {
										deltaX = - startPos[0];
									}
									if(startPos[1] + deltaY > height - tooltipHeight) {
										deltaY = (height - tooltipHeight) - startPos[1];
									} else if(startPos[1] + deltaY < 0) {
										deltaY = - startPos[1];
									}

									d3.select("#sticky-tooltip")
									.style("left", `${startPos[0] + deltaX}px`)
									.style("top", `${startPos[1] + deltaY}px`)
								})
								.on("mouseup.dragTooltip,mouseleave.dragTooltip", (event) => {
									d3.select("body")
									.on("mousemove.dragTooltip", null)
									.on("mouseup.dragTooltip,mouseleave.dragTooltip", null);
								});
						})
						.on("click", (event) => {
							event.stopPropagation();
						});

					d3.select("#hover-tooltip.tooltip").style("display", "none")
					stickyTooltip.style("pointer-events", "all");
					stickyTooltip.select(".tooltip-close-button")
						.style("display", "block")
						.on("click", () => {
							if(selectedNode !== undefined) {
								d3.selectAll(`path[data-connection-data-source="${selectedNode.data.props.data_source}"]`)
								.attr("stroke", "#d0d0d0");
								selectedNode = undefined;
							}
							d3.select("#sticky-tooltip").remove()
						});
					stickyTooltip.select(".tooltip-bottom-note").remove();

					let collapsed = true;
					d3.select("#sticky-tooltip .tooltip-collapsible-button").on("click", (event) => {
						event.stopPropagation();
						if(collapsed) {
							d3.select("#sticky-tooltip .tooltip-collapsible-button path").transition("rotate").duration(200).ease(d3.easeQuadOut)
								.attr("transform", "translate(256,256) rotate(180) translate(-256,-256)");
							d3.select("#sticky-tooltip .table-collapsed .tooltip-tbody").style("display", null);

							const boundingRect = d3.select("#sticky-tooltip.tooltip").node().getBoundingClientRect();
							const top = boundingRect.top + boundingRect.height > height ? height - boundingRect.height : boundingRect.top;
							d3.select("#sticky-tooltip.tooltip")
								.style("top", `${top}px`);

						} else {
							d3.select("#sticky-tooltip .tooltip-collapsible-button path").transition("rotate").duration(200).ease(d3.easeQuadOut)
								.attr("transform", "translate(256,256) rotate(90) translate(-256,-256)");
							d3.select("#sticky-tooltip .table-collapsed .tooltip-tbody").style("display", "none");
						}

						collapsed = !collapsed;
					});

					d3.select("#sticky-tooltip .button-publication-link")
						.on("click", (event) => {
							event.stopPropagation();
							window.open(d.data.props.publication_link);
						})

					if(selectedNode !== undefined) {
						d3.selectAll(`path[data-connection-data-source="${selectedNode.data.props.data_source}"]`)
							.attr("stroke", "#d0d0d0");
					}
					selectedNode = d;
					d3.selectAll(`path[data-connection-data-source="${selectedNode.data.props.data_source}"]`)
						.attr("stroke", "#2652F4")
						.raise();
				}
			})
			.on("mouseover", (event, d) => {

				const pointerPos = [event.pageX, event.pageY];
				d3.select("#hover-tooltip .table-main .tooltip-tbody").selectAll("*").remove();
				if(d.depth > 1) {
					const topic = getParentWithDepth(d, 1);
					d3.select("#hover-tooltip .tooltip-title")
						//.text(d.data.text)
						.text(`TOPIC: ${topic.data.text}`);


					const topicRow = d3.select("#hover-tooltip .table-main .tooltip-tbody").append("tr");
					/*topicRow.append("td").style("width", `${tooltipWidth * 0.2}px`)
						.append("p")
						.style("font-weight", "bold")
						.text("")*/
					topicRow.append("td").style("text-align", "left")
						.append("p")
						.style("font-weight", "bold")
						.text(d.data.text);

					/*const researchQuestion = getParentWithDepth(d, 2);
					const researchQuestionRow = d3.select("#hover-tooltip .tooltip-tbody").append("tr");
					researchQuestionRow.append("td").style("width", `${tooltipWidth * 0.2}px`)
					.append("p")
					.style("font-weight", "bold")
					.text("Research Question")
					researchQuestionRow.append("td").append("p").text(researchQuestion.data.text);
					const subquestion = getParentWithDepth(d, 3);
					if(subquestion) {
					const subquestionRow = d3.select("#hover-tooltip .tooltip-tbody").append("tr");
					subquestionRow.append("td").style("width", `${tooltipWidth * 0.2}px`)
					.append("p")
					.style("font-weight", "bold")
					.text("Subquestion")
					subquestionRow.append("td").append("p").text(subquestion.data.text);
					}*/


					Object.entries(d.data.props.info_main).forEach(([key, value]) => {
						if(value && Array.isArray(value)) {
							const mainInfoRow = d3.select("#hover-tooltip .table-main .tooltip-tbody");
							let row = undefined;
							value.forEach((member, i) => {
								if(member.photo_filename) {

									row = mainInfoRow.append("tr")
									row.append("td")
										.style("padding-bottom", "1px")
										.append("img")
										.attr("src", `./img/${member.photo_filename}`)
										.style("width", `${tooltipWidth * 0.35}px`);
									let infoCell = row.append("td")
										.style("padding-bottom", "1px");

									infoCell.append("p")
										.style("font-size", "100%")
										.style("font-weight", "bold")
										.style("margin-bottom", "15px")
										.text(member.name);
									infoCell.append("p")
										.style("font-size", "100%")
										.text(member.description);

									if(member.member_link) {

										infoCell.append("a")
											.style("font-size", "100%")
											.style("margin-top", "15px")
											.style("display", "block")
											.style("text-transform", "initial")
											.attr("target", "_blank")
											.attr("href", member.member_link)
											.text(member.member_link_name)

									}

								} else {
									if(i % 5 === 0) 
										row = mainInfoRow.append("tr") 
									row.append("td")
										.style("padding-bottom", "1px")
										.append("p")
										.style("font-size", "60%")
										.text(member.name);
									
								}
							});
						} else if(value && value !== "") {
							const mainInfoRow = d3.select("#hover-tooltip .table-main .tooltip-tbody");
							mainInfoRow.append("tr").append("td").style("width", `${tooltipWidth * 0.2}px`)
								.append("p")
								.style("font-weight", "bold")
								.text(key)
							mainInfoRow.append("tr").append("td")
								.style("padding-bottom", "5px")
								.append("p")
								.text(value);
						}
					});
				} else {
					const topic = d;
					d3.select("#hover-tooltip .tooltip-title")
						//.text(d.data.text)
						.text(`TOPIC: ${topic.data.text}`);


					const themeDescRow = d3.select("#hover-tooltip .table-main .tooltip-tbody");
					themeDescRow.append("tr").append("td")
						.append("p")
						.style("white-space", "pre-wrap")
						.text(topic.data.props.themeDescShort);
				}

				if(d.data.props.publication_link)
					d3.select("#hover-tooltip .button-publication-link").style("display", null).style("pointer-events", "all");
				else 
					d3.select("#hover-tooltip .button-publication-link").style("pointer-events", "none").style("display", "none");

				d3.select("#hover-tooltip .table-collapsed .tooltip-tbody").style("display", "none").selectAll("*").remove();
				let collapsibleInfo = false;
				Object.entries(d.data.props.info_collapsed).forEach(([key, value]) => {
					if(value && value !== "") {
						collapsibleInfo = true;
						const collapsedInfoRow = d3.select("#hover-tooltip .table-collapsed .tooltip-tbody");
						collapsedInfoRow.append("tr").append("td").style("width", `${tooltipWidth * 0.2}px`)
							.append("p")
							.style("font-weight", "bold")
							.text(key)
						collapsedInfoRow.append("tr").append("td")
							.style("padding-bottom", "5px")
							.append("p")
							.text(value);
					}
				});
				if(!collapsibleInfo)
					d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "none").style("pointer-events", "none");
				else
					d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "block").style("pointer-events", "all");

				if(selectedNode === undefined) {
					d3.selectAll(`#${d.data.id}-text,#${d.data.id}-text-2nd-line`).style("font-weight", "bold");
					d3.selectAll(`path[data-connection-data-source="${d.data.props.data_source}"]`)
						.attr("stroke", "#2652F4")
						.raise();
				}
			})
			.on("mousemove", (event, d) => {
				//if(d3.select("#sticky-tooltip").empty()) {
				const boundingRect = d3.select("#hover-tooltip.tooltip").node().getBoundingClientRect();
				const pointerPos = [event.pageX, event.pageY];


				if(mode === "viz-select-0") {
					//const left = event.pageX + tooltipWidth >= width - 20 ? event.pageX - tooltipWidth - 10 : event.pageX + 10;
					//const top = event.pageY + boundingRect.height >= height - 20 ? event.pageY - boundingRect.height - 10 : event.pageY + 10;
					let left = event.pageX;
					let top = event.pageY;

					if(left + tooltipWidth >= width - 20)
						left -= left + tooltipWidth - (width - 20)
					if(left < 20)
						left -= (left - 20);
					if(top + boundingRect.height >= height - 20)
						top -= top + boundingRect.height - (height - 20)
					if(top < 20)
						top -= (top - 20);

					d3.select("#hover-tooltip.tooltip")
						.style("left", `${left}px`)
						.style("top", `${top}px`)
						.style("display", secondTooltip || d3.select("#sticky-tooltip").empty() ? "block" : "none")
						.raise();
				} else {
					let left = event.pageX + 10;
					let top = event.pageY + 10;
					const xOffset = pointerPos[0] < width / 2.0 
					? (radius - pointerPos[0]) - tooltipWidth 
					: pointerPos[0] - radius;
					const y = (top - height / 2.0) / (outerRadius);
					let x = Math.sqrt(1 - Math.pow(y, 2)) * outerRadius;

					if(pointerPos[0] < width / 2.0)
						left = x * -1.0 + width / 2.0 - tooltipWidth;
					else
						left = x + width / 2.0;

					if(left + tooltipWidth >= width - 20)
						left -= left + tooltipWidth - (width - 20);
					if(left < 20)
						left -= (left - 20);
					if(top + boundingRect.height >= height - 20)
						top -= top + boundingRect.height - (height - 20)
					if(top < 20)
						top -= (top - 20);

					d3.select("#hover-tooltip.tooltip")
						//.style("left", `${pointerPos[0] + xOffset + 10}px`)
						.style("left", `${left}px`)
						.style("top", `${pointerPos[1] + 10}px`)
						.style("display", secondTooltip || d3.select("#sticky-tooltip").empty() ? "block" : "none")
						.raise();
				}
			})
			.on("mouseleave", (event, d) => {
				d3.select("#hover-tooltip.tooltip").style("display", "none");
				d3.selectAll(`#${d.data.id}-text,#${d.data.id}-text-2nd-line`).style("font-weight", null);
				if(selectedNode === undefined) {
					d3.selectAll(`path[data-connection-data-source="${d.data.props.data_source}"]`)
					.attr("stroke", "#d0d0d0");
				}
			});

		// leaf nodes
		node.append("circle")
			.attr("class", "node-circle")
			.attr("fill", (d) => d.data.color)
			.attr("r", (d) => d.data.props.status === "Accepted" || d.data.props.status === "Published" ? 4 : d.data.props.status === "Manuscript" ? 0 : 2)
			//.attr("opacity", (d) => d.children ? 0.0 : 1.0)
			.attr("transform", "translate(4,0)")
			.attr("opacity", (d) => d.depth === 0 ? 0.0 : 1.0);

		node.filter((d) => d.data.props.status).append("circle")
			.attr("class", "node-circle")
			.attr("fill", "transparent")
			.attr("stroke", (d) => d.data.color)
			.attr("stroke-width", 2)
			//.attr("opacity", (d) => d.children ? 0.0 : 1.0)
			.attr("opacity", (d) => d.depth === 0 ? 0.0 : 1.0)
			.attr("transform", "translate(4,0)")
			.attr("r", (d) => 4);

		node.filter((d) => d.depth !== 0 && d.children).append("circle")
			.attr("class", "node-interact-area")
			.attr("fill", "transparent")
			.attr("opacity", 1.0)
			.attr("r", 8)
			.style("pointer-events", !simplifiedMode && d3.select("#viz-select").node().value === "0" ? "all" : "none")
			.style("cursor", "pointer")
			.attr("transform", "translate(4,0)")
			.on("mouseover", function(event, d) {
				d3.select(this).attr("stroke-width", "2").attr("stroke", "#d0d0d0");
			})
			.on("mouseleave", function(event, d) {
				d3.select(this).attr("stroke-width", "0").attr("stroke", "transparent");
			})
			.on("click", (event, d) => nodeOnClick(d));

		if(d3.select("#viz-select").node().value === "0") {
			d3.selectAll("#curves-wrapper-center").attr("opacity", 1.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 0.0);
		} else {
			d3.selectAll("#curves-wrapper-center").attr("opacity", 0.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 1.0);
		}

		svg.append("circle")
			.attr("id", "twist-circle")
			.attr("r", outerRadius)
			.attr("fill", "none")
			.attr("stroke", "#e0e0e0")
			.attr("stroke-width", 10)
			.style("pointer-events", !simplifiedMode ? "visibleStroke" : "none")
			.style("cursor", "grab")
			.on("mousedown.twistCircle", (event) => {
				const startX = canvasWidth / 2.0 - event.clientX;
				const startY = canvasHeight / 2.0 - event.clientY;
				let lastAngle = Math.atan2(startX, startY);

				d3.select("body")
					.on("mousemove.twistCircle", (event) => {
						const x = canvasWidth / 2.0 - event.clientX;
						const y = canvasHeight / 2.0 - event.clientY;
						const angle = Math.atan2(x, y);

						const deltaAngle = lastAngle - angle;
						twist += deltaAngle;
						lastAngle = angle;

						rerenderTree(false);
					})
					.on("mouseleave.twistCircle,mouseup.twistCircle", (event) => {
						d3.select("body")
							.on("mousemove.twistCircle", null)
							.on("mouseleave.twistCircle", null)
							.on("mouseup.twistCircle", null);
					})
					.on("mouseup", (event) => {
						d3.select("body")
							.on("mousemove.twistCircle", null)
							.on("mouseleave.twistCircle", null)
							.on("mouseup.twistCircle", null);
					});
			});

		const twistCircleSmallX = canvasWidth / 2.0 + outerRadius;
		const twistCircleSmallY = canvasHeight / 2.0 + outerRadius;
		const twistCircleSmall = d3.select("#d3-canvas").append("g").attr("id", "twist-circle-small-g")
		twistCircleSmall.append("polygon")
			.attr("id", "twist-circle-small-triangle")
			.attr("points", "50 15, 100 100, 0 100")
			.attr("fill", "transparent")
			.attr("fill", "none")
			.attr("stroke", "#e0e0e0")
			.attr("stroke-width", 10)
			.attr("transform", `
				translate(${twistCircleSmallX},${twistCircleSmallY})
				scale(0.7,0.7) translate(${- 50},${- 15 - 85 / 2.0 - 11})`);
		twistCircleSmall.append("circle")
			.attr("id", "twist-circle-small")
			.attr("transform", `translate(${twistCircleSmallX},${twistCircleSmallY})`)
			.attr("r", 50)
			.attr("fill", "none")
			.attr("stroke", "#e0e0e0")
			.attr("stroke-width", 10)
			.style("pointer-events", "visibleStroke")
			.style("cursor", "grab")
			.on("mousedown.twistCircle", (event) => {
				const startX = twistCircleSmallX - event.clientX;
				const startY = twistCircleSmallY - event.clientY;
				let lastAngle = Math.atan2(startX, startY);

				d3.select("body")
					.on("mousemove.twistCircle", (event) => {
						const x = twistCircleSmallX - event.clientX;
						const y = twistCircleSmallY - event.clientY;
						const angle = Math.atan2(x, y);

						const deltaAngle = lastAngle - angle;
						twist += deltaAngle;
						lastAngle = angle;

						twistCircleSmall.attr("transform", `translate(${twistCircleSmallX},${twistCircleSmallY}) rotate(${twist * 180 / Math.PI}) translate(${-twistCircleSmallX},${-twistCircleSmallY})`)

						rerenderTree(false);
					})
					.on("mouseleave.twistCircle,mouseup.twistCircle", (event) => {
						d3.select("body")
							.on("mousemove.twistCircle", null)
							.on("mouseleave.twistCircle", null)
							.on("mouseup.twistCircle", null);
					})
					.on("mouseup", (event) => {
						d3.select("body")
							.on("mousemove.twistCircle", null)
							.on("mouseleave.twistCircle", null)
							.on("mouseup.twistCircle", null);
					});
			});

		rerenderTree(false);
	};

	//
	// TabView
	//

	const createTabsView = (data) => {

		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

		const pageDim = d3.select("body").node().getBoundingClientRect();
		const marginTop = 30;
		const marginBottom = 250;
		const tabHeight = Math.floor((pageDim.height - marginTop - marginBottom - 2 * data.children.length) / data.children.length);
		const tabWidth = 250;

		console.log(tabHeight)

		const contentWidth = 750;
		const contentHeight = tabHeight * data.children.length + 2 * data.children.length - 2;

		console.log(contentHeight);

		d3.select("#tabs-wrapper")
			.style("margin", `${marginTop}px 0 ${marginBottom}px 0`)
			.style("width", isMobile ? "100%" : `${tabWidth + contentWidth + 3}px`)
			.style("left", isMobile ? "0" : `calc(50% - ${(tabWidth + contentWidth) / 2.0}px)`)
			/*.style("display", "flex")
			.style("flex-direction", "column")
			.style("align-items", "center")
			.style("justify-content", "center");*/

		const tabs = d3.select("#tabs-wrapper .tabs-left")
			.style("width", `${tabWidth + 2}px`)
			.style("float", "left")
			.selectAll(".tab")
			.data(data.children)
			.join("div")
			.attr("class", "tab")
			.attr("id", (d) => `${d.id}-tab`)
			.style("border-color", "rgb(208, 208, 208) rgb(209, 209, 209) rgb(208, 208, 208) rgb(208, 208, 208)")
			.style("border-style", "solid")
			.style("border-width", "1px")
			.style("height", `${tabHeight}px`)
			.style("width", `${tabWidth}px`)
			.style("line-height", `${tabHeight - 14}px`)
			.style("cursor", "pointer")

		tabs.append("p")
			.attr("class", "title")
			.style("border", (d) => `1px solid ${d.color}`)
			.style("padding", "0 20px")
			.style("margin", "6px")
			.text((d) => d.text);

		let contents;

		if(isMobile) {
			contents = d3.select("#tabs-wrapper .mobile-version .content-mobile")
				.style("border-top", "1px solid #d0d0d0")
				.style("border-right", "1px solid #d0d0d0")
				.style("border-bottom", "1px solid #d0d0d0")
				.style("width", `100%px`)
				.style("overflow-y", "scroll")
				.selectAll(".content")
				.data(data.children)
				.join("div")
				.attr("class", "content")
				.attr("id", (d) => `${d.id}-content`)
				.style("display", (d, i) => i > -1 ? "none" : "default")
		}  else {

			contents = d3.select("#tabs-wrapper .desktop-version .content-right")
				.style("float", "left")
				.style("border-top", "1px solid #d0d0d0")
				.style("border-right", "1px solid #d0d0d0")
				.style("border-bottom", "1px solid #d0d0d0")
				.style("height", `${contentHeight}px`)
				.style("width", `${contentWidth}px`)
				.style("overflow-y", "scroll")
				.selectAll(".content")
				.data(data.children)
				.join("div")
				.attr("class", "content")
				.attr("id", (d) => `${d.id}-content`)
				.style("display", (d, i) => i > -1 ? "none" : "default")
		}

		contents.append("p")
			.attr("class", "title")
			.style("padding", "30px")
			.style("margin", "0")
			.style("font-weight", "bold")
			.style("font-size", "120%")
			.style("color", (d) => d.color)
			.text((d) => d.text);

		contents.append("p")
			.attr("class", "content-text")
			.style("padding", "0 30px 20px")
			.style("white-space", "pre-wrap")
			.text((d) => d.props.themeDescLong)

		/*contents.append("div")
			.style("width", "320px")
			.style("height", "240px")
			.style("margin", "0 auto")
			.append("video")
			.attr("src", "vid/The VRGeo Palm Rejection Solution.mp4")
			.attr("width", "320")
			.attr("height", "240")
			.attr("controls", true)
			.text("Sorry, your browser doesn't support embedded videos.");*/

		contents.append("div")
			.style("width", "440px")
			.style("height", "320px")
			.style("margin", "0 auto")
			.append("iframe")
			.attr("src", "https://www.youtube.com/embed/aS_jYmMV9_g?origin=https://c3tree.framed-mice.eu")
			.attr("width", "440")
			.attr("height", "320")
			.attr("frameborder", "0")
			//.attr("allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture")
			.attr("allowfullscreen", true);

		const collapsibleContentToggler = contents.append("div")
			.attr("class", "collapsible-content-toggler")
			.style("cursor", "pointer")
			.style("margin", "40px 30px 10px")
			.style("color", "#404040")
			.on("click", (event, d) => {

				const entry = d3.select(`#${d.id}-content .collapsible-content-wrapper`);
				const collapsed = entry.attr("data-collapsed")

				if(collapsed === "true") {
					entry.attr("data-collapsed", "false")
						.style("display", "block")
						.transition("appear")
						.duration(animDurationIn)
						.ease(d3.easeQuadOut)
						.style("height", "auto")

					d3.select(`#${d.id}-content .collapsible-content-toggler .collapse-icon-toggler path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
						.attr("transform", "translate(256,256) rotate(180) translate(-256,-256)");
				} else {
					entry.attr("data-collapsed", "true")
					.style("display", "none")
						.transition("appear")
						.duration(animDurationOut)
						.ease(d3.easeQuadOut)
						.style("height", "0")

					entry.attr("data-collapsed", "true")
						.transition("display")
						.delay(animDurationOut)
						.style("display", "none");

					d3.select(`#${d.id}-content .collapsible-content-toggler .collapse-icon-toggler path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
						.attr("transform", "translate(256,256) rotate(90) translate(-256,-256)");
				}
			});

		collapsibleContentToggler.append("p")
			.style("float", "left")
			.style("height", "40px")
			.style("padding", "0")
			.style("margin", "0")
			.style("line-height", "40px")
			.text("Publications and more Information");

		collapsibleContentToggler.append("svg")
			.attr("class", "collapse-icon-toggler")
			.style("float", "left")
			.attr("viewBox", "0 0 512 512")
			.style("margin", "12.5px 5px")
			.attr("width", "15px")
			.attr("height", "15px")
			.attr("xmlns", "http://www.w3.org/2000/svg")
			.append("path")
			.attr("d", "M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z")
			.attr("fill", "#404040")
			.attr("transform", "translate(256,256) rotate(90) translate(-256,-256)")

		collapsibleContentToggler.append("div")
			.style("clear", "both");

		const collapsibleContent = contents.append("div")
			.style("padding", "0 30px 20px")
			.style("margin", "10px 0")
			.attr("class", "collapsible-content-wrapper")
			.attr("data-collapsed", "true")
			.style("height", "0")
			.style("display", "none")

		const papersList = collapsibleContent.append("div")
			.selectAll(".papers-list-item")
			.data((d, i) => {
				const subthemes = rawData.filter((rD) => rD["parent"] === d.text).map((rD) => rD["text"]);
				return rawData.filter((rD) => subthemes.indexOf(rD["parent"]) !== -1).map((rD, rI) => ({...rD, parentIndex: i, rIndex: rI }));
			})
			.join("div")
			.attr("id", (d, i) => `papers-list-item-${d.parentIndex}-${i}`)
			.attr("class", ".papers-list-item")
			.style("cursor", "pointer")
			.style("border", "1px solid #d0d0d0")
			.style("padding", "0 10px")
			.on("click", (event, d, i) => {

				const entry = d3.select(`#papers-list-item-${d.parentIndex}-${d.rIndex} .papers-list-item-content`);
				const collapsed = entry.attr("data-collapsed")

				if(collapsed === "true") {
					entry.attr("data-collapsed", "false")
						.style("display", "block")
						.transition("appear")
						.duration(animDurationIn)
						.ease(d3.easeQuadOut)
						.style("height", "auto")

					d3.select(`#papers-list-item-${d.parentIndex}-${d.rIndex} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
						.attr("transform", "translate(256,256) rotate(180) translate(-256,-256)");
				} else {
					entry.attr("data-collapsed", "true")
					.style("display", "none")
						.transition("appear")
						.duration(animDurationOut)
						.ease(d3.easeQuadOut)
						.style("height", "0")

					entry.attr("data-collapsed", "true")
						.transition("display")
						.delay(animDurationOut)
						.style("display", "none");

					d3.select(`#papers-list-item-${d.parentIndex}-${d.rIndex} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
						.attr("transform", "translate(256,256) rotate(90) translate(-256,-256)");
				}
			});

		papersList.append("p")
			.style("width", "80%")
			.style("float", "left")
			.text((d) => d["text"])

		papersList.append("svg")
			.attr("class", "collapse-icon-paper")
			.style("float", "right")
			.attr("viewBox", "0 0 512 512")
			.style("margin", "12.5px 5px")
			.attr("width", "15px")
			.attr("height", "15px")
			.attr("xmlns", "http://www.w3.org/2000/svg")
			.append("path")
			.attr("d", "M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z")
			.attr("fill", "#404040")
			.attr("transform", "translate(256,256) rotate(90) translate(-256,-256)")

		papersList.append("div")
			.style("clear", "both");

		const papersListContent = papersList.append("div")
			.attr("class", "papers-list-item-content")
			.attr("data-collapsed", "true")
			.style("display", "none");

		papersListContent.each(function (d) {
			let collapsibleInfo = false;
			Object.keys(d).filter((key) => key.indexOf("[INFO_MAIN]") !== -1).forEach((key) => {
				if(d[key] && d[key] !== "") {
					collapsibleInfo = true;
					d3.select(this).append("p")
						.style("font-weight", "bold")
						.text(key.replace("[INFO_MAIN]", ""));
					d3.select(this).append("p")
						.style("padding-bottom", "5px")
						.text(d[key]);
				}
			});
			Object.keys(d).filter((key) => key.indexOf("[INFO_COLLAPSED]") !== -1).forEach((key) => {
				if(d[key] && d[key] !== "") {
					collapsibleInfo = true;
					d3.select(this).append("p")
						.style("font-weight", "bold")
						.text(key.replace("[INFO_COLLAPSED]", ""));
					d3.select(this).append("p")
						.style("padding-bottom", "5px")
						.text(d[key]);
				}
			});
			if(!collapsibleInfo) {
				d3.select(this).append("p")
					.style("font-weight", "bold")
					.text("No additional information.");
			}
			return;
			Object.keys(d).filter((key) => key.indexOf("[INFO_COLLAPSED]") !== -1).forEach((key) => {
				level.props.info_collapsed[key.replace("[INFO_COLLAPSED]", "")] = d[key];
			});
			console.log(d);
			Object.entries(d.info_collapsed).forEach(([key, value]) => {
				if(value && value !== "") {
					papersListContent.append("p")
						.style("font-weight", "bold")
						.text(key);
					papersListContent.append("p")
						.style("padding-bottom", "5px")
						.text(value);
				}
			});
		});


		d3.select("#tabs-wrapper .button")
			.style("margin", "20px 0")
			.style("display", "inline-block")
			.on("click", showMainViz)

		let selectedTab = data.children[0];

		const showContentOfSelectedTab = (animated = false) => {

			const animation = d3.transition().duration(animated ? 750 : 0).ease(d3.easeQuadOut);

			d3.selectAll(".tabs-left .tab")
				.transition(animation)
				.style("border-color", "rgb(208, 208, 208) rgb(209, 209, 209) rgb(208, 208, 208) rgb(208, 208, 208)");
			d3.selectAll(".content-right .content,.content-mobile .content")
				.transition(animation)
				.style("opacity", 0.0)
			d3.selectAll(".content-right .content,.content-mobile .content")
				.transition("textVanish")
				.delay(animated ? 750 : 0)
				.style("display", "none")

			if(selectedTab) {
				d3.select(`#${selectedTab.id}-tab`)
					.transition("tabAppear")
					.delay(animated ? 750 : 0)
					.duration(animated ? 750 : 0)
					.style("border-color", "rgb(208, 208, 208) rgb(255, 255, 255) rgb(208, 208, 208) rgb(208, 208, 208)")
				d3.select(`#${selectedTab.id}-content`)
					.transition("textVanish")
					.delay(animated ? 750 : 0)
					.style("display", null)
				d3.select(`#${selectedTab.id}-content`)
					.transition(animation)
					.delay(animated ? 750 : 0)
					.style("opacity", 1.0)

			}
		}

		tabs.on("click", (event, d) => {
			selectedTab = d;
			showContentOfSelectedTab(true);
		});

		
		d3.select(".hamburger").on("click", (event) => {
			d3.selectAll(".hamburger-link")
				.on("click", function(event) {
					selectedTab = data.children.find((d) => d.text === d3.select(this).attr("data-link"));
					showContentOfSelectedTab(true);
					open = false;
				});
		})
		

		showContentOfSelectedTab(false);

	};

	//
	// search
	//
	

	const highlightSearchTerm = (searchTerm) => {

		d3.selectAll(".category-labels tspan")
			.attr("stroke", (d) => {
				return d.data.text.toLowerCase().includes(searchTerm.toLowerCase()) || d.data.props?.themeDescShort?.toLowerCase().includes(searchTerm.toLowerCase()) ? "#ffee22" : null
			})
			.attr("stroke-width", 5);

		d3.selectAll(".outer-node-group circle")
			.attr("stroke", (d) => {
				return d.data.text.toLowerCase().includes(searchTerm.toLowerCase()) || d.data.props?.info_main?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ? "#ffee22" : null
			})
			.attr("stroke-width", 5);

		d3.selectAll(".node-group text")
			.attr("stroke", (d) => {
				return d.data.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
				(d.data.props?.info_main && (d.data.props?.info_main["Full title"]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
					d.data.props?.info_main["Summary"]?.toLowerCase().includes(searchTerm.toLowerCase())))
				? "#ffee22" : null
			})
			.attr("stroke-width", 5);
	};

	//
	// Tree bulding
	//

	const buildHierarchy = ((parentLevel, data, presetsAvailable, presetsParent, depth, maxDepth) => {
		//console.log(data.filter((d) => parentLevel.text !== "" && parentLevel.text !== undefined && d.parent === parentLevel.text))
		data.filter((d) => parentLevel.text !== "" && parentLevel.text !== undefined && d.text !== undefined && d.text !== "" && d.parent === parentLevel.text).forEach((d) => {

			const level = {
				"id": `${parentLevel.id}${parentLevel.children.length}`,
				"text": d.text,
				"color": depth === 1
					? (parentLevel.children.length < colors.length ? colors[parentLevel.children.length] : "#808080")
					: parentLevel.color,
				"depth": depth,
				"maxDepth": maxDepth,
				"visible": true,
				"props": {
					"publication_link": d.publication_link,
					"data_source": d.data_source,
					"status": d.Status,
					"info_main": {},
					"info_collapsed": {
						"Status": d.Status,
					},
					"themeDescLong": d.themeDescLong,
					"themeDescShort": d.themeDescShort,
				},
				"presets": [...presetsParent, ...presetsAvailable.filter((preset) => !presetsParent.includes(preset) && d[`[PRESET]${preset}`] === "x")],
				"children": [],
			};

			Object.keys(d).filter((key) => key.indexOf("[INFO_MAIN]") !== -1).forEach((key) => {
				level.props.info_main[key.replace("[INFO_MAIN]", "")] = d[key];
			});
			Object.keys(d).filter((key) => key.indexOf("[INFO_COLLAPSED]") !== -1).forEach((key) => {
				level.props.info_collapsed[key.replace("[INFO_COLLAPSED]", "")] = d[key];
			});

			if(depth <= maxDepth)
				parentLevel.children.push(level);
			else { // TODO: Team

				if(visibleTeams.indexOf(parentLevel.text) !== -1) {
					parentLevel.children.push(level);
				}

				if(!("Members" in parentLevel.props.info_main)) parentLevel.props.info_main["Members"] = [];
				parentLevel.props.info_main["Full title"] = null;
				parentLevel.props.info_main["Summary"] = null;
				parentLevel.props.info_main["description"] = null;
				parentLevel.props.info_main["Members"].push({
					"name": d.text,
					"photo_filename": d.photo_filename,
					"description": d["[INFO_MAIN]Summary"],
					"member_link": d["member_link"],
					"member_link_name": d["member_link_name"]
				});
			}

			buildHierarchy(level, data, presetsAvailable, level.presets, depth + 1, level.text === "Team" ? 2 : maxDepth);
		});
	});

	const startBuildHierarchy = ((data, presets, maxDepth = 15) => {

		const hierarchyRootLevel = {
			"id": "r",
			"text": "ROOT",
			"color": "#202020",
			"depth": 0,
			"visible": false,
			"props": {},
			"presets": [],
			"children": [],
		};

		buildHierarchy(hierarchyRootLevel, data, presets, [], 1, maxDepth);

		return hierarchyRootLevel;
	});

	const addIntroSteps = (introData) => {
		console.log(introData);
		introData.forEach((step) => {
			d3.select(`${step["CSS selector"]}`)
				.attr("data-step", step["stepNum"])
				.attr("data-intro", step["text"]);
		});
	}

	const rebuildTree = () => {
		data = startBuildHierarchy(rawData, presets);
		dataSimplified = startBuildHierarchy(rawData, presets, 2);
		console.log(data);
		createTabsView(data);
		createCollapsableRadialTree(data, separationFunction, radius);
		addIntroSteps(introData);
	}

	//
	//
	//

	// init function

	const initialize = () => {

		showLoader();

		

		secondTooltip = d3.select("#checkbox-status-second-tooltip")?.property("checked");
		mode = d3.select("#viz-select").node().value === "0" ? "viz-select-0" : "viz-select-1";

		d3.selectAll("input[type='checkbox']").each(function() {
			checkboxesChecked[d3.select(this).attr("id")] = d3.select(this).property("checked");
			if(d3.select(this).attr("class") === "checkbox-status" && !checkboxesChecked[d3.select(this).attr("id")]) {
				d3.select(this).property("checked", true);
				checkboxesChecked[d3.select(this).attr("id")] = true;
			}
		});
		d3.select("#checkbox-image").on("change", (event) => {
			checkboxesChecked["checkbox-image"] = !checkboxesChecked["checkbox-image"];
			d3.select("#center-image").attr("opacity", checkboxesChecked["checkbox-image"] ? 1.0 : 0.0)
		});
		d3.select("#checkbox-twist-circle").on("change", (event) => {
			checkboxesChecked["checkbox-twist-circle"] = !checkboxesChecked["checkbox-twist-circle"];
			rerenderTree();
		});
		d3.select("#checkbox-leaf-titles").on("change", (event) => {
			checkboxesChecked["checkbox-leaf-titles"] = !checkboxesChecked["checkbox-leaf-titles"];
			rerenderTree();
		});
		d3.select("#checkbox-status-second-tooltip").on("change", (event) => {
			secondTooltip = d3.select("#checkbox-status-second-tooltip").property("checked");
		});
		d3.select("#checkbox-node-text").on("change", (event) => {
			let checked = d3.select(event.target).property("checked")
			if(checked) {
				d3.selectAll(".node-text-1st-line").attr("dy", "0em")
				d3.selectAll(".node-text-2nd-line").style("display", null)
			} else {
				d3.selectAll(".node-text-1st-line").attr("dy", "0.32em")
				d3.selectAll(".node-text-2nd-line").style("display", "none")
			}

		})
		d3.selectAll(".checkbox-status").on("change", function() {
			const checkboxId = d3.select(this).attr("id");
			checkboxesChecked[checkboxId] = !checkboxesChecked[checkboxId];
			const statusAffected = checkboxId.replace("checkbox-status-", "")
			root.leaves().forEach((d) => {
				if(d.data.props.status === statusAffected) {
					setTreeVisibility(d.data, checkboxesChecked[checkboxId]);
				}
			});
			rerenderTree();
		});

		d3.select("#welcome-dialog .button.button-simplified").on("click", (event) => {
			simplifiedMode = true;
			showSimplifiedVersion();
		});

		d3.select("#welcome-dialog .button.button-default").on("click", async (event) => {
			simplifiedMode = false;
			await rerenderTree(false);
			showMainViz();
		});

		d3.select("#min-width-dialog .button").on("click", (event) => {
			d3.select("#min-width-dialog")
				.style("opacity", 1.0)
				.transition("disappear")
				.duration(750)
				.ease(d3.easeQuadOut)
				.style("opacity", 0.0);
		});

		d3.select("#viz-select").on("change", (event) => {
			if(event.target.value === "0") {
				mode = "viz-select-0";
				d3.selectAll("#curves-wrapper-center").attr("opacity", 1.0);
				d3.selectAll("#curves-wrapper-leaves").attr("opacity", 0.0);
			} else {
				mode = "viz-select-1";
				d3.selectAll("#curves-wrapper-center").attr("opacity", 0.0);
				d3.selectAll("#curves-wrapper-leaves").attr("opacity", 1.0);
			}
			rerenderTree(false);
		});

		d3.select("#controls-wrapper").style("display", "block");

		calculateDimensions();		

		d3.select("#back-button").on("click", (event) => {
			showSimplifiedVersion();
		});
		d3.select("#help-button").on("click", (event) => {
			startIntroTour();
		});

		
		d3.select("#hover-tooltip").style("width", `${tooltipWidth}px`).style("height", "auto")

		//
		// data preprocessing
		//

		const parseMetaData = (responseMetaData, metaDataHeader) => {
			
			responseMetaData.forEach((metaInfo) => {
				switch(metaInfo[0]) {
					case "welcomeMessageTitle":
					d3.select("#welcome-dialog h3").html(metaInfo[1]);
					break;
					case "welcomeMessageBody":
					d3.select("#welcome-dialog span").html(metaInfo[1]);
					break;
					case "tabViewTitle":
					d3.select("#tab-view-title").html(metaInfo[1]);
					break;
				}
			})
		};

		const parseIntroData = (responseIntroData) => {
			const introHeader = responseIntroData[0];
			introData = responseIntroData.slice(1).map((row) => {
				const step = {};
				step[introHeader[0]] = row[0];
				step[introHeader[1]] = row[1];
				step[introHeader[2]] = row[2];
				return step;
			});
		}

		const parseNCSAndLHWData = (responseData, header) => {
			rawData = [];
			const themesAdded = [];
			let theme = "";
			let subThemesAdded = [];
			responseData.forEach((row) => {

				// new theme
				if(row[0] !== undefined && row[0] !== "" && !themesAdded.includes(row[0])) {
					theme = row[0];
					rawData.push({
						"text": theme,
						"parent": "ROOT",
						"themeDescLong": row[1],
						"themeDescShort": row[2],
					});
					themesAdded.push(theme);
					subThemesAdded = [];
				}

				// new subtheme
				if(row[3] !== undefined && row[3] !== "" && !subThemesAdded.includes(row[3])) {
					let subTheme = row[3];
					rawData.push({
						"text": subTheme,
						"parent": theme,
						"[INFO_MAIN]description": row[4]
					});
					subThemesAdded.push(subTheme);
				}

				const d = {
					"text": row[5],
					"parent": row[3],
				};
				header.slice(5).forEach((column, i) => {
					d[column] = row[i + 5]
				});
				rawData.push(d);
			});

			console.log(rawData);

			return rawData;
		};

		const parseDefaultData = (responseData, header) => {
			const rawData = responseData.map((row) => {
				const d = {};
				header.forEach((column, i) => {
					d[column] = row[i]
				});
				return d;
			});

			return rawData;
		};


		// initialize request

		var xhr = new XMLHttpRequest();
		xhr.open("POST", "https://c3tree.framed-mice.eu/fetch_c3tree_data_from_google_sheet", true);
		//xhr.open("POST", "/fetch_c3tree_data_from_google_sheet", true);
		xhr.send(null);
		xhr.onload = () => {

			if(xhr.readyState === 4) {
				if(xhr.status === 200) {
					const response = JSON.parse(xhr.responseText);
					console.log(response);
					header = response.mainData[0];
					presets = header.filter((column) => column.includes("[PRESET]")).map((column) => column.replace("[PRESET]", ""));
					rawData = parseNCSAndLHWData(response.mainData.slice(1), header);
					parseMetaData(response.metaData.slice(1), response.metaData[0]);
					parseIntroData(response.introData);

					rebuildTree();
					initializePresetsDropdown(presets);

					d3.select("#search").node().value = "";
					d3.select("#search").on("keyup", (event) => {

						const searchTerm = event.target.value;
						if(searchTerm.length > 2) {
							highlightSearchTerm(searchTerm);
						/*data.children.forEach((d) => {
						highlightSearchTerm(d, searchTerm);
						});*/
						} else highlightSearchTerm("##-##");
					});


					showWelcomeDialog();
					hideLoader();

				} else {

				}
			}
		}

		xhr.onerror = (err) => {
			console.log(xhr.readyState, xhr.status, xhr.responseText)
			console.warn(err);
		}

		//
		//
		//

	};

	const calculateDimensions = () => {
		width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		height = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
		canvasWidth = width;
		canvasHeight = height;

		if(width < 768) { // mobile version
			//d3.select("#welcome-dialog .button-default").attr("disabled", "true");
		} else {
			//d3.select("#welcome-dialog .button-default").attr("disabled", null);
		}

		radius = d3.min([canvasWidth - margin.left - margin.right, canvasHeight - margin.top - margin.bottom]) / 2 - 150;
		outerRadius = radius + 90;

		if(width < height) {
			//d3.select("#controls-wrapper").style("left", "50%").style("top", `${(height - width) / 2.0 - 20}px`).style("margin-left", "-100px");
			//d3.select("#controls-wrapper").style("left", "50%").style("top", `${(height - width) / 2.0 - 20}px`).style("margin-left", "-100px");
			d3.select("#controls-wrapper").style("left", "50%").style("top", `${(height - width) / 2.0 - 20}px`).style("margin-left", "-100px");
			d3.selectAll(".canvas-wrapper").style("margin-top", `${(height - width) / 2.0}px`)
			d3.select("#back-button")
				.style("display", "block")
				.style("left", "20px")
				.style("top", `${(height - width) / 2.0}px`);
			d3.select("#help-button")
				.style("display", "block")
				.style("right", "20px")
				.style("top", `${(height - width) / 2.0}px`);
		} else {
			//d3.select("#controls-wrapper").style("left", `${(width - height) / 2.0 - 220}px`).style("top", `35%`);
			//d3.select("#controls-wrapper").style("left", `${(width - height) / 2.0 - 220}px`).style("top", `100px`);
			d3.select("#controls-wrapper")
				.style("left", `${(width - height) / 2.0 - 220}px`)
				.style("top", `50%`)
				.style("height", "366px")
				.style("margin-top", `-${366 / 2}px`)
				.style("margin-left", null);
			d3.select("#back-button")
				.style("display", "block")
				.style("left", `${(width - height) / 2.0 + 20}px`)
				.style("top", "20px");
			d3.select("#help-button")
				.style("display", "block")
				.style("right", `${(width - height) / 2.0 + 20}px`)
				.style("top", "20px");
		}

		d3.selectAll(".canvas-wrapper").style("width", `${canvasWidth}px`).style("height", `${canvasHeight}px`)

		// d3 things

		d3.select("#main-transform")
			.attr("transform", `translate(${canvasWidth / 2.0},${canvasHeight / 2.0}) rotate(${(twist) * 180 / Math.PI})`);

		d3.select("#d3-canvas")
			.attr("viewBox", [0, 0, canvasWidth, canvasHeight])
			.attr("width", canvasWidth)
			.attr("height", canvasHeight)

		if(canvasWidth < canvasHeight) {
			const margin = (canvasHeight - canvasWidth) / 2.0;
			d3.select(".legend-wrapper")
				.attr("transform", `translate(
					${canvasWidth - 150},
					${margin + canvasWidth - 80})`)
		} else {
			const margin = (canvasWidth - canvasHeight) / 2.0;
			d3.select(".legend-wrapper")
				.attr("transform", `translate(
					${margin + canvasHeight - 150},
					${canvasHeight - 80})`)
		}

		d3.select("#category-labels-wrapper")
			.selectAll(".category-labels")
			.each(function(d) {
				addSVGTextLineBreaks(d3.select(this), canvasWidth / 2 - radius - 80, 0, 1.0)
			});

		d3.select("#twist-circle").attr("r", outerRadius)

		d3.select("#center-image")
			.attr("width", radius * brainSize)
			.attr("height", radius * brainSize * brainAspectRatio)
			.attr("transform", `translate(
				${width / 2.0 - radius * brainSize / 2.0},
				${height / 2.0 - radius * brainSize / 2.0 * brainAspectRatio})`)
	};

	window.addEventListener("load", (event) => initialize());
	window.addEventListener("resize", (event) => calculateDimensions());

	// skip welcome dialog
	//showMainViz();
</script>

<main>

	<!-- draft notice -->
	<div id="draft-notice" style="background: #ffffff;display:block;position: fixed;left:10px;bottom:10px;width: 300px;font-size: 80%;border: 1px solid #f0f0f0;padding:10px;text-align: left;z-index: 99;">
		<span><b>Draft visualisation</b> - not for publication or sharing. The information in this visualisation draft is being collaboratively developed and will be launched in Autumn 2023. Information included in the visualisation may contain errors.</span>
	</div>

	<!-- welcome dialog -->

	<div id="welcome-dialog" style="display:none;">
		<center>
			<h3>Welcome!</h3><br/>
		</center>
		<span></span>
		<br/><br/>
		<span id="mobile-availability-note">Note: The main visualization is currently only available on a desktop PC.</span>
		<br/>
		<div class="button-row">
			<button class="button button-simplified" style="margin-right:10px">Simplified version</button>
			<button class="button button-default">Default version</button>
		</div>

	</div>

	<!-- min-width dialog  -->

	<div id="min-width-dialog" style="display:none;position: absolute;left:50%;top:50%;width: 500px;min-height: 200px;margin-left:-250px;margin-top:-200px;border: 1px solid #f0f0f0;padding:20px;text-align: left;z-index: 99;background:#ffffff">
		<center>
			<h3 class="please-maximize" style="display:none">Please maximaze your browser window for best experience.</h3><br/>
			<h3 class="please-desktop" style="display:none">This visualization was optimized for desktop use only.</h3><br/>
		</center>
		<div class="button-row">
			<button class="button button-simplified" style="margin-right:10px">Close</button>
		</div>
	</div>

	<div id="main-viz-wrapper" style="opacity: 0.0;display: none;">

		<div class="canvas-wrapper" >
			<svg id="d3-canvas" opacity="0.0"/>
		</div>

		<!-- tooltip -->

		<div id="tooltip-wrapper">
			<div id="hover-tooltip" class="tooltip" style="display:none;z-index:99">
				<div class="tooltip-close-button" style="display:none">x</div>
				<center>
					<div class="tooltip-title"></div>
				</center>
				<table class="table-main" cellspacing="15">
					<tbody class="tooltip-tbody"></tbody>
				</table>
				<center>
					<button type="button" class="button-publication-link">Go to publication</button>
				</center>
				<svg class="tooltip-collapsible-button" style="margin-left:25px; cursor:pointer" width="15px" height="15px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
					<path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"
					fill="#202020"
					transform="translate(256,256) rotate(90) translate(-256,-256)"/>
				</svg>
				<table class="table-collapsed" cellspacing="15">
					<tbody class="tooltip-tbody"></tbody>
				</table>
				<center><div class="tooltip-bottom-note">Click on the leaf to stick.</div></center>
			</div>
		</div>

		<!-- controls -->

		<div id="controls-wrapper" style="display:none;">
			<center>
				<input id="search" type="text" placeholder="search text..." />
				<select id="viz-select" style="width:200px">
					<option value="0">Radial Tree</option>
					<option value="1">Connected Edges</option>
				</select>
				<select id="preset-select" style="display:none;width:200px">
				</select>
				<br/><br/>
				<input style="float:left;display:block" type="checkbox" id="checkbox-image" checked>
				<span style="float:left;display:block">Show center image</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:block" type="checkbox" id="checkbox-leaf-titles" checked>
				<span style="float:left;display:block">Show leaf titles</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:block" type="checkbox" id="checkbox-twist-circle" checked>
				<span style="float:left;display:block">Large twist circle</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:block" type="checkbox" id="checkbox-node-text" checked>
				<span style="float:left;display:block">Node text second line</span>
				<div style="clear: both;"></div>
				<br/>
				<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Published" checked>
				<span style="float:left;display:block">Status: Published</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Accepted" checked>
				<span style="float:left;display:block">Status: Accepted</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Submitted" checked>
				<span style="float:left;display:block">Status: Submitted</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Manuscript" checked>
				<span style="float:left;display:block">Status: Manuscript</span>
				<div style="clear: both;"></div>
				<br/>
				<input style="float:left;display:block" type="checkbox" id="checkbox-status-second-tooltip" checked>
				<span style="float:left;display:block">Second tooltip</span>
				<div style="clear: both;"></div>
			</center>
		</div>

		<!-- additional controls -->

		<div id="back-button" style="display: none;position: absolute;color:#808080;font-size:80%;cursor:pointer;">
			&lt; back to simplified version
		</div>
		<div id="help-button" style="display: none;position: absolute;color:#808080;font-size:400%;font-weight: bold;cursor:pointer;">
			?
		</div>

	</div>

	<!-- simplified / tab view -->

	<div id="tabs-wrapper" style="opacity: 0.0;display: none;">
		<Hamburger bind:open color="white"/>
		<div class="tab-view-header">
			<img src="/center_logo.png" alt="Logo"/>
			<span id="tab-view-title">Welcome</span>
		</div>
		<div style="clear:both"></div>
		<div class="desktop-version">
			<div class="tabs-left"></div>
			<div class="content-right"></div>
			<center>
				<button class="button button-default" style="display:none">Go to visualization</button>
			</center>
		</div>
		<div class="mobile-version">
			<div class="content-mobile"></div>
		</div>
	</div>

	<!-- loader -->

	<div id="loader" style="position: absolute; left: 50%; top: 50%; width: 400px; height: 300px; margin: -150px 0 0 -200px;text-align: center">
		<img src="/loading_bars.svg" alt="loading-bars"/>
	</div>

</main>

<div class="hamburger-wrapper">
	

	<Menu bind:open />
</div>





<style>

	body {
		overflow: hidden;
	}

	#welcome-dialog {
		position: absolute;
		left:50%;
		top:50%;
		width: 800px;
		min-height: 300px;
		margin-left:-400px;
		margin-top:-200px;
		border: 1px solid #f0f0f0;
		padding:20px;
		text-align: left;
		z-index: 99;
		opacity: 1.0;
	}
	#welcome-dialog #mobile-availability-note {
		display: none;
		font-style: italic;
	}

	#tabs-wrapper {
		 position: absolute;
		 left:0;
		 top:0;
	}
	#tabs-wrapper #tab-view-title {
		display: initial;
	}
	#tabs-wrapper .desktop-version {
		display: block;
	}
	#tabs-wrapper .mobile-version {
		display: none;
	}
	.hamburger-wrapper {
		display: none;
		width: 100%;
	}

	@media screen and (max-width: 768px) {
		body {
			overflow-y: scroll;
		}
	    #welcome-dialog {
			position: absolute;
			left:10px;
			top:50%;
			width: calc(100% - 60px);
			margin-left:0;
			margin-top:-350px;
			padding:20px;
		}
		#welcome-dialog .button-row {
			display: block;
		}
		#welcome-dialog .button {
			width: 100%;
			margin-top: 10px;
		}
		#welcome-dialog .button-default {
			display: none;
		}
		#welcome-dialog #mobile-availability-note {
			display: initial;
		}

		#tabs-wrapper {
			position: relative;
			left:0 !important;
			top:0;
		}
		#tabs-wrapper #tab-view-title {
			display: none;
		}
		#tabs-wrapper .desktop-version {
			display: none;
		}
		#tabs-wrapper .mobile-version {
			display: block;
			width: 100%;
		}
		.hamburger-wrapper {
			display: initial;
			position: fixed;
			left: 10px;
			top: 10px;
		}
	}
	
</style>