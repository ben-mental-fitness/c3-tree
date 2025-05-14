<script type="text/javascript">
	import * as d3 from 'd3';

	export let visible;
	export let ANIM_DURATION_OUT;
	export let mode;
	export let simplifiedMode;

	const showCategoryLegend = () => {
		d3.select("#category-legend-wrapper")
			.style("opacity", 0.0)
			.style("display", "block");
		d3.selectAll("#category-legend-wrapper")
			.transition("opacity")
			.duration(ANIM_DURATION_OUT)
			.ease(d3.easeQuadOut)
			.style("opacity", 1.0);
		d3.select("#category-labels-wrapper")
			.selectAll(".category-labels")
			.attr("opacity", "0.0");
	}

	const hideCategoryLegend = () => {
		d3.selectAll("#category-legend-wrapper")
			.transition("opacity")
			.duration(ANIM_DURATION_OUT)
			.ease(d3.easeQuadOut)
			.style("opacity", 0.0);
		d3.selectAll("#category-legend-wrapper")
			.transition("display")
			.delay(ANIM_DURATION_OUT)
			.style("display", "none");
		d3.select("#category-labels-wrapper")
			.selectAll(".category-labels")
			.attr("opacity", (d) => d.data.visible ? 1.0 : 0.0);
	};

	$: if (visible && mode == "viz-select-1" && !simplifiedMode) {
	    showCategoryLegend();
	}

	$: if (!visible || mode == "viz-select-0" || simplifiedMode) {
	    hideCategoryLegend();
	}

</script>


<div id="category-legend-wrapper" style="opacity:0.0">
	<p style="color: #a0a0a0; font-weight: bold;">Theme of publication</p>
	<div id="category-legend">
	</div>
</div>


<style>

	#category-legend-wrapper {
		position: absolute;
		right:20px;
		top:50%;
		width: 200px;
		margin-left:-200px;
		margin-top:-150px;
		border: 1px solid #f0f0f0;
		padding:20px;
		text-align: left;
		z-index: 99;
		opacity: 1.0;
	}
	
</style>