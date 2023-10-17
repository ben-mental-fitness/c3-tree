<script type="text/javascript">
	import * as d3 from 'd3';

	import { onMount } from 'svelte';

	import CollapsibleRadialTree from './visualizations/CollapsibleRadialTree.svelte';
	import TabView from './visualizations/TabView.svelte';

    import Loader from './components/Loader.svelte';
    import WelcomeDialog from './components/WelcomeDialog.svelte';
    import DraftNotice from './components/DraftNotice.svelte';
    import IntroTour from './components/IntroTour.svelte';
    
    import MinWidthDialog from './components/MinWidthDialog.svelte';
    import Legend from './components/Legend.svelte';
    import DimensionsCalculator from './components/DimensionsCalculator.svelte';

    import { updateLeafTextAppearence } from './helper/updateLeafTextAppearence';
    import { startBuildHierarchy, buildHierarchy } from './helper/buildHierarchy';
    import { parseMetaData, parseNCSAndLHWData, parseDefaultData } from './helper/dataPreProcessing';
    
	// config

	const TOOLTIP_WIDTH = 800;
	const ANIM_DURATION_IN = 750;
	const ANIM_DURATION_OUT = 400;
	const BRAIN_ASPECT_RATIO = 0.822;
	const BRAIN_SIZE = 0.5;

    // states

    let mode = null;
    let rerenderTreeTrigger = null;
    let root;
	let rootSimplified;

	let simplifiedMode = true;
	let twist = 0;

	let data;
	let dataSimplified;
	let header;
	let rawData;
	let visibleTeams = [];

    // child component states

	let showMainVizTrigger;

    let loaderVisible;

    let welcomeDialogVisible;

	let introTourStartTrigger;
	let introData;

	let controlsVisible;
	let presets;
	let checkboxesChecked = {};

	let checkShowDisplayCompatabilityTrigger;

	let width  = null;
	let height = null;
	let canvasWidth = null;
	let canvasHeight = null;
	let radius = null;
	let outerRadius = null;	

	//
	// switch visualizations
	//

	const showMainViz = () => {

		loaderVisible = true;
		welcomeDialogVisible = false;
		checkShowDisplayCompatabilityTrigger = true;

		d3.select("#tabs-wrapper")
			.transition("opacity")
			.duration(ANIM_DURATION_OUT)
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
					.duration(ANIM_DURATION_IN)
					.ease(d3.easeQuadOut)
					.style("opacity", 1.0);
				d3.select("#tabs-wrapper")
					.transition("display")
					.delay(ANIM_DURATION_IN)
					.style("display", "none");
			}, 1000);

		}, ANIM_DURATION_OUT);
		
	};

	const showTabsView = () => {

		welcomeDialogVisible = false;
		checkShowDisplayCompatabilityTrigger = true;

		d3.select("#main-viz-wrapper")
			.style("display", "none")
			.transition("opacity")
			.duration(ANIM_DURATION_OUT)
			.ease(d3.easeQuadOut)
			.style("opacity", 0.0);
		d3.select("#tabs-wrapper")
			.style("display", "block")
			.transition("opacity")
			.duration(ANIM_DURATION_IN)
			.ease(d3.easeQuadOut)
			.style("opacity", 1.0);
		d3.select("#main-viz-wrapper")
			.transition("display")
			.delay(ANIM_DURATION_IN)
			.style("display", "none")
			
	};

	const fetchGDriveAPIData = () => {

		loaderVisible = true;

		var xhr = new XMLHttpRequest();
		xhr.open("POST", "https://c3tree.framed-mice.eu/fetch_c3tree_data_from_google_sheet", true);
		//xhr.open("POST", "/fetch_c3tree_data_from_google_sheet", true);
		xhr.send(null);
		xhr.onload = () => {

			if(xhr.readyState === 4) {
				if(xhr.status === 200) {
					const response = JSON.parse(xhr.responseText);
					header = response.mainData[0];
					presets = header.filter((column) => column.includes("[PRESET]")).map((column) => column.replace("[PRESET]", ""));
					rawData = parseNCSAndLHWData(response.mainData.slice(1), header);
					parseMetaData(response.metaData.slice(1), response.metaData[0]);
					introData = response.introData;

					data = startBuildHierarchy(rawData, presets, visibleTeams);
					dataSimplified = startBuildHierarchy(rawData, presets, visibleTeams, 2);

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
	};

	$:if(showMainVizTrigger) {
		showMainViz();
		showMainVizTrigger = false;
	}

	onMount(() => {
		
		mode = d3.select("#viz-select").node().value === "0" ? "viz-select-0" : "viz-select-1";
		
		d3.select("#welcome-dialog .button.button-simplified").on("click", (event) => {
			simplifiedMode = true;
			showTabsView();
		});

		d3.select("#welcome-dialog .button.button-default").on("click", async (event) => {
			simplifiedMode = false;
			//await rerenderTree(false); // TODO: await?
			rerenderTreeTrigger = false;
			showMainViz();
		});		

		d3.select("#back-button").on("click", (event) => showTabsView());
		d3.select("#help-button").on("click", (event) => introTourStartTrigger = true);

		d3.select("#hover-tooltip").style("width", `${TOOLTIP_WIDTH}px`).style("height", "auto")

		fetchGDriveAPIData();
		
	});

	// skip welcome dialog
	//showMainViz();
</script>

<main>
	
	<DraftNotice/>
	<WelcomeDialog bind:visible={welcomeDialogVisible} {ANIM_DURATION_OUT} {ANIM_DURATION_IN}/>
	<IntroTour bind:introTourStartTrigger bind:introData/>
	<MinWidthDialog bind:checkShowDisplayCompatabilityTrigger/>
	<DimensionsCalculator bind:width bind:height bind:canvasWidth bind:canvasHeight bind:radius bind:outerRadius bind:twist {BRAIN_SIZE} {BRAIN_ASPECT_RATIO}/>

	<CollapsibleRadialTree {BRAIN_SIZE} {BRAIN_ASPECT_RATIO} {TOOLTIP_WIDTH}
		bind:data bind:dataSimplified bind:root bind:rootSimplified
		bind:simplifiedMode bind:twist
		bind:width bind:height bind:canvasWidth bind:canvasHeight bind:radius bind:outerRadius
		bind:controlsVisible bind:presets bind:checkboxesChecked bind:rerenderTreeTrigger bind:mode/>

	<TabView bind:data bind:rawData bind:showMainVizTrigger/>

	<Legend bind:canvasWidth bind:canvasHeight/>
	<Loader bind:visible={loaderVisible}/>

</main>