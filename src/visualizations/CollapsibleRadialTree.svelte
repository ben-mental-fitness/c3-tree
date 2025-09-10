<script type="text/javascript">
	import * as d3 from 'd3';

	import Controls from '../components/Controls.svelte';

	import { addSVGTextLineBreaks } from '../helper/addSVGTextLineBreaks';
	import { updateLeafTextAppearence } from '../helper/updateLeafTextAppearence';
	import { getParentWithDepth } from '../helper/getParentWithDepth';
    import { setTreeVisibility } from '../helper/setTreeVisibility';
    import { radialTreeLineFunction, connectedEdgesLineFunction, separationFunction } from '../helper/d3Functions';
	import { renderLegend } from "../helper/renderLegend";
  	
	// Bound to App.svelte
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
	// export let rawData;
	export let dataConnections;
	export let dataSimplified;
	export let root;
	// export let rootConnections;
	export let rootSimplified;

	// for controls
	export let controlsVisible;
	export let presets;
	export let checkboxesChecked;
	export let rerenderTreeTrigger;
	export let mode;
	let prevMode = "viz-select-0";
	let prevShowLeafTitles;
	export let categoryLegendVisible;
	export let loaderVisible;
	export let currentTextScale;
	
	let selectedNode = undefined;
	let focusElement = undefined;
	let highlightedPaths = {"_groups" : [[]]};
	let visMode2Nodes = undefined; 

	// Update visible teams array & refresh the view 
	const nodeOnClick = (d) => {
		console.log("Unexpected Event Triggered: nodeOnClick");
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

	// Clone the node & return a new, filtered object
	const filterTree = (node, condition)=> {
	    let newNode = {...node};
	    if (node.children) {
	        newNode.children = node.children.filter(condition).map(child => filterTree(child, condition));
	    }
	    return newNode;
	}


	const rerenderTree = async (animated = true) => {
		if(!root || !rootSimplified) return;

		if(mode !== prevMode) {
			prevMode = mode;
			if(mode === "viz-select-0")
				createCollapsableRadialTree(data, separationFunction, radius)
			else
				createCollapsableRadialTree(dataConnections, separationFunction, checkboxesChecked["checkbox-leaf-titles"] ? radius : outerRadius - 25)
			return;
		}

		// Update font sizes
		d3.selectAll("#controls-wrapper span").style("font-size", currentTextScale.Controls);
		document.getElementById("d3-canvas").style.fontSize = currentTextScale.D3Canvas;
		document.getElementById("help-button").style.fontSize = currentTextScale.HelpButton;
		document.getElementById("back-button").style.fontSize = currentTextScale.BackButton;
		
		// Define visible elements
		const filteredRoot = root;
		categoryLegendVisible = !simplifiedMode && checkboxesChecked["checkbox-legend"];
		simplifiedMode = checkboxesChecked["checkbox-simple-view"];
		controlsVisible = !simplifiedMode;

		// Visualisation rotation
		twist = twist > Math.PI * 2.0 ? twist - Math.PI * 2.0 : twist;
		twist = twist < 0 ? twist + Math.PI * 2.0 : twist;

		d3.select("#twist-circle")
			.attr("r", outerRadius + (mode === "viz-select-1" && !simplifiedMode ? 80 : 0))

		// Increase visualisation radius when leaf titles are not visible
		const treeFunction = d3.cluster().size([2 * Math.PI, (checkboxesChecked["checkbox-leaf-titles"] ? radius : outerRadius - 25) + (mode === "viz-select-1" && !simplifiedMode ? 80 : 0)]);
		treeFunction.separation(separationFunction)(filteredRoot);
		treeFunction.separation(separationFunction)(rootSimplified);

		const animation = d3.transition().duration(animated ? 750 : 0).ease(d3.easeQuadOut);

		d3.select("#twist-circle")
			.transition(animation)
			.attr("opacity", checkboxesChecked["checkbox-twist-circle"] && !simplifiedMode ? 1.0 : 0.0)		
			.style("pointer-events", checkboxesChecked["checkbox-twist-circle"] && !simplifiedMode ? "visibleStroke" : "none")
		d3.selectAll("#twist-circle-small-g *")
			.transition(animation)
			.attr("opacity", checkboxesChecked["checkbox-twist-circle"] || simplifiedMode ? 0.0 : 1.0)
			.style("pointer-events", checkboxesChecked["checkbox-twist-circle"] ? "none" : "visibleStroke")

		d3.select("#main-transform")
			.attr("transform", `translate(${canvasWidth / 2.0},${canvasHeight / 2.0}) rotate(${twist * 180 / Math.PI})`);
		
		document.getElementById('curves-wrapper-leaves-img').style.opacity = !simplifiedMode && mode === "viz-select-1" ? "1.0" : "0.0";
		document.getElementById('curves-wrapper-leaves-img').style.transform = `rotate(${twist * 180 / Math.PI}deg)`;

		d3.select("#curves-wrapper-center")
			.transition(animation)
			.attr("opacity",  !simplifiedMode && mode === "viz-select-0" ? 1.0 : 0.0)
		d3.select("#curves-wrapper-simplified")
			.transition(animation)
			.attr("opacity",  simplifiedMode ? 1.0 : 0.0)

		// Add leaf paths from center for cluster view
		if (!simplifiedMode && mode === "viz-select-0") { 
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
		}

		d3.select("#curves-wrapper-leaves")
			.transition(animation)
			.attr("opacity",  !simplifiedMode && mode === "viz-select-1" ? 1.0 : 0.0);
		
		// Create connected view and display as PNG
		if (!simplifiedMode && mode === "viz-select-1") {
			// TODO - Combine this and set visibility lines
			// Recreate leaf-to-leaf paths if non-existent
			if (d3.select("#curves-wrapper-leaves").selectChildren()["_groups"][0].length == 0) {
				const leaves = root.leaves();
				const svg = d3.select("#curves-wrapper-leaves")
					.selectAll("path")
					.data(leaves.flatMap((leaf) => {
						return leaves.filter(
							(d) => d.data.props.data_source.some(v => leaf.data.props.data_source.includes(v)) && d !== leaf).map(
							(d) => [leaf, d]);
						}))
					.join("path")
					.attr("class", "leaf-to-leaf-path")
					.attr("fill", "tansparent")
					.attr("stroke", "#d0d0d0")
					.attr("stroke-width", 1.0)
					.attr("opacity", 0.5)
					.attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)));
			}

			// Set visibility
			d3.select("#curves-wrapper-leaves")
				.selectAll(".leaf-to-leaf-path")
				.data(filteredRoot.leaves().flatMap((leaf) => {
					return filteredRoot.leaves().filter(
						(d) => d.data.props.data_source.some(v => leaf.data.props.data_source.includes(v)) && d !== leaf).map(
						(d) => [leaf, d]);
				}))
				.call((update) => {
					update.attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)))
						.attr("opacity", (d) => d[0].data.visible && d[1].data.visible ? 0.1 : 0.0);
				});

			// Wait 1 secs & convert to PNG
			setTimeout(() => {
				const svgWrapper = document.querySelector("#d3-canvas");
				const width = parseInt(svgWrapper.getAttribute('width'));
				const height = parseInt(svgWrapper.getAttribute('height'));
				const svgExport = document.querySelector("#curves-wrapper-leaves");
											
				const svgData = 
					`<svg opacity="1.0" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0,0,${width},${height}" width="${width}" height="${height}">
					<g id="main-transform" transform="translate(${width / 2},${height / 2}) rotate(0)">
					${new XMLSerializer().serializeToString(svgExport)}
					</g></svg>`;

				const svgDataBase64 = btoa(unescape(encodeURIComponent(svgData)));
				const svgDataUrl = `data:image/svg+xml;base64,${svgDataBase64}`;
				const image = new Image();

				image.onload = (() => {
					const width = svgWrapper.getAttribute('width');
					const height = svgWrapper.getAttribute('height');
					const canvas = document.createElement('canvas');

					canvas.setAttribute('width', width);
					canvas.setAttribute('height', height);
					canvas.style.width = width;
					canvas.style.height = height;

					const context = canvas.getContext('2d');
					context.beginPath();
					context.drawImage(image, 0, 0, parseInt(width), parseInt(height));
					context.fill();

					document.getElementById("canvas-wrapper").append(canvas);

					const dataUrl = canvas.toDataURL('image/png');
					document.getElementById('curves-wrapper-leaves-img').src = dataUrl;

					d3.select("#curves-wrapper-leaves").selectAll("*").remove();
					canvas.remove();
				})

				image.setAttribute("src", svgDataUrl);
				image.setAttribute("alt", "Something went wrong.");
			}, 1000)
		}

		// Outer large circles on cluster visualisation
		d3.select("#outer-node-group-wrapper")
			.transition(animation)
			.attr("opacity",  !simplifiedMode ? 1.0 : 0.0)
		
		if (!simplifiedMode) { 
			d3.select("#outer-node-group-wrapper")
				.selectAll(".outer-node-group")
				.data(filteredRoot.descendants().filter((d) => d.children && d3.sum(d.children.map((child) => child.children !== undefined ? 1 : 0)) === 0))//, (d) => d.data.id)
				.transition(animation)
				.attr("class", "outer-node-group")
				.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${radius + 130},0)`)
				.attr("opacity", (d) => d.data.visible ? 1 : 0)
				.style("pointer-events", (d) => d.data.visible && !simplifiedMode ? "all" : "none")
		}

		// Cluster group visualisation elements
		const nodes = d3.selectAll("#node-group-wrapper").selectAll(".node-group")
			.data(filteredRoot.descendants());

		const enter = nodes.enter()
			.append('g')
			.attr("class", "node-group")

		enter.append("text")
			.attr("class", "node-text node-text-1st-line")
			.attr("dy", "0em")
			.attr("id", (d) => `${d.data.id}-text`)
			.text((d) => mode === "viz-select-0" ? null : d.data.text.slice(0,10) + '...')
		
		enter.filter((d) => !d.children).append("rect")
			.attr("class", "text-leaf-interact-area")
			.attr("fill", "transparent")
			.attr("opacity", 0.5)
			.attr("y", -10)
			.attr("width", 70)
			.attr("height", 30)
			.style("cursor", "pointer")

		const exit = nodes.exit().remove();

		const update = enter.merge(nodes);

		update.transition(animation)
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) 
			translate(${d.depth === 1 ? 55 : d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`)

		update.selectAll(".node-text")
			.attr("x", (d) => {
				const angle = (d.x + twist) % (Math.PI * 2.0);
				return angle < Math.PI ? 12 : -12;
			})
			.attr("text-anchor", (d) => {
				const angle = (d.x + twist) % (Math.PI * 2.0);
				return angle < Math.PI ? "start" : "end";
			})
			.attr("transform", (d) => {
				const angle = (d.x + twist) % (Math.PI * 2.0);
				return `rotate(${angle >= Math.PI ? 180 : 0})`;
			})

		d3.selectAll(".node-text").transition(animation)
			.attr("opacity", (d) => (d.data.depth > 2 || d.data.depth === d.data.maxDepth) && (d.data.visible || d.parent?.data.visible) && checkboxesChecked["checkbox-leaf-titles"] && !simplifiedMode && !d.children ? 1.0 : 0.0)
			.attr("font-size", currentTextScale.NodeText)

		update.selectAll(".text-leaf-interact-area")
			.style("pointer-events", (d) => d.data.visible && !simplifiedMode ? "all" : "none");

		d3.selectAll("#node-group-wrapper .node-circle")
			.transition(animation)
			.attr("opacity", (d) => !simplifiedMode && (d.data.visible || d.parent?.data.visible || d.parent?.data.id === "r") && (!d.children || mode == "viz-select-0") ? 1.0 : 0.0);
			
		d3.selectAll("#node-group-wrapper .node-interact-area")
			.style("pointer-events", (d) => /* d.data.visible && */ !simplifiedMode && mode === "viz-select-0" ? "all" : "none")

		// Simplified cluster view
		d3.selectAll("#node-group-simplified-wrapper .node-group-simplified")
			.data(rootSimplified.descendants())//, (d) => d.data.id)
			.call((update) => {
				update.transition(animation)
					.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) 
					translate(${d.depth === 1 ? 55 : d.y + (d.parent && d.children ? (d.parent.y - d.y) * 0.7 : 0)},0)`)

				update.selectAll(".node-text")
					.attr("x", (d) => {
						const angle = (d.x + twist) % (Math.PI * 2.0);
						return angle < Math.PI ? 12 : -12;
					})
					.attr("text-anchor", (d) => {
						const angle = (d.x + twist) % (Math.PI * 2.0);
						return angle < Math.PI ? "start" : "end";
					})
					.attr("transform", (d) => {
						const angle = (d.x + twist) % (Math.PI * 2.0);
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


		// Legend and outer labels - Publication Themes
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
				const angle = (d.x + twist) % (Math.PI * 2.0);
				return angle < Math.PI ? "start" : "end"
			})
			.attr("opacity", (d) => d.data.visible && (mode === "viz-select-0" || (mode === "viz-select-1" && !categoryLegendVisible)) ? 1.0 : 0.0)
			.attr("tabindex", (d) => d.data.visible && (mode === "viz-select-0" || (mode === "viz-select-1" && !categoryLegendVisible)) ? "0" : "-1")
			.attr("fill", (d) => d.data.color) // mode === "viz-select-1" && d.data.text === 'Vaccination' ? 'rgb(160, 160, 160)' : d.data.color)
			.text((d) => d.data.text); // mode === "viz-select-1" && d.data.text === 'Vaccination' ? 'Publications' : d.data.text)

		// Get visible nodes in connected view
		if (mode === "viz-select-1") {
			visMode2Nodes = d3.selectAll(".node-text")
				.filter((d) => (d.data.depth > 2 || d.data.depth === d.data.maxDepth) && (d.data.visible || d.parent?.data.visible) && checkboxesChecked["checkbox-leaf-titles"] && !simplifiedMode && !d.children)
		}

		setMouseEvents();
		if (mode === "viz-select-0") renderLegend(canvasWidth, canvasHeight, currentTextScale, checkboxesChecked["checkbox-legend"]);
	};

	const createCollapsableRadialTree = (data, separationFunction, radius) => {
		root = d3.hierarchy(data);
		rootSimplified = d3.hierarchy(dataSimplified);

		const treeFunction = d3.cluster().size([2 * Math.PI, radius]);
		
		treeFunction.separation(separationFunction)(root);
		treeFunction.separation(separationFunction)(rootSimplified);

		// Set data visibility based on checkboxes
		root.descendants().forEach((d) => {
			if(['Mental Health ','Healthcare disruption','Society & Health ','Serology ','Long Covid ','OpenSAFELY','Other ','Treatment '].includes(d.data.text))
				setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-themes-publications"]);
			if(d.data.text === 'Data')
				setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-data-sources"]);
			if(d.data.text === 'Team' || d.data.text === 'Teams')
				setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-team"]);
		});

		// Remove highlighted paths if body is clicked
		d3.select("body").on("click", (event) => {
			if(!d3.select("#sticky-tooltip").empty()) {
				if (highlightedPaths._groups[0].length > 0) {
					highlightedPaths.remove();
				}
				selectedNode = undefined;
				d3.select("#sticky-tooltip").remove();

				if(mode === "viz-select-1") {
					d3.selectAll('.node-text')
						.attr('font-weight', null)
						.attr("fill", (d) => d.data.color)
						.attr('stroke', null)
						.attr('stroke-width', null);
				}
			}
			if (d3.select("#sticky-tooltip-overlay")) d3.select("#sticky-tooltip-overlay").remove();
		});

		// Empty the canvas, ready to rebuild
		//d3.select("#d3-canvas").selectAll("#main-transform").remove();
		d3.select("#d3-canvas").selectAll("*").remove();
		const svg = d3.select("#d3-canvas")
			.attr("viewBox", [0, 0, canvasWidth, canvasHeight])
			.attr("width", canvasWidth)
			.attr("height", canvasHeight)
			.append("g")
			.attr("id", "main-transform")
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
				${height / 2.0 - radius * BRAIN_SIZE / 2.0 * BRAIN_ASPECT_RATIO})`);
			// REMOVED CENTER ICON CLICK FUNCTIONALITY
			// .on("click", (event) => {
			// 	checkboxesChecked["checkbox-simple-view"] = !checkboxesChecked["checkbox-simple-view"];
			// 	d3.select("#checkbox-simple-view").property("checked", checkboxesChecked["checkbox-simple-view"]);
			// 	d3.select("#checkbox-detailed-view").property("checked", !checkboxesChecked["checkbox-simple-view"])
			// 	rerenderTreeTrigger = true;
			// });

		// Repopulate legend
		d3.select("#category-legend").selectAll("*").remove();
		d3.select("#category-legend")
			.selectAll(".legend-entry")
			.data(root.descendants().filter((d) => d.depth === 1 && d.data.text !== "Data" && d.data.text !== "Team"))
			.join("p")
			.attr("class", (d) => "legend-entry")
			.style("dominant-baseline", "middle")
			.style("font-size", currentTextScale.CategoryLegend)
			.style("font-weight", "bold")
			.style("color", (d) => d.data.color)
			.text((d) => d.data.text)

		// research questions text in the corners (currently only works with 4)
		svg.append("g")
			.attr("id", "category-labels-wrapper")
			.selectAll(".category-labels")
			.data(root.descendants().filter((d) => d.depth === 1))//, (d) => d.data.id)
			.join("text")
			.attr("class", "category-labels")
			.attr("transform", (d) => `rotate(${d.x * 180 / Math.PI - 90}) 
				translate(${radius + 100},0)
				rotate(${-d.x * 180 / Math.PI + 90}) `)
			.attr("text-anchor", (d) => d.x < Math.PI ? "start" : "end")
			.attr("font-size", currentTextScale.CategoryLabels)
			.attr("dominant-baseline", "middle")
			.attr("font-weight", "bold")
			.attr("opacity", 1.0)
			.attr("fill", (d) => d.data.color)
			.text((d) => d.data.text) // d.data.text === 'Vaccination' ? 'Publications' : d.data.text)
			.each(function(d) {
				addSVGTextLineBreaks(d3.select(this), canvasWidth / 2 - radius - 80, 0, 1.0)
			});

		// Outer, grey rotation circle
		// TODO: Make rotation instant again
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
				const startAngle = 2 * Math.PI - twist;

				d3.select("body")
					.on("mousemove.twistCircle", (event) => {
						const x = canvasWidth / 2.0 - event.clientX;
						const y = canvasHeight / 2.0 - event.clientY;
						const angle = Math.atan2(x, y);

						const deltaAngle = lastAngle - angle;
						twist += deltaAngle;
						lastAngle = angle;
						
						d3.select("#twist-circle-scalar").remove();
						const arc = d3.arc()
							.innerRadius(outerRadius + (mode === "viz-select-1" && !simplifiedMode ? 80 : 0) - 5)
							.outerRadius(outerRadius + (mode === "viz-select-1" && !simplifiedMode ? 80 : 0) + 5)
							.startAngle(0) 
							.endAngle((startAngle + twist) % (2 * Math.PI)); 

						svg.append("path")
							.attr("d", arc)
							.attr("transform", `rotate(${startAngle * (180/ Math.PI)})`)
							.attr("id", "twist-circle-scalar")
							.attr("fill", "none")
							.attr("stroke", "#000000");
					})
					.on("mouseleave.twistCircle,mouseup.twistCircle", (event) => {
						d3.select("body")
							.on("mousemove.twistCircle", null)
							.on("mouseleave.twistCircle", null)
							.on("mouseup.twistCircle", null);

						d3.select("#twist-circle-scalar").remove();
						rerenderTree(false);
					})
					.on("mouseup", (event) => {
						d3.select("body")
							.on("mousemove.twistCircle", null)
							.on("mouseleave.twistCircle", null)
							.on("mouseup.twistCircle", null);
						
						d3.select("#twist-circle-scalar").remove();
						rerenderTree(false);
					});
			});

		// Small hidden twistcircle
		const twistCircleSmallX = canvasWidth / 2.0 + outerRadius;
		const twistCircleSmallY = canvasHeight / 2.0 + outerRadius;
		const twistCircleSmall = d3.select("#d3-canvas").append("g").attr("id", "twist-circle-small-g")
		twistCircleSmall.append("polygon")
			.attr("id", "twist-circle-small-triangle")
			.attr("points", "50 15, 100 100, 0 100")
			.attr("transform", `
				translate(${twistCircleSmallX},${twistCircleSmallY})
				scale(0.7,0.7) translate(${- 50},${- 15 - 85 / 2.0 - 11})`);
		twistCircleSmall.append("circle")
			.attr("id", "twist-circle-small")
			.attr("transform", `translate(${twistCircleSmallX},${twistCircleSmallY})`)
			.attr("r", 50)
			.style("pointer-events", "visibleStroke")
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
			.attr("fill", (d) => d.data.color)
			.style("pointer-events", "none")
			.text((d) => mode === "viz-select-0" ? null : d.data.text.slice(0,10) + '...');
		
		node.filter((d) => !d.children)
			// .attr("class", mode === "viz-select-0" ? "node-group mode-zero" : "node-group mode-one")
			.append("rect")
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
			.attr("opacity", (d) => d.data.depth === 2 ? 1.0 : 0.0)
			.attr("fill", (d) => d.data.color)
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
			.attr("transform", "translate(4,0)")
			.attr("opacity", (d) => d.depth === 0 ? 0.0 : 1.0);

		node.filter((d) => d.data.props.status).append("circle")
			.attr("class", "node-circle")
			.attr("fill", "transparent")
			.attr("stroke", (d) => d.data.color)
			.attr("stroke-width", 2)
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

		// Toggle between cluster group & connected views
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

	// Show tooltip on hover & fix on click
	const setMouseEvents = () => {
		d3.selectAll(".text-leaf-interact-area,.outer-node-group,.category-labels,.legend-entry")
			.attr("tabindex", d => d.data.visible ? "0" : "-1")
			.on("focus", (event, d) => {
				mouseOverEvent(event, d);
			})
			.on("keydown", (event, d) => {
				if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
					focusElement = event.target;
					mouseClickEvent(event, d);
				} else {
					mouseLeaveEvent(event, d);
				}
			})
			.on("click", (event, d) => {
				mouseClickEvent(event, d);
			})
			.on("mouseover", (event, d) => {
				mouseOverEvent(event, d);
			})
			// Fix tooltip to left or right depending on hovered element 
			.on("mousemove", (event, d) => {
				const boundingRect = d3.select("#hover-tooltip.tooltip").node().getBoundingClientRect();
				const pointerPos = [event.pageX, event.pageY];

				let left = event.pageX < canvasWidth / 2.0 ? canvasWidth / 2.0 + 10 : 20; 
				let top = event.pageY;

				d3.select("#hover-tooltip.tooltip")
					.style("left", `${left}px`) 
					.style("top", "100px") 
					.style('max-height', `${window.innerHeight - 120}px`)
					.style("width", `${canvasWidth / 2.0 - 30}px`)
					.style("display", checkboxesChecked["checkbox-second-tooltip"] || d3.select("#sticky-tooltip").empty() ? "block" : "none")
					.raise();
			})
			.on("mouseleave", (event, d) => {
				mouseLeaveEvent(event, d);
			});

		// Create hover tooltip
		const mouseOverEvent = (event, d) => {
			if (!document.getElementById("sticky-tooltip-overlay")) {
				d3.select(".canvas-wrapper")
					.append('div')
					.attr('id', 'sticky-tooltip-overlay')
					.style('position', 'fixed')
					.style('pointer-events', 'none')
					.style('left', '0')
					.style('top', '0')
					.style('width', '100%')
					.style('height', '100%')
					.style('max-height', `${window.innerHeight}px`)
					.style('opacity', '0.3')
					.style('background', '#ffffff');
			}


			const pointerPos = [event.pageX, event.pageY];
			d3.select("#hover-tooltip .table-main .tooltip-tbody").selectAll("*").remove();
			if(d.depth > 1) {
				const topic = getParentWithDepth(d, 1);
				d3.select("#hover-tooltip .tooltip-title")
					.style("font-size", currentTextScale.TooltipTitle)	
					.text(`TOPIC: ${topic.data.text}`);

				const topicRow = d3.select("#hover-tooltip .table-main .tooltip-tbody").append("tr");
				topicRow.append("td").style("text-align", "left")
					.append("p")
					.style("font-weight", "bold")
					.style("font-size", currentTextScale.TooltipBody)
					.text(d.data.text);
				
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
									.style("font-size", currentTextScale.TooltipBody)
									.style("font-weight", "bold")
									.style("margin-bottom", "15px")
									.text(member.name);
								infoCell.append("p")
									.style("font-size", currentTextScale.TooltipBody)
									.text(member.description);

								if(member.member_link) {

									infoCell.append("a")
										.style("font-size", currentTextScale.TooltipBody)
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
									.style("font-size", currentTextScale.MemberName)
									.text(member.name);
								
							}
						});
					} else if(value && value !== "") {
						const mainInfoRow = d3.select("#hover-tooltip .table-main .tooltip-tbody");
						mainInfoRow.append("tr").append("td").style("width", `${TOOLTIP_WIDTH * 0.2}px`)
							.append("p")
							.style("font-size", currentTextScale.TooltipBody)
							.style("font-weight", "bold")
							.text(key)
						mainInfoRow.append("tr").append("td")
							.style("padding-bottom", "5px")
							.append("p")
							.style("font-size", currentTextScale.TooltipBody)
							.text(value);
					}
				});

				// Add Publication & Altmetric buttons if data exsists
				d3.select("#tooltip-main-button-link").selectAll("*").remove();
				if (d.data.props.publication_link || d.data.props.info_collapsed.Impact) {
					let buttonLinks = d3.select("#tooltip-main-button-link");

					if(d.data.props.publication_link) {
						buttonLinks.append("button")
							.attr("type", "button")
							.attr("class", "button button-simplified button-publication-link")
							.style("pointer-events", "all")
							.style("margin", "10px")
							.style("min-width", "150px")
							.style("width", "calc(50% - 25px)")
							.text("Go to publication");
						d3.select("#hover-tooltip #tooltip-main-button-link").style("display", "block");
					}
					if(d.data.props.info_collapsed.Impact) {
						buttonLinks.append("button")
							.attr("type", "button")
							.attr("class", "button button-simplified button-altmetric-link")
							.style("pointer-events", "all")
							.style("margin", "10px")
							.style("min-width", "150px")
							.style("width", "calc(50% - 25px)")
							.text("Go to altmetric");
						d3.select("#hover-tooltip #tooltip-main-button-link").style("display", "block");
					}						
				}
				
				if(mode === "viz-select-1") {
					// Create leaf-to-leaf paths to be highlighted
					if (d3.select("#curves-wrapper-leaves").selectChildren()["_groups"][0].length == 0) {
						const leaves = root.leaves();
						highlightedPaths = d3.select("#curves-wrapper-leaves")
							.selectAll("path")
							.data(() => {
							return leaves.filter(
								(d_) => d_.data.props.data_source.some(v => d.data.props.data_source.includes(v)) && d_ !== d && d_.data.visible
								).map((d_) => [d, d_]);
							})
							.join("path")
							.attr("class", "leaf-to-leaf-path")
							.attr("fill", "tansparent")
							.attr("stroke", "#0632E4")
							.attr("stroke-width", 2.0)
							.attr("opacity", 0.5)
							.attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)))
							.raise();
					}

					// Accordion - Dropdown for connected nodes
					let connectedNodes;
					connectedNodes = visMode2Nodes.filter((d_) => 
						d_.data.props.data_source && d_.data.props.data_source.some(v => d.data.props.data_source.includes(v)));
					connectedNodes = connectedNodes.filter((d_) => d_ !== d); // Removes self if referenced
					
					d3.select("#hover-tooltip .tooltip-dropdown-title") 
						.style("font-size", currentTextScale.TooltipBody)
						.style("font-weight", "bold")
						.style("display", "block")
						.text(["Data","Team"].includes(getParentWithDepth(d, 1).data.text) ? `Publications (${connectedNodes.size()})` : `Connections (${connectedNodes.size()})`);

					d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", connectedNodes.size() > 0 ? "block" : "none");

					const tooltipConnectionRow = d3.select("#hover-tooltip .table-collapsed .tooltip-tbody");
					tooltipConnectionRow.style("display", "none").selectAll("*").remove();
					
					const publicationsList = tooltipConnectionRow.append("tr").append("td")
						.selectAll(".papers-list-item")
						.data(connectedNodes.data())
						.join("div")
						.attr("id", (d, i) => `publications-list-tooltip-item-${i}`)
						.attr("class", "papers-list-item")
						.style("cursor", "pointer")
						.style("border", "1px solid #d0d0d0")
						.style("padding", "0 10px")
						.style("pointer-events", "all")

					publicationsList.append("p")
						.style("font-size", currentTextScale.TooltipBody)
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
									.style("font-size", currentTextScale.TooltipBody)
									.text(key.replace("[INFO_MAIN]", ""));
								d3.select(this).append("p")
									.style("padding-bottom", "5px")
									.style("font-size", currentTextScale.TooltipBody)
									.text(d.data.props.info_main[key]);
							}
						});

						if(d.data.props.publication_link && d.data.props.publication_link !== "") {
							collapsibleInfo = true;
							d3.select(this).append("center").append("button")
								.attr("class", "button button-simplified button-publication-link")
								.style("font-size", currentTextScale.Button)
								.attr("type", "button")
								.style("padding", "5px 15px 5px 15px")
								.style("margin", "5px")
								.style("min-width", "150px")
								.style("width", "auto")
								.text("Go to publication")

							if(d.data.props.info_collapsed.Impact && d.data.props.info_collapsed.Impact !== "") {
								d3.select(this).select("center").append("button")
									.attr("class", "button button-simplified button-altmetric-link")
									.style("font-size", currentTextScale.Button)
									.attr("type", "button")
									.style("padding", "5px 15px 5px 15px")
									.style("margin", "5px")
									.style("min-width", "150px")
									.style("width", "auto")
									.text("Go to altmetric")	
							}
						
						} else if(d.data.props.info_collapsed.Impact && d.data.props.info_collapsed.Impact !== "") {
							collapsibleInfo = true;
							d3.select(this).append("center").append("button")
								.attr("class", "button button-simplified button-altmetric-link")
								.attr("type", "button")
								.style("font-size", currentTextScale.Button)
								.style("padding", "5px 15px 5px 15px")
								.style("margin", "5px")
								.style("min-width", "150px")
								.style("width", "auto")
								.text("Go to altmetric")
						}

						if(!collapsibleInfo) {
							d3.select(this).append("p")
								.style("font-size", currentTextScale.TooltipBody)
								.style("font-weight", "bold")
								.text("No additional information.");
						}

					});	
					
					if(connectedNodes.size() <= 0) {
						d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "none").style("pointer-events", "none");
						d3.select("#hover-tooltip #tooltip-collapsible-button-group").style("pointer-events", "none").style("cursor","default");
					} else {
						d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "block").style("pointer-events", "all");
						d3.select("#hover-tooltip #tooltip-collapsible-button-group").style("pointer-events", "all").style("cursor","pointer");
					}
					
					connectedNodes
						.attr('font-weight', 'bold')
						.attr('font-size', currentTextScale.ConnectedNodes)
						.attr('fill', '#000000')
						.attr('stroke', checkboxesChecked['checkbox-white-backgrounds'] ? '#ffffff' : '#0632E4')
						.attr('stroke-width', checkboxesChecked['checkbox-white-backgrounds'] ? 10 : 1)
				}
			// Topic rather than publication
			} else {
				const topic = d;
				d3.select("#hover-tooltip .tooltip-title")
					.style("font-size", currentTextScale.TooltipTitle)
					.text(`TOPIC: ${topic.data.text}`);

				const themeDescRow = d3.select("#hover-tooltip .table-main .tooltip-tbody");
				themeDescRow.append("tr").append("td")
					.append("p")
					.style("font-size", currentTextScale.TooltipBody)
					.style("white-space", "pre-wrap")
					.text(topic.data.props.themeDescShort);
				
				// Hide other elements on tooltip
				d3.select("#hover-tooltip #tooltip-main-button-link").style("display", "none");
				d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "none");
				d3.select("#hover-tooltip .tooltip-dropdown-title").text("");
				d3.select("#hover-tooltip .table-collapsed .tooltip-tbody").style("display", "none").selectAll("*").remove();
			}

			// Publication status dropdown
			if (mode == "viz-select-0") {
				d3.select("#hover-tooltip .tooltip-dropdown-title").text("");
				d3.select("#hover-tooltip .table-collapsed .tooltip-tbody").style("display", "none").selectAll("*").remove();
				let collapsibleInfo = false;
				Object.entries(d.data.props.info_collapsed).forEach(([key, value]) => {
					if(value && value !== "" && key !== "Impact") {
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

				if(!collapsibleInfo) {
					d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "none").style("pointer-events", "none");
					d3.select("#hover-tooltip #tooltip-collapsible-button-group").style("pointer-events", "none").style("cursor","default");
				} else {
					d3.select("#hover-tooltip .tooltip-collapsible-button").style("display", "block").style("pointer-events", "all");
					d3.select("#hover-tooltip #tooltip-collapsible-button-group").style("pointer-events", "all").style("cursor","pointer");
				}
			}

			if(selectedNode === undefined) {
				d3.selectAll(`#${d.data.id}-text,#${d.data.id}-text-2nd-line`).style("font-weight", "bold");
			}	
		}

		// Create sticky tooltip
		const mouseClickEvent = (event, d) => {
			event.stopPropagation();
			if(!d3.select("#sticky-tooltip").empty()) {
				d3.select("#sticky-tooltip").remove();
			}
			if(d3.select("#sticky-tooltip")) {
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
				.style('max-height', `${window.innerHeight}px`)
				.style('opacity', '0.4')
				.style('background', '#ffffff');

			let createSticky = true;

			if(d.depth === 1) {
				d3.select("#hover-tooltip .table-main .tooltip-tbody").selectAll("*").remove();
				const themeDescRow = d3.select("#hover-tooltip .table-main .tooltip-tbody").append("tr");
				themeDescRow.append("td")
					.append("p")
					.style("font-size", currentTextScale.TooltipBody)
					.style("white-space", "pre-wrap")
					.text(d.data.props.themeDescLong);
			} 
			// else if("Members" in d.data.props.info_main) {
			// 	if(visibleTeams.indexOf(d.data.text) !== -1) {
			// 		visibleTeams.splice(visibleTeams.indexOf(d.data.text, 1));
			// 	} else {
			// 		visibleTeams.push(d.data.text);
			// 	}

			// 	createSticky = false;
			// 	rebuildTree();
			// }

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
					.style("resize", "both")
					.style("z-index", "99")
					.attr("tabindex", "0")
					.on("mousedown", (event) => {
						event.stopPropagation();
						
						let startPointerPos = [event.pageX, event.pageY];
						let startPos = [
							parseInt(d3.select("#sticky-tooltip").style("left")),
							parseInt(d3.select("#sticky-tooltip").style("top"))
						];
						
						const boundingRect = d3.select("#sticky-tooltip").node().getBoundingClientRect();
						const tooltipWidth = boundingRect.width;
						const tooltipHeight = boundingRect.height;

						// Resizing so don't drag
						if (startPointerPos[0] < boundingRect.right + 15
							&& startPointerPos[0] > boundingRect.right - 25
							&& startPointerPos[1] < boundingRect.bottom + 15
							&& startPointerPos[1] > boundingRect.bottom - 25) {
							return;
						}
						event.preventDefault();

						// Drag tooltip
						d3.select("body")
							.on("mousemove.dragTooltip", (event) => {
								let pointerPos = [event.pageX, event.pageY];
								let deltaX = pointerPos[0] - startPointerPos[0];
								let deltaY = pointerPos[1] - startPointerPos[1];
								let newX = startPos[0] + deltaX
								let newY = startPos[1] + deltaY
								
								if(startPos[0] + deltaX > width - tooltipWidth) {
									newX = width - tooltipWidth;
								} else if(startPos[0] + deltaX < 10) {
									newX = 10;
								}
								if(startPos[1] + deltaY > height - tooltipHeight) {
									newY = height - tooltipHeight;
								} else if(startPos[1] + deltaY < 10) {
									newY = 10;
								}

								d3.select("#sticky-tooltip")
								.style("left", `${newX}px`)
								.style("top", `${newY}px`)
								.style("max-width", `${canvasWidth - newX - 10}px`)
								.style("max-height", `${canvasHeight - newY - 10}px`)
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

				// Close tooltip on 'X' button click
				d3.select("#hover-tooltip.tooltip").style("display", "none")
				stickyTooltip.style("pointer-events", "all");
				stickyTooltip.select(".tooltip-close-button")
					.style("display", "block")
					.attr("tabindex", "0")
					.on("keydown", (event, d) => {
						if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
							if(selectedNode !== undefined) {
								if (highlightedPaths._groups[0].length > 0) {
									highlightedPaths.remove();
								}
								selectedNode = undefined;
							}
							d3.select("#sticky-tooltip").remove();
							d3.select("#sticky-tooltip-overlay").remove();
							focusElement.focus();
						}
					})
					.on("click", () => {
						if(selectedNode !== undefined) {
							if (highlightedPaths._groups[0].length > 0) {
								highlightedPaths.remove();
							}
							selectedNode = undefined;
						}
						d3.select("#sticky-tooltip").remove();
						d3.select("#sticky-tooltip-overlay").remove();
					});
				stickyTooltip.select(".tooltip-bottom-note").remove();

				// Expand tooltip content on arrow click
				let collapsed = true;
				d3.select("#sticky-tooltip #tooltip-collapsible-button-group")
				.on("keydown", (event) => {
					if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
					stickyCollapseEvent(event);
					}
				})
				.on("click", (event) => {
					stickyCollapseEvent(event);
				});

				const stickyCollapseEvent = (event) => {
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
				}

				// Go to publication link
				d3.select("#sticky-tooltip #tooltip-main-button-link .button-publication-link")
					.on("click", (event) => {
						event.stopPropagation();
						window.open(d.data.props.publication_link);
					});
				
				// Go to altmetric link
				d3.select("#sticky-tooltip #tooltip-main-button-link .button-altmetric-link")
					.on("click", (event) => {
						event.stopPropagation();
						window.open(d.data.props.info_collapsed.Impact);
					});

				// Remove highlighted paths
				if(selectedNode !== undefined) {
					if (highlightedPaths._groups[0].length > 0) {
						highlightedPaths.remove();
					}
				}
				selectedNode = d;

				// Create leaf-to-leaf paths to be highlighted
				if (d3.select("#curves-wrapper-leaves").selectChildren()["_groups"][0].length == 0) {
					const leaves = root.leaves();
					
					highlightedPaths = d3.select("#curves-wrapper-leaves")
						.selectAll("path")
						.data(() => {
							return leaves.filter(
								(d_) => d_.data.props.data_source.some(v => selectedNode.data.props.data_source.includes(v)) && d_ !== selectedNode && d_.data.visible
								).map((d_) => [selectedNode, d_]);
							})
						.join("path")
						.attr("class", "leaf-to-leaf-path")
						.attr("fill", "tansparent")
						.attr("stroke", "#0632E4")
						.attr("stroke-width", 2.0)
						.attr("opacity", 0.5)
						.attr("d", ([i, o]) => connectedEdgesLineFunction(i.path(o)))
						.raise();
				}

				// Highlight connected publication text on connected view & show on tooltip
				if(mode === "viz-select-1") {
					const connectedNodes = d3.selectAll('.node-group').filter((d_) => 
						d_.data.props.data_source && d_.data.props.data_source.some(v => d.data.props.data_source.includes(v)) && d_.data.visible)
						.filter((d_) => d_ !== d)

					connectedNodes.selectAll('.node-text')
						.attr('font-weight', 'bold')
						.attr('font-size', currentTextScale.ConnectedNodes)
						.attr('fill', '#000000')
						.attr('stroke', checkboxesChecked['checkbox-white-backgrounds'] ? '#ffffff' : '#0632E4')
						.attr('stroke-width', checkboxesChecked['checkbox-white-backgrounds'] ? 10 : 1)

					// Accordion dropdown toggle
					const connectedPublications = connectedNodes.data();
					d3.selectAll('#sticky-tooltip .table-collapsed .tooltip-tbody .papers-list-item')
						.attr("tabindex", "0")
						.data(connectedPublications)
						.on("keydown", (event, d) => {
							if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
								connectedPublicationsDropdownEvent(event, d);
							}
						})
						.on("click", (event, d) => {
							connectedPublicationsDropdownEvent(event, d);
						});
					
					const connectedPublicationsDropdownEvent = (event, d) => {
							let i = connectedPublications.indexOf(d);
							const entry = d3.select(`#sticky-tooltip #publications-list-tooltip-item-${i} .papers-list-item-content`);
							const collapsed = entry.attr("data-collapsed")

							if(collapsed === "true") {
								entry.attr("data-collapsed", "false")
									.style("display", "block")
									.transition("appear")
									.duration(750)
									.ease(d3.easeQuadOut)
									.style("height", "auto")
								
								d3.select(`#sticky-tooltip #publications-list-tooltip-item-${i} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
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

								d3.select(`#sticky-tooltip #publications-list-tooltip-item-${i} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
									.attr("transform", "translate(256,256) rotate(90) translate(-256,-256)");
							}
					}
					
					// Go to publication link
					d3.selectAll('#sticky-tooltip .table-collapsed .tooltip-tbody .papers-list-item .button-publication-link')
						.data(connectedPublications)
						.on("click", (event, d) => {
							event.stopPropagation();
							window.open(d.data.props.publication_link);
						});
					
					// Go to altmetric link
					d3.selectAll("#sticky-tooltip .table-collapsed .tooltip-tbody .papers-list-item .button-altmetric-link")
						.data(connectedPublications)
						.on("click", (event, d) => {
							event.stopPropagation();
							window.open(d.data.props.info_collapsed.Impact);
						});
				}
			}
			document.getElementById("sticky-tooltip").focus();
		}

		// Unselect element
		const mouseLeaveEvent = (event, d) => {
			d3.select("#hover-tooltip.tooltip").style("display", "none");
			d3.select("#sticky-tooltip-overlay").remove();
			d3.selectAll(`#${d.data.id}-text,#${d.data.id}-text-2nd-line`).style("font-weight", null);
			if(selectedNode === undefined) {
				if (highlightedPaths._groups[0].length > 0) {
					highlightedPaths.remove();
				}
			}

			if(mode === "viz-select-1" && d3.select("#sticky-tooltip").empty()) {
				d3.selectAll('.node-text')
					.attr('font-weight', null)
					.attr('font-size', currentTextScale.NodeText)
					.attr("fill", (d) => d.data.color)
					.attr('stroke', null)
					.attr('stroke-width', null);
			}
		}
	}

	$:if(rerenderTreeTrigger !== null) {
		if (mode == "viz-select-0") {
			rerenderTree(rerenderTreeTrigger);
			rerenderTreeTrigger = null;

		} else {
			loaderVisible =  true;
			d3.select("#main-viz-wrapper")
				.transition("opacity")
				.duration(500)
				.ease(d3.easeQuadOut)
				.style("opacity", 0.0);

			setTimeout(async () => {
				await rerenderTree(rerenderTreeTrigger).then(() => {
					rerenderTreeTrigger = null;

					setTimeout(() => {
						loaderVisible = false;
						d3.select("#main-viz-wrapper")
							.transition("opacity")
							.duration(500)
							.ease(d3.easeQuadOut)
							.style("opacity", 1.0);
					}, 1250) // Wait for connections image to load, which takes ~1 second
				});
			}, 500);
		}
	}

	$:if(data && radius) {
		createCollapsableRadialTree(data, separationFunction, radius)
	}

	let resizeTimeout;
	window.onresize = () => {
		if (simplifiedMode || mode !== "viz-select-1") return;
		
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout( () => {
			rerenderTreeTrigger = true;
		}, 500);
	};

</script>

<div id="main-viz-wrapper" style="opacity: 0.0;display: none;">

	<!-- Main visualisation -->
	<div class="canvas-wrapper" id="canvas-wrapper">
		<svg id="d3-canvas" opacity="0.0" version="1.1" xmlns="http://www.w3.org/2000/svg"/>
		<img alt="Connections view" style="opacity:0.0" id="curves-wrapper-leaves-img"/>
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
			<center id="tooltip-main-button-link" style="padding:5px 25px 5px 25px"></center>
			<div style="padding:5px 25px 5px 25px" id="tooltip-collapsible-button-group">
				<p class="tooltip-dropdown-title" style="float:left;margin:0px"></p>
				<svg class="tooltip-collapsible-button" tabindex="0" style="margin-left:10px; cursor:pointer;float:left;" width="15px" height="15px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
					<path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"
					fill="#202020"
					transform="translate(256,256) rotate(90) translate(-256,-256)"/>
				</svg>
			</div>
			<table class="table-collapsed" cellspacing="15">
				<tbody class="tooltip-tbody"></tbody>
			</table>
			<center><div class="tooltip-bottom-note">Click on the leaf to stick.</div></center>
		</div>
	</div>

	<!-- controls -->
	<Controls bind:visible={controlsVisible} bind:presets bind:checkboxesChecked bind:rerenderTreeTrigger bind:mode bind:root bind:categoryLegendVisible bind:canvasWidth bind:canvasHeight bind:currentTextScale/>

	<!-- additional controls -->
	<div id="back-button" style="display: none;position: absolute;color:#808080;font-size:80%;cursor:pointer;">
		&lt; switch to List View
	</div>
	<div id="help-button" style="display: none;position: absolute;color:#808080;font-size:400%;font-weight: bold;cursor:pointer;">
		?
	</div>

</div>


<style>
	#main-viz-wrapper {
		overflow: hidden;
	}
	
	#d3-canvas {
		opacity: 1.0;
		font-family: sans-serif;
		font-size: 63%;
	}

	#curves-wrapper-leaves-img {
		position: absolute;
		left: 0;
		top: 0;
		z-index: -1;
	}
</style>