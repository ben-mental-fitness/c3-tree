<script>
	import * as d3 from 'd3';
	
	import introJs from 'intro.js';
	import 'intro.js/minified/introjs.min.css';

	// Bound to App.svelte
	export let introTourStartTrigger = false;
	export let introData;

	const startIntroTour = () => {
		introJs().start();

		document.querySelector("#main-viz-wrapper").appendChild(document.querySelector(".introjs-overlay"));
		document.querySelector("#main-viz-wrapper").appendChild(document.querySelector(".introjs-helperLayer"));
		document.querySelector("#main-viz-wrapper").appendChild(document.querySelector(".introjs-tooltipReferenceLayer"));
	};

	$:if(introTourStartTrigger) {
		addIntroSteps(parseIntroData(introData)); // Needed because some elements don't exist in the DOM in the beginning
	    startIntroTour();
	    introTourStartTrigger = false;
	}

	const parseIntroData = (responseIntroData) => {
		const introHeader = responseIntroData[0];
		const introData = responseIntroData.slice(1).map((row) => {
			const step = {};
			step[introHeader[0]] = row[0];
			step[introHeader[1]] = row[1];
			step[introHeader[2]] = row[2];
			return step;
		});

		return introData;
	}

	const addIntroSteps = (introData) => {
		introData.forEach((step) => {
			d3.select(`${step["CSS selector"]}`)
				.attr("data-step", step["stepNum"])
				.attr("data-intro", step["text"]);
		});
	}

	$:if(introData) {
		addIntroSteps(parseIntroData(introData));
	}

    
</script>