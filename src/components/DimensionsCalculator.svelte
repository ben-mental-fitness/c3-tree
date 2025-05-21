<script type="text/javascript">
	import * as d3 from 'd3';
	import { onMount } from 'svelte';

	import { addSVGTextLineBreaks } from '../helper/addSVGTextLineBreaks';

	// Bound to App.svelte
	export let BRAIN_SIZE;
	export let BRAIN_ASPECT_RATIO;
	const MARGIN = {
		top: 90,
		right: 90,
		bottom: 90,
		left: 90,
	};

	export let width;
	export let height;
	export let canvasWidth;
	export let canvasHeight;
	export let radius;
	export let outerRadius;
	export let twist;
	
	const calculateDimensions = () => {
		width  = Math.floor(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) - 1;
		height = Math.floor(window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) - 1;
		canvasWidth = width;
		canvasHeight = height;

		// if(width < 768) { // mobile version
		// 	//d3.select("#welcome-dialog .button-default").attr("disabled", "true");
		// } else {
		// 	//d3.select("#welcome-dialog .button-default").attr("disabled", null);
		// }

		radius = d3.min([canvasWidth - MARGIN.left - MARGIN.right, canvasHeight - MARGIN.top - MARGIN.bottom]) / 2 - 150;
		outerRadius = radius + 90;

		if(width < height) {
			d3.select("#controls-wrapper").style("left", "50%").style("top", `${(height - width) / 2.0 - 20}px`).style("margin-left", "-100px");
			d3.selectAll(".canvas-wrapper").style("margin-top", `${(height - width) / 2.0}px`)
			d3.select("#help-button")
				.style("display", "block")
				.style("right", "10px")
				.style("top", "20px"); // `${(height - width) / 2.0}px`);
			d3.select("#back-button")
				.style("display", "block")
				.style("left", "10px")
				.style("top", "45px"); // `${(height - width) / 2.0}px`);
			d3.select("#category-legend-wrapper")
				.style("right", "10px")
		} else {
			d3.select("#controls-wrapper")
				.style("left", `${(width - height) / 2.0 - 220}px`)
				.style("top", `50%`)
				.style("height", "366px")
				//.style("margin-top", `-${366 / 2}px`)
				.style("margin-top", `-${550 / 2}px`)
				.style("margin-left", null);
			d3.select("#help-button")
				.style("display", "block")
				.style("right", width > 1500 ? `${(width - height) * 0.2 + 20}px` : "10px") 
				.style("top", "20px");
			d3.select("#back-button")
				.style("display", "block")
				.style("left", width > 1500 ? `${(width - height) * 0.2 + 20}px` : "10px") 
				.style("top", "45px");
			d3.select("#category-legend-wrapper")
				.style("right", width > 1500 ? `${(width - height) * 0.2 + 20}px` : "10px")
		}

		d3.selectAll(".canvas-wrapper").style("width", `${canvasWidth}px`).style("height", `${canvasHeight}px`)

		d3.select("#main-transform")
			.attr("transform", `translate(${canvasWidth / 2.0},${canvasHeight / 2.0}) rotate(${(twist) * 180 / Math.PI})`);

		d3.select("#d3-canvas")
			.attr("viewBox", [0, 0, canvasWidth, canvasHeight])
			.attr("width", canvasWidth)
			.attr("height", canvasHeight)

		d3.select("#category-labels-wrapper")
			.selectAll(".category-labels")
			.each(function(d) {
				addSVGTextLineBreaks(d3.select(this), canvasWidth / 2 - radius - 80, 0, 1.0)
			});

		d3.select("#twist-circle").attr("r", outerRadius)

		d3.select("#center-image")
			.attr("width", radius * BRAIN_SIZE)
			.attr("height", radius * BRAIN_SIZE * BRAIN_ASPECT_RATIO)
			.attr("transform", `translate(
				${width / 2.0 - radius * BRAIN_SIZE / 2.0},
				${height / 2.0 - radius * BRAIN_SIZE / 2.0 * BRAIN_ASPECT_RATIO})`)
	};

	onMount(() => {
		calculateDimensions();
		window.addEventListener("resize", (event) => calculateDimensions());
	});
</script>