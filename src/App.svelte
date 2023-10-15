<script type="text/javascript">
	import * as d3 from 'd3';

	import { onMount } from 'svelte';

	// menu
	import { Hamburger } from 'svelte-hamburgers';

    import Menu from './components/Menu.svelte';
    import Loader from './components/Loader.svelte';
    import WelcomeDialog from './components/WelcomeDialog.svelte';
    import DraftNotice from './components/DraftNotice.svelte';
    import IntroTour from './components/IntroTour.svelte';
    import Controls from './components/Controls.svelte';
    import MinWidthDialog from './components/MinWidthDialog.svelte';

    import { updateLeafTextAppearence } from './helper/updateLeafTextAppearence';
    import { addSVGTextLineBreaks } from './helper/addSVGTextLineBreaks';
    import { getParentWithDepth } from './helper/getParentWithDepth';
    import { setTreeVisibility } from './helper/setTreeVisibility';
    import { radialTreeLineFunction, connectedEdgesLineFunction, separationFunction } from './helper/d3Functions';
    
    // child component states

    let menuOpen;

    let loaderVisible;

    let welcomeDialogVisible;

	let introTourStartTrigger;
	let introData;

	let controlsVisible;
	let presets;

	let checkShowDisplayCompatabilityTrigger;


	//
	// config
	//

	const colors = ["#8C88BA", "#BF84AE", "#DB95AC", "#FBB9A6", "#F6A294", "#B0DBEA", "#B3E5BE", "#CFC69D"];
	let animDurationIn = 750;
	let animDurationOut = 400;
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

	const showMainViz = () => {

		loaderVisible = true;
		welcomeDialogVisible = false;
		checkShowDisplayCompatabilityTrigger = true;

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
				loaderVisible = false;
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

		welcomeDialogVisible = false;
		checkShowDisplayCompatabilityTrigger = true;

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

		controlsVisible = !simplifiedMode;

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
					menuOpen = false;
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

	

	const rebuildTree = () => {
		data = startBuildHierarchy(rawData, presets);
		dataSimplified = startBuildHierarchy(rawData, presets, 2);
		console.log(data);
		createTabsView(data);
		createCollapsableRadialTree(data, separationFunction, radius);
	}

	//
	//
	//

	// init function

	const initialize = () => {

		loaderVisible = true;

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

		calculateDimensions();		

		d3.select("#back-button").on("click", (event) => showSimplifiedVersion());
		d3.select("#help-button").on("click", (event) => introTourStartTrigger = true);

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
					introData = response.introData;

					rebuildTree();

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


					welcomeDialogVisible = true;
					loaderVisible = false;

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

	onMount(() => {
		initialize();
		window.addEventListener("resize", (event) => calculateDimensions());
	});

	// skip welcome dialog
	//showMainViz();
</script>

<main>
	
	<DraftNotice/>
	<WelcomeDialog bind:visible={welcomeDialogVisible} {animDurationOut} {animDurationIn}/>
	<IntroTour bind:introTourStartTrigger bind:introData/>
	<MinWidthDialog bind:checkShowDisplayCompatabilityTrigger/>

	

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
		<Controls bind:visible={controlsVisible} bind:presets/>
		

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
		<Hamburger bind:open={menuOpen} color="white"/>
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

	<Loader bind:visible={loaderVisible}/>

</main>

<div class="hamburger-wrapper">
	<Menu bind:open={menuOpen}/>
</div>





<style>

	body {
		overflow: hidden;
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