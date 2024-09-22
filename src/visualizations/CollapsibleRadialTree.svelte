<script type="text/javascript">
	import * as d3 from 'd3';

	import Controls from '../components/Controls.svelte';

	import { addSVGTextLineBreaks } from '../helper/addSVGTextLineBreaks';
	import { updateLeafTextAppearence } from '../helper/updateLeafTextAppearence';
	import { getParentWithDepth } from '../helper/getParentWithDepth';
    import { setTreeVisibility } from '../helper/setTreeVisibility';
    import { radialTreeLineFunction, connectedEdgesLineFunction, separationFunction } from '../helper/d3Functions';

	export let BRAIN_SIZE;
	export let BRAIN_ASPECT_RATIO;
	export let TOOLTIP_WIDTH;

	export let width;
	export let height;
	export let canvasWidth;
	export let canvasHeight;
	export let radius;
	export let outerRadius;

	export let simplifiedMode;
	export let twist;

	export let data;
	export let rawData;
	export let dataConnections;
	export let dataSimplified;
	export let root;
	export let rootConnections;
	export let rootSimplified;

	// for controls
	export let controlsVisible;
	export let presets;
	export let checkboxesChecked;
	export let rerenderTreeTrigger;
	export let mode;
	export let prevMode;
	export let categoryLegendVisible;
	
	let selectedNode = undefined;

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

	function filterTree(node, condition) {
	    // clone the node
	    let newNode = {...node};
	    if (node.children) {
	        newNode.children = node.children.filter(condition).map(child => filterTree(child, condition));
	    }
	    return newNode;
	}


	const rerenderTree = async (animated = true) => {

		if(!root || !rootSimplified) return;

		//const condition = (d) => d.visible;
		//console.log(mode === "viz-select-0");
		//const filteredRoot = mode === "viz-select-0" ? d3.hierarchy(filterTree(root.data, condition)) : d3.hierarchy(filterTree(rootConnections.data, condition));

		if(mode !== prevMode) {
			prevMode = mode;
			if(mode === "viz-select-0")
				createCollapsableRadialTree(data, separationFunction, radius)
			else
				createCollapsableRadialTree(dataConnections, separationFunction, radius)
			return;
		}
		//console.log(mode);
		const filteredRoot = root;
		
		categoryLegendVisible = mode === "viz-select-1";

		//console.log(root, filteredRoot);

		simplifiedMode = checkboxesChecked["checkbox-simple-view"];

		controlsVisible = !simplifiedMode;

		twist = twist > Math.PI * 2.0 ? twist - Math.PI * 2.0 : twist;
		twist = twist < 0 ? twist + Math.PI * 2.0 : twist;

		d3.select("#twist-circle")
			.attr("r", outerRadius + (mode === "viz-select-1" && !simplifiedMode ? 80 : 0))

		const treeFunction = d3.cluster().size([2 * Math.PI, radius + (mode === "viz-select-1" && !simplifiedMode ? 80 : 0)]);
		treeFunction.separation(separationFunction)(filteredRoot);
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
			.data(filteredRoot.links())//, (d) => d.target.data.id)
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
			.data(filteredRoot.leaves().flatMap((leaf) => {
				return filteredRoot.leaves().filter(
					(d) => d.data.props.data_source.some(v => leaf.data.props.data_source.includes(v)) && d !== leaf).map(
					(d) => [leaf, d]);
			}))//, (d) => `${d[0].data.id}-${d[1].data.id}`)
			.call((update) => {
				update.transition(animation).attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)))
					.attr("opacity", (d) => d[0].data.visible && d[1].data.visible ? 0.1 : 0.0);
			});

		d3.select("#outer-node-group-wrapper")
			.transition(animation)
			.attr("opacity",  !simplifiedMode ? 1.0 : 0.0)
		d3.select("#outer-node-group-wrapper")
			.selectAll(".outer-node-group")
			.data(filteredRoot.descendants().filter((d) => d.children && d3.sum(d.children.map((child) => child.children !== undefined ? 1 : 0)) === 0))//, (d) => d.data.id)
			.transition(animation)
			.attr("class", "outer-node-group")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${radius + 130},0)`)
			.attr("opacity", (d) => d.data.visible ? 1 : 0)
			.style("pointer-events", (d) => d.data.visible && !simplifiedMode ? "all" : "none")

		const nodes = d3.selectAll("#node-group-wrapper").selectAll(".node-group")
			.data(filteredRoot.descendants());/*, (d) => {
				//console.log(d.data.id)
				return d.data.id
			});*/

		const enter = nodes.enter()
			.append('g')
			.attr("class", "node-group")

		enter.append("text")
			.attr("class", "node-text node-text-1st-line")
			.attr("id", (d) => `${d.data.id}-text`)
			//.attr("dy", mode === "viz-select-0" ? "0.32em" : "0em")
			.attr("dy", "0em")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			//.attr("opacity", (d) => d.data.depth > 2 ? 1.0 : 0.0)
			.attr("font-size", "10px")
			.style("pointer-events", "none")
			.text((d) => mode === "viz-select-0" ? null : d.data.text.slice(0,10) + '...')
		/*enter.append("text")
			.attr("class", "node-text node-text-2nd-line")
			.attr("id", (d) => `${d.data.id}-text-2nd-line`)
			.attr("dy", "1em")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			//.attr("opacity", (d) => d.data.depth > 2 ? 1.0 : 0.0)
			.attr("font-size", "10px")
			.style("display", mode === "viz-select-0" ? null : "none")
			.style("pointer-events", "none")*/
		enter.filter((d) => !d.children).append("rect")
			.attr("class", "text-leaf-interact-area")
			.attr("fill", "transparent")
			.attr("opacity", 0.5)
			.attr("y", -10)
			.attr("width", 70)
			.attr("height", 30)
			.style("cursor", "pointer")

		const exit = nodes.exit().remove();

		//updateLeafTextAppearence();

		const update = enter.merge(nodes);

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

		d3.selectAll(".node-text").transition(animation)
			.attr("opacity", (d) => (d.data.depth > 2 || d.data.depth === d.data.maxDepth) && (d.data.visible || d.parent?.data.visible) && checkboxesChecked["checkbox-leaf-titles"] && !simplifiedMode && !d.children ? 1.0 : 0.0)
			.attr("font-size", checkboxesChecked["checkbox-text-size"] && mode === "viz-select-1" ? "70%" : "100%")

		update.selectAll(".text-leaf-interact-area")
			.style("pointer-events", (d) => d.data.visible && !simplifiedMode ? "all" : "none");


		d3.selectAll("#node-group-wrapper .node-circle")
			.transition(animation)
			.attr("opacity", (d) => mode === "viz-select-0" && !simplifiedMode && (d.data.visible || d.parent?.data.visible || d.parent?.data.id === "r") ? 1.0 : 0.0);

		d3.selectAll("#node-group-wrapper .node-interact-area")
			.style("pointer-events", (d) => /* d.data.visible && */ !simplifiedMode && mode === "viz-select-0" ? "all" : "none")

		d3.selectAll("#node-group-simplified-wrapper .node-group-simplified")
			.data(rootSimplified.descendants())//, (d) => d.data.id)
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


		if(!simplifiedMode) {
			d3.select("#category-legend")
				.selectAll(".legend-entry")
				.data(filteredRoot.descendants().filter((d) => d.depth === 1 && d.data.text !== "Data" && d.data.text !== "Team"))
				.attr("transform", (d, i) => `translate(0,${i * 50})`)
		}

		d3.select("#category-labels-wrapper")
			.selectAll(".category-labels")
			.data(simplifiedMode ? rootSimplified.descendants().filter((d) => d.depth === 1) : filteredRoot.descendants().filter((d) => d.depth === 1))//, (d) => d.data.id)
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
			.attr("opacity", (d) => d.data.visible && (!categoryLegendVisible || d.data.text === 'Data' || d.data.text === 'Team' || (mode === "viz-select-1" && d.data.text === 'Vaccination')) ? 1.0 : 0.0)
			.attr("fill", (d) => mode === "viz-select-1" && d.data.text === 'Vaccination' ? 'rgb(160, 160, 160)' : d.data.color)
			.text((d) => mode === "viz-select-1" && d.data.text === 'Vaccination' ? 'Publications' : d.data.text)

		setMouseEvents();
	};

	const createCollapsableRadialTree = (data, separationFunction, radius) => {

		root = d3.hierarchy(data);
		rootSimplified = d3.hierarchy(dataSimplified);

		const treeFunction = d3.cluster().size([2 * Math.PI, radius]);
		
		treeFunction.separation(separationFunction)(root);
		treeFunction.separation(separationFunction)(rootSimplified);

		root.descendants().forEach((d) => {
			if(['Mental Health ','Healthcare disruption','Society & Health ','Serology ','Long Covid ','OpenSAFELY','Other ','Treatment '].includes(d.data.text))
				setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-themes-publications"]);
			if(d.data.text === 'Data')
				setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-data-sources"]);
			if(d.data.text === 'Team' || d.data.text === 'Teams')
				setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-team"]);
		});

		d3.select("body")
			.on("click", (event) => {

				if(!d3.select("#sticky-tooltip").empty()) {
					d3.select("#curves-wrapper-leaves").selectAll(".leaf-to-leaf-path")
						.attr("stroke", "#d0d0d0")
						.attr('stroke-width', 1)
						.raise();
					selectedNode = undefined;
					d3.select("#sticky-tooltip").remove();
					d3.select("#sticky-tooltip-overlay").remove();

					if(mode === "viz-select-1") {
						d3.selectAll('.node-text')
							.attr('font-weight', null)
							//.attr('font-size', null)
							.attr("fill", (d) => d.data.color)
							.attr('stroke', null)
							.attr('stroke-width', null);
					}
				}
			});

		//d3.select("#d3-canvas").selectAll("#main-transform").remove();
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
			.attr("width", radius * BRAIN_SIZE)
			.attr("height", radius * BRAIN_SIZE * BRAIN_ASPECT_RATIO)
			.style("pointer-events", "all")
			.style("cursor", "pointer")
			.attr("transform", `translate(
				${width / 2.0 - radius * BRAIN_SIZE / 2.0},
				${height / 2.0 - radius * BRAIN_SIZE / 2.0 * BRAIN_ASPECT_RATIO})`)
			.on("click", (event) => {
				checkboxesChecked["checkbox-simple-view"] = !checkboxesChecked["checkbox-simple-view"];
				d3.select("#checkbox-simple-view").property("checked", checkboxesChecked["checkbox-simple-view"]);
				d3.select("#checkbox-detailed-view").property("checked", !checkboxesChecked["checkbox-simple-view"])
				rerenderTreeTrigger = true;
			});


		d3.select("#category-legend").selectAll("*").remove();
		d3.select("#category-legend")
			.selectAll(".legend-entry")
			.data(root.descendants().filter((d) => d.depth === 1 && d.data.text !== "Data" && d.data.text !== "Team"))
			.join("p")
			.attr("class", (d) => "legend-entry")
			.style("dominant-baseline", "middle")
			.style("font-size", "20px")
			.style("font-weight", "bold")
			.style("color", (d) => d.data.color)
			.text((d) => d.data.text)

		// research questions text in the corners (currently only works with 4)
		svg.append("g")
			.attr("id", "category-labels-wrapper")
			.selectAll(".category-labels")
			.data(root.descendants().filter((d) => d.depth === 1))//, (d) => d.data.id)
			.join("text")
			.attr("class", (d) => "category-labels")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) 
				translate(${radius + 100},0)
				rotate(${-d.x * 180 / Math.PI + 90}) `)
			/*.attr("transform", (d, i) => `translate(
			${[0,3].includes(i) ? canvasWidth / 2.0 - radius : canvasWidth / 2.0 + radius},
			${[0,1].includes(i) ? MARGIN.top : canvasHeight - MARGIN.bottom})`)*/
			.attr("text-anchor", (d) => d.x < Math.PI ? "start" : "end")
			.attr("dominant-baseline", "middle")
			.attr("font-size", "20px")
			.attr("font-weight", "bold")
			.attr("opacity", 1.0)
			.attr("fill", (d) => d.data.color)
			.text((d) => d.data.text === 'Vaccination' ? 'Publications' : d.data.text)
			.each(function(d) {
				addSVGTextLineBreaks(d3.select(this), canvasWidth / 2 - radius - 80, 0, 1.0)
			});

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

		// curves from center to leaves
		svg.append("g")
			.attr("id", "curves-wrapper-center")
			.attr("fill", "none")
			.attr("opacity", 0.0)
			.selectAll(".center-to-leaf-path")
			.data(root.links())//, (d) => d.target.data.id)
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
			.data(rootSimplified.links())//, (d) => d.target.data.id)
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
					(d) => d.data.props.data_source.some(v => leaf.data.props.data_source.includes(v)) && d !== leaf).map(
					(d) => [leaf, d]);
				}))//, (d) => `${d[0].data.id}-${d[1].data.id}`)
			.join("path")
			.attr("class", "leaf-to-leaf-path")
			.attr("fill", "tansparent")
			.attr("stroke", "#d0d0d0")
			.attr("stroke-width", 1.0)
			.attr("opacity", 0.5)
			.attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)));


		if(mode === "viz-select-0") {
			const outerNodes = svg.append("g")
				.attr("id", "outer-node-group-wrapper")
				.selectAll(".outer-node-group")
				.data(root.descendants().filter((d) => d.children && d3.sum(d.children.map((child) => child.children !== undefined ? 1 : 0)) === 0))//, (d) => d.data.id)
				.join("g")
				.attr("class", "outer-node-group")
				.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${radius + 130},0)`)

			outerNodes.append("circle")
				.attr("fill", (d) => d.data.color)
				.attr("r", 10)
				.style("cursor", "pointer")
		}

		// texts (leaves etc.)
		const node = svg.append("g")
			.attr("id", "node-group-wrapper")
			.selectAll(".node-group")
			.data(root.descendants())//, (d) => d.data.id)
			.join("g")
			.attr("class", "node-group")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`);

		node.append("text")
			.attr("class", "node-text node-text-1st-line")
			.attr("id", (d) => `${d.data.id}-text`)
			.attr("dy", "0em")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			//.attr("opacity", (d) => d.data.depth > 2 ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
			.attr("font-size", "10px")
			.style("pointer-events", "none")
			.text((d) => mode === "viz-select-0" ? null : d.data.text.slice(0,10) + '...');
		/*node.append("text")
			.attr("class", "node-text node-text-2nd-line")
			.attr("id", (d) => `${d.data.id}-text-2nd-line`)
			.attr("dy", "1em")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			//.attr("opacity", (d) => d.data.depth > 2 ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
			.attr("font-size", "10px")
			.style("pointer-events", "none");*/
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
			.data(rootSimplified.descendants())//, (d) => d.data.id)
			.join("g")
			.attr("class", "node-group-simplified")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`);


		nodeSimplified.append("text")
			.attr("class", "node-text node-text-1st-line")
			.attr("id", (d) => `${d.data.id}-text`)
			.attr("dy", "0em")
			.attr("paint-order", "stroke")
			.attr("stroke", "white")
			.attr("stroke-width", 3)
			.attr("opacity", (d) => d.data.depth === 2 ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
			.attr("font-size", "10px")
			.style("pointer-events", "none");
		nodeSimplified.filter((d) => !d.children).append("rect")
			.attr("class", "text-leaf-interact-area")
			.attr("fill", "transparent")
			.attr("opacity", 0.5)
			.attr("y", -10)
			.attr("width", 150)
			.attr("height", 30)
			.style("cursor", "pointer")


		// ---- //
		setMouseEvents();

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

		node.filter((d) => d.depth !== 0 && d.children && d.data.visible).append("circle")
			.attr("class", "node-interact-area")
			.attr("fill", "transparent")
			.attr("opacity", 1.0)
			.attr("r", 8)
			.style("pointer-events", !simplifiedMode && mode === "viz-select-0" ? "all" : "none")
			.style("cursor", (d) => d.data.visible ? "pointer" : "initial")
			.attr("transform", "translate(4,0)")
			.on("mouseover", function(event, d) {
				//if(d.data.visible)
					d3.select(this).attr("stroke-width", "2").attr("stroke", "#d0d0d0");
			})
			.on("mouseleave", function(event, d) {
				d3.select(this).attr("stroke-width", "0").attr("stroke", "transparent");
			})
			.on("click", (event, d) => {
				//if(d.data.visible)
					nodeOnClick(d)
			});

		if(mode === "viz-select-0") {
			d3.selectAll("#curves-wrapper-center").attr("opacity", 1.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 0.0);
		} else {
			d3.selectAll("#curves-wrapper-center").attr("opacity", 0.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 1.0);
		}

		updateLeafTextAppearence();
		rerenderTree(false);
	};

	const setMouseEvents = () => {
		d3.selectAll(".text-leaf-interact-area,.outer-node-group,.category-labels")
			.on("click", (event, d) => {
				event.stopPropagation();
				if(!d3.select("#sticky-tooltip").empty()) {
					d3.select("#sticky-tooltip").remove();
					d3.select("#sticky-tooltip-overlay").remove();
				}
				d3.select(".canvas-wrapper")
					.append('div')
					.attr('id', 'sticky-tooltip-overlay')
					.style('position', 'fixed')
					.style('left', '0')
					.style('top', '0')
					.style('width', '100%')
					.style('height', '100%')
					.style('opacity', '0.6')
					.style('background', '#ffffff')

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
					let left = event.pageX + TOOLTIP_WIDTH >= width - 20 ? event.pageX - TOOLTIP_WIDTH - 10 : event.pageX + 10;
					let top = event.pageY + boundingRect.height >= height - 20 ? event.pageY - boundingRect.height - 10 : event.pageY + 10;

					if(left < 5) left = 5;
					if(top < 5) top = 5;

					const stickyTooltip = d3.select("#hover-tooltip.tooltip").clone(true)
						.attr("id", "sticky-tooltip")
						.style("display", "block")
						.style("left", `${boundingRect.left}px`)
						.style("top", `${boundingRect.top}px`)
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
									if(startPos[0] + deltaX > width - TOOLTIP_WIDTH) {
										deltaX = (width - TOOLTIP_WIDTH) - startPos[0];
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
								d3.select("#curves-wrapper-leaves").selectAll(".leaf-to-leaf-path")
									.attr("stroke", "#d0d0d0")
									.attr('stroke-width', 1)
									.raise();
								selectedNode = undefined;
							}
							d3.select("#sticky-tooltip").remove();
							d3.select("#sticky-tooltip-overlay").remove();
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
						d3.select("#curves-wrapper-leaves").selectAll(".leaf-to-leaf-path")
							.attr("stroke", "#d0d0d0")
							.attr('stroke-width', 1)
							.raise();
					}
					selectedNode = d;

					//d3.select("#curves-wrapper-leaves").selectAll(".leaf-to-leaf-path").filter((d_) => d_[0].data.id === d.data.id || d_[1].data.id === d.data.id)
					d3.select("#curves-wrapper-leaves").selectAll(".leaf-to-leaf-path")
						.filter((d_) => (["Data","Team"].includes(getParentWithDepth(d_[0], 1).data.text) || ["Data","Team"].includes(getParentWithDepth(d_[1], 1).data.text)) && (d_[0].data.id === d.data.id || d_[1].data.id === d.data.id))
						.attr("stroke", "#0632E4")
						.attr('stroke-width', 2)
						.raise();

					if(mode === "viz-select-1") {
						const connectedNodes = d3.selectAll('.node-group').filter((d_) => 
							d_.data.props.data_source && d_.data.props.data_source.some(v => d.data.props.data_source.includes(v)) && d !== d_)

						connectedNodes.filter((d_) => 
								d_.data.props.data_source && d_.data.props.data_source.some(v => d.data.props.data_source.includes(v)) && (["Data","Team"].includes(getParentWithDepth(d_, 1).data.text) || d === d_)).selectAll('.node-text')
							.attr('font-weight', 'bold')
							.attr('font-size', checkboxesChecked["checkbox-text-size"] ? "90%" : '150%')
							.attr('fill', '#000000')
							.attr('stroke', checkboxesChecked['checkbox-white-backgrounds'] ? '#ffffff' : '#0632E4')
							.attr('stroke-width', checkboxesChecked['checkbox-white-backgrounds'] ? 10 : 1)


						console.log(d3.selectAll('#sticky-tooltip .table-main .tooltip-tbody .papers-list-item'));
						console.log(d3.selectAll('#sticky-tooltip .table-main .tooltip-tbody .papers-list-item').data());

						if(["Data","Team"].includes(getParentWithDepth(d, 1).data.text)) {

							const connectedPublications = connectedNodes.filter((d_) => d_ !== d).data();

							d3.selectAll('#sticky-tooltip .table-main .tooltip-tbody .papers-list-item')
								.data(connectedPublications)
								.on("click", (event, d) => {

									let i = connectedPublications.indexOf(d)

									const entry = d3.select(`#sticky-tooltip #publications-list-tooltip-item-${i} .papers-list-item-content`);
									const collapsed = entry.attr("data-collapsed")

									if(collapsed === "true") {
										entry.attr("data-collapsed", "false")
											.style("display", "block")
											.transition("appear")
											.duration(750)
											.ease(d3.easeQuadOut)
											.style("height", "auto")

										d3.select(`#publications-list-tooltip-item-${i} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
											.attr("transform", "translate(256,256) rotate(180) translate(-256,-256)");
									} else {
										entry.attr("data-collapsed", "true")
										.style("display", "none")
											.transition("appear")
											.duration(400)
											.ease(d3.easeQuadOut)
											.style("height", "0")

										entry.attr("data-collapsed", "true")
											.transition("display")
											.delay(400)
											.style("display", "none");

										d3.select(`#publications-list-tooltip-item-${i} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
											.attr("transform", "translate(256,256) rotate(90) translate(-256,-256)");
									}
								});

							d3.selectAll('#sticky-tooltip .table-main .tooltip-tbody .papers-list-item .button-publication-link')
								.data(connectedPublications)
								.on("click", (event, d) => {
									event.stopPropagation();
									window.open(d.data.props.publication_link);
								});
						}
					}
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
					/*topicRow.append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
						.append("p")
						.style("font-weight", "bold")
						.text("")*/
					topicRow.append("td").style("text-align", "left")
						.append("p")
						.style("font-weight", "bold")
						.text(d.data.text);

					/*const researchQuestion = getParentWithDepth(d, 2);
					const researchQuestionRow = d3.select("#hover-tooltip .tooltip-tbody").append("tr");
					researchQuestionRow.append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
					.append("p")
					.style("font-weight", "bold")
					.text("Research Question")
					researchQuestionRow.append("td").append("p").text(researchQuestion.data.text);
					const subquestion = getParentWithDepth(d, 3);
					if(subquestion) {
					const subquestionRow = d3.select("#hover-tooltip .tooltip-tbody").append("tr");
					subquestionRow.append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
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
										.style("width", `${TOOLTIP_WIDTH * 0.35}px`);
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
							mainInfoRow.append("tr").append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
								.append("p")
								.style("font-weight", "bold")
								.text(key)
							mainInfoRow.append("tr").append("td")
								.style("padding-bottom", "5px")
								.append("p")
								.text(value);
						}
					});
					if(mode === "viz-select-1") {

						d3.select("#hover-tooltip .table-main .tooltip-tbody").append("tr").append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
							.append("p")
							.style("font-weight", "bold")
							.text("Connections")

						let connectedNodes;

						if(["Data","Team"].includes(getParentWithDepth(d, 1).data.text)) {
							connectedNodes = d3.selectAll('.node-group').filter((d_) => 
								d_.data.props.data_source && d_.data.props.data_source.some(v => d.data.props.data_source.includes(v)));

							// accordion

							const tooltipConnectionRow = d3.select("#hover-tooltip .table-main .tooltip-tbody");

							tooltipConnectionRow.append("tr").append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
								.append("p")
								.style("font-weight", "bold")
								.text("Publications")

							const publicationsList = tooltipConnectionRow.append("tr").append("td")
								.selectAll(".papers-list-item")
								.data(connectedNodes.filter((d_) => d_ !== d).data())
								.join("div")
								.attr("id", (d, i) => `publications-list-tooltip-item-${i}`)
								.attr("class", "papers-list-item")
								.style("cursor", "pointer")
								.style("border", "1px solid #d0d0d0")
								.style("padding", "0 10px")
								.style("pointer-events", "all")

							publicationsList.append("p")
								.style("width", "80%")
								.style("float", "left")
								.style("margin", "10px 0")
								.text((d) => d.data.text)

							publicationsList.append("svg")
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

							publicationsList.append("div")
								.style("clear", "both");

							const publicationsListContent = publicationsList.append("div")
								.attr("class", "papers-list-item-content")
								.attr("data-collapsed", "true")
								.style("display", "none");

							publicationsListContent.each(function (d) {
								let collapsibleInfo = false;
								Object.keys(d.data.props.info_main).forEach((key) => {
									if(d.data.props.info_main[key] && d.data.props.info_main[key] !== "") {
										collapsibleInfo = true;
										d3.select(this).append("p")
											.style("font-weight", "bold")
											.text(key.replace("[INFO_MAIN]", ""));
										d3.select(this).append("p")
											.style("padding-bottom", "5px")
											.text(d.data.props.info_main[key]);
									}
								});

								if(d.data.props.publication_link && d.data.props.publication_link !== "") {

									collapsibleInfo = true;
									d3.select(this).append("center").append("button")
										.attr("class", "button-publication-link")
										.attr("type", "button")
										.style("margin-bottom", "10px")
										.text("Go to publication")
										
									
								}
								if(!collapsibleInfo) {
									d3.select(this).append("p")
										.style("font-weight", "bold")
										.text("No additional information.");
								}
							});

							//
						} else {
							connectedNodes = d3.selectAll('.node-group').filter((d_) => 
								d_.data.props.data_source && d_.data.props.data_source.some(v => d.data.props.data_source.includes(v)) && (["Data","Team"].includes(getParentWithDepth(d_, 1).data.text) || d === d_));

							connectedNodes.filter((d_) => d_ !== d).each((d_) => {
								const mainInfoRow = d3.select("#hover-tooltip .table-main .tooltip-tbody");
								mainInfoRow.append("tr").append("td")
									.style("padding-bottom", "3px")
									.append("p")
									.text(d_.data.text);
							});
						}
						

						connectedNodes.selectAll('.node-text')
							.attr('font-weight', 'bold')
							.attr('font-size', checkboxesChecked["checkbox-text-size"] ? "90%" : '150%')
							.attr('fill', '#000000')
							.attr('stroke', checkboxesChecked['checkbox-white-backgrounds'] ? '#ffffff' : '#0632E4')
							.attr('stroke-width', checkboxesChecked['checkbox-white-backgrounds'] ? 10 : 1)
					}
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
						collapsedInfoRow.append("tr").append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
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
				else {


					d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "block").style("pointer-events", "all");
				}

				if(selectedNode === undefined) {
					d3.selectAll(`#${d.data.id}-text,#${d.data.id}-text-2nd-line`).style("font-weight", "bold");

					d3.select("#curves-wrapper-leaves").selectAll(".leaf-to-leaf-path")
						.filter((d_) => (["Data","Team"].includes(getParentWithDepth(d_[0], 1).data.text) || ["Data","Team"].includes(getParentWithDepth(d_[1], 1).data.text)) && (d_[0].data.id === d.data.id || d_[1].data.id === d.data.id))
							.attr("stroke", "#0632E4")
							.attr('stroke-width', 2)
							.raise();
				}
			})
			.on("mousemove", (event, d) => {
				//if(d3.select("#sticky-tooltip").empty()) {
				const boundingRect = d3.select("#hover-tooltip.tooltip").node().getBoundingClientRect();
				const pointerPos = [event.pageX, event.pageY];


				if(mode === "viz-select-0") {
					//const left = event.pageX + TOOLTIP_WIDTH >= width - 20 ? event.pageX - TOOLTIP_WIDTH - 10 : event.pageX + 10;
					//const top = event.pageY + boundingRect.height >= height - 20 ? event.pageY - boundingRect.height - 10 : event.pageY + 10;
					let left = event.pageX;
					let top = event.pageY;

					if(left + TOOLTIP_WIDTH >= width - 20)
						left -= left + TOOLTIP_WIDTH - (width - 20)
					if(left < 20)
						left -= (left - 20);
					if(top + boundingRect.height >= height - 20)
						top -= top + boundingRect.height - (height - 20)
					if(top < 20)
						top -= (top - 20);

					d3.select("#hover-tooltip.tooltip")
						.style("left", `${left}px`)
						.style("top", `${top}px`)
						.style("width", `${TOOLTIP_WIDTH}px`)
						.style("display", checkboxesChecked["checkbox-second-tooltip"] || d3.select("#sticky-tooltip").empty() ? "block" : "none")
						.raise();
				} else {
					let left = event.pageX + 10;
					let top = event.pageY + 10;
					const xOffset = pointerPos[0] < width / 2.0 
						? (radius - pointerPos[0]) - TOOLTIP_WIDTH * 0.7 
						: pointerPos[0] - radius;
					const y = (top - height / 2.0) / (outerRadius);
					let x = Math.sqrt(1 - Math.pow(y, 2)) * outerRadius;

					if(pointerPos[0] < width / 2.0)
						left = x * -1.0 + width / 2.0 - TOOLTIP_WIDTH * 0.7;
					else
						left = x + width / 2.0;


					/*if(left + TOOLTIP_WIDTH >= width - 20)
						left -= left + TOOLTIP_WIDTH - (width - 20);
					if(left < 20)
						left -= (left - 20);
					if(top + boundingRect.height >= height - 20)
						top -= top + boundingRect.height - (height - 20)
					if(top < 20)
						top -= (top - 20);*/

					d3.select("#hover-tooltip.tooltip")
						//.style("left", `${pointerPos[0] + xOffset + 10}px`)
						.style("left", `${left}px`)
						.style("top", `${pointerPos[1] + 10}px`)
						.style("width", `${TOOLTIP_WIDTH * 0.7}px`)
						.style("display", checkboxesChecked["checkbox-second-tooltip"] || d3.select("#sticky-tooltip").empty() ? "block" : "none")
						.raise();
				}
			})
			.on("mouseleave", (event, d) => {
				d3.select("#hover-tooltip.tooltip").style("display", "none");
				d3.selectAll(`#${d.data.id}-text,#${d.data.id}-text-2nd-line`).style("font-weight", null);
				if(selectedNode === undefined) {
					d3.select("#curves-wrapper-leaves").selectAll(".leaf-to-leaf-path")
						.attr("stroke", "#d0d0d0")
						.attr('stroke-width', 1)
						.raise();
				}

				if(mode === "viz-select-1" && d3.select("#sticky-tooltip").empty()) {
					d3.selectAll('.node-text')
						.attr('font-weight', null)
						.attr('font-size', checkboxesChecked["checkbox-text-size"] ? "70%" : "100%")
						.attr("fill", (d) => d.data.color)
						.attr('stroke', null)
						.attr('stroke-width', null);
				}
			});
	}

	$:if(rerenderTreeTrigger !== null) {
		rerenderTree(rerenderTreeTrigger);
		rerenderTreeTrigger = null;
	}

	$:if(data && radius) {
		createCollapsableRadialTree(data, separationFunction, radius)
	}

	$:if(mode) {
	}

</script>

<div id="main-viz-wrapper" style="opacity: 0.0;display: none;">

	<div class="canvas-wrapper" >
		<svg id="d3-canvas" opacity="0.0"/>
	</div>

	<!-- tooltip -->

	<div id="tooltip-wrapper">
		<div id="hover-tooltip" class="tooltip" style="display:none;z-index:99;">
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
	<Controls bind:visible={controlsVisible} bind:presets bind:checkboxesChecked bind:rerenderTreeTrigger bind:mode bind:root/>

	<!-- additional controls -->

	<div id="back-button" style="display: none;position: absolute;color:#808080;font-size:80%;cursor:pointer;">
		&lt; back to simplified version (TabView)
	</div>
	<div id="help-button" style="display: none;position: absolute;color:#808080;font-size:400%;font-weight: bold;cursor:pointer;">
		?
	</div>

</div>