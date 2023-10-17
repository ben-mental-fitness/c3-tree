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
	export let dataSimplified;
	export let root;
	export let rootSimplified;

	// for controls
	export let controlsVisible;
	export let presets;
	export let checkboxesChecked;
	export let rerenderTreeTrigger;
	export let mode;
	
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

		d3.select("#d3-canvas").selectAll("#main-transform").remove();
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
				simplifiedMode = !simplifiedMode;
				rerenderTree();
			});


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
			${[0,1].includes(i) ? MARGIN.top : canvasHeight - MARGIN.bottom})`)*/
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
					let left = event.pageX + TOOLTIP_WIDTH >= width - 20 ? event.pageX - TOOLTIP_WIDTH - 10 : event.pageX + 10;
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
						.style("display", checkboxesChecked["checkbox-second-tooltip"] || d3.select("#sticky-tooltip").empty() ? "block" : "none")
						.raise();
				} else {
					let left = event.pageX + 10;
					let top = event.pageY + 10;
					const xOffset = pointerPos[0] < width / 2.0 
					? (radius - pointerPos[0]) - TOOLTIP_WIDTH 
					: pointerPos[0] - radius;
					const y = (top - height / 2.0) / (outerRadius);
					let x = Math.sqrt(1 - Math.pow(y, 2)) * outerRadius;

					if(pointerPos[0] < width / 2.0)
						left = x * -1.0 + width / 2.0 - TOOLTIP_WIDTH;
					else
						left = x + width / 2.0;

					if(left + TOOLTIP_WIDTH >= width - 20)
						left -= left + TOOLTIP_WIDTH - (width - 20);
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
						.style("display", checkboxesChecked["checkbox-second-tooltip"] || d3.select("#sticky-tooltip").empty() ? "block" : "none")
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

	$:if(rerenderTreeTrigger !== null) {
		rerenderTree(rerenderTreeTrigger);
		rerenderTreeTrigger = null;
	}

	$:if(data && radius) [
		createCollapsableRadialTree(data, separationFunction, radius)
	]

</script>

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
	<Controls bind:visible={controlsVisible} bind:presets bind:checkboxesChecked bind:rerenderTreeTrigger bind:mode bind:root/>

	<!-- additional controls -->

	<div id="back-button" style="display: none;position: absolute;color:#808080;font-size:80%;cursor:pointer;">
		&lt; back to simplified version
	</div>
	<div id="help-button" style="display: none;position: absolute;color:#808080;font-size:400%;font-weight: bold;cursor:pointer;">
		?
	</div>

</div>