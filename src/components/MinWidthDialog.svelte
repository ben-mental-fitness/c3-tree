<script type="text/javascript">
	import * as d3 from 'd3';

	import { onMount } from 'svelte';

	export let checkShowDisplayCompatabilityTrigger = false;

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

	$:if(checkShowDisplayCompatabilityTrigger) {
		checkShowDisplayCompatability();
		checkShowDisplayCompatabilityTrigger = false;
	}

	onMount(() => {
		d3.select("#min-width-dialog .button").on("click", (event) => {
			d3.select("#min-width-dialog")
				.style("opacity", 1.0)
				.transition("disappear")
				.duration(750)
				.ease(d3.easeQuadOut)
				.style("opacity", 0.0);
		});
	});

</script>


<div id="min-width-dialog" style="display:none;position: absolute;left:50%;top:50%;width: 500px;min-height: 200px;margin-left:-250px;margin-top:-200px;border: 1px solid #f0f0f0;padding:20px;text-align: left;z-index: 99;background:#ffffff">
	<center>
		<h1 class="please-maximize" style="display:none">Please maximaze your browser window for best experience.</h1><br/>
		<h1 class="please-desktop" style="display:none">This visualization was optimized for desktop use only.</h1><br/>
	</center>
	<div class="button-row">
		<button class="button button-simplified" style="margin-right:10px">Close</button>
	</div>
</div>