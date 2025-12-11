<script type="text/javascript">
	import * as d3 from 'd3';

	import { onMount } from 'svelte';

	import CollapsibleRadialTree from './visualizations/CollapsibleRadialTree.svelte';
	import TabView from './visualizations/TabView.svelte';

    import Loader from './components/Loader.svelte';
    import WelcomeDialog from './components/WelcomeDialog.svelte';
    import DraftNotice from './components/DraftNotice.svelte';
	import Attribution from './components/Attribution.svelte';
    import IntroTour from './components/IntroTour.svelte';
    
    import MinWidthDialog from './components/MinWidthDialog.svelte';
    // import Legend from './components/Legend.svelte';
    import DimensionsCalculator from './components/DimensionsCalculator.svelte';
    import CategoryLegend from './components/CategoryLegend.svelte';

    import { updateLeafTextAppearence } from './helper/updateLeafTextAppearence';
    import { startBuildHierarchy, buildHierarchy } from './helper/buildHierarchy';
    import { parseMetaData, parseNCSAndLHWData, parseDefaultData } from './helper/dataPreProcessing';
	import { updateTextSize } from "./helper/updateTextSize";
	import { calculateCategoryLabels } from "./helper/calculateCategoryLabels";
  import intro from 'intro.js';
    
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
    let rootConnections = null;
	let rootSimplified;

	let simplifiedMode = true;
	let twist = 0;

	let data;
	let dataConnections;
	let dataSimplified;
	let dataCategories;
	let header;
	let rawData = null;
	let visibleTeams = [];
	let categoriesDataConnections;

    // child component states
	let showMainVizTrigger;

    let loaderVisible;

    let welcomeDialogVisible;
    let categoryLegendVisible;

	let introTourStartTrigger;
	let introData;

	let controlsVisible;
	let presets;
	let checkboxesChecked = {};

	let checkShowDisplayCompatabilityTrigger;
	let calculateDimensions;

	let width  = null;
	let height = null;
	let canvasWidth = null;
	let canvasHeight = null;
	let radius = null;
	let outerRadius = null;	

	// For controlling text sizing for elements that are dynamically created
	// Represent % scale for font-size attribute
	// Need for list view dropdown buttons; category labels; legend; leaf titles and tooltips
	let currentTextScale = {
		"H1": "117%",
		"Button": "100%",
		"TabsTitle": "120%",
		"ListContent": "100%",
		"BackButton": "80%",
		"HelpButton": "400%",
		"InfoButton": "300%",
		"Controls": "90%",
		"LegendWrapper": "120%",
		"CategoryLabels": "18px",
		"CategoryLegend": "112%",	
		"NodeText": "100%",
		"TooltipCloseButton": "138%",		
		"TooltipTitle": "80%",	
		"TooltipBody": "100%",
		"MemberName": "60%",
		"ConnectedNodes": "150%",
	};

	let explainerData = {
		"viz-select-0" : {"firstLoad" : false},
		"viz-select-1" : {"firstLoad" : false},
	}

	// switch visualizations
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
					
				if ((mode === "viz-select-0" || mode === "viz-select-1") && explainerData[mode].firstLoad) {
					let introPanel = d3.select("#intro-panel-wrapper").style("display", "block");
					introPanel.select("#intro-panel-header")
						.text(explainerData[mode].heading);		
					introPanel.select("#intro-panel-yt-embed")
						.attr("src", `https://www.youtube-nocookie.com/embed/${explainerData[mode].youtubeId}?origin=https://c3tree.bw1-dev.com`);
					introPanel.select("#intro-panel-text")
						.text(explainerData[mode].text);
					document.getElementById("intro-panel").focus();		
				} else {
					document.getElementById("back-button").focus();
				}
			}, 1000);

		}, ANIM_DURATION_OUT);
		
		updateTextSize(currentTextScale);
		simplifiedMode = false;
		rerenderTreeTrigger = true;

		d3.select("#attribution")
			.style("display", "none");
	};

	const showTabsView = () => {

		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

		welcomeDialogVisible = false;

		d3.selectAll("#yt-embed")
			.style("height", "0px")
			.filter(d => d.youtubeId !== undefined && d.youtubeId !== "")
			.style("height", isMobile ? "240px" : "320px")
			.append("iframe")
			.attr("src", d => `https://www.youtube-nocookie.com/embed/${d.youtubeId}?origin=https://c3tree.bw1-dev.com`)
			.attr("width", isMobile ? "330" : "440")
			.attr("height", isMobile ? "240" : "320")
			.attr("frameborder", "0")
			//.attr("allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture")
			.attr("allowfullscreen", true);

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
			.style("display", "none");
		d3.select("#attribution")
			.style("display", "block");
	};

	const fetchGDriveAPIData = () => {

		loaderVisible = true;

		var xhr = new XMLHttpRequest();
		xhr.open("POST", "https://c3tree-dev.bw1-dev.com/fetch_c3tree_data_from_google_sheet", true);
		// xhr.open("POST", "https://c3tree.framed-mice.eu/fetch_c3tree_data_from_google_sheet", true);
		// xhr.open("POST", "http://localhost:8001/fetch_c3tree_data_from_google_sheet", true);
		xhr.send(null);
		xhr.onload = () => {

			if(xhr.readyState === 4) {
				if(xhr.status === 200) {
					const response = JSON.parse(xhr.responseText);
					header = response.mainData[0];
					presets = header.filter((column) => column.includes("[PRESET]")).map((column) => column.replace("[PRESET]", ""));
					rawData = parseNCSAndLHWData(response.mainData.slice(1), header);
					parseMetaData(response.metaData.slice(1), response.metaData[0]);

					data = startBuildHierarchy(rawData, presets, visibleTeams, true);
					dataConnections = startBuildHierarchy(rawData, presets, visibleTeams, false);
					categoriesDataConnections = calculateCategoryLabels(dataConnections);
					dataSimplified = startBuildHierarchy(rawData, presets, visibleTeams, false, 2);

					explainerData = {
						"viz-select-0" : {
							"firstLoad" : true,
							"heading" : response.explainerData[1][1],
							"youtubeId" : response.explainerData[1][2],
							"text" : response.explainerData[1][3]
						},
						"viz-select-1" : {
							"firstLoad" : true,
							"heading" : response.explainerData[2][1],
							"youtubeId" : response.explainerData[2][2],
							"text" : response.explainerData[2][3]
						}
					}

					introData = response.introData;

					welcomeDialogVisible = true;
					loaderVisible = false
				} else {
					console.log("ERROR");
					console.log(xhr.readyState, xhr.status, xhr.responseText)
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
		mode = d3.select("#checkbox-viz-select-cluster").property("checked") ? "viz-select-0" : "viz-select-1";
		categoryLegendVisible = mode === "viz-select-1";
		
		d3.select("#welcome-dialog .button.button-simplified").on("click", (event) => {
			simplifiedMode = true;
			showTabsView();
		});

		d3.select("#welcome-dialog .button.button-default").on("click", async (event) => {
			showMainViz();
		});		

		d3.select("#back-button")
			.attr("tabindex", "1")
			.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
					simplifiedMode = true;
					showTabsView();
				}
			})
			.on("click", (event) => {simplifiedMode = true; showTabsView()});
		d3.select("#info-button")
			.attr("tabindex", "2")
			.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
					if ((mode === "viz-select-0" || mode === "viz-select-1")) {
						let introPanel = d3.select("#intro-panel-wrapper").style("display", "block");
						introPanel.select("#intro-panel-header")
							.text(explainerData[mode].heading);		
						introPanel.select("#intro-panel-yt-embed iframe")
							.attr("src", `https://www.youtube-nocookie.com/embed/${explainerData[mode].youtubeId}?origin=https://c3tree.bw1-dev.com`);
						introPanel.select("#intro-panel-text")
							.text(explainerData[mode].text);
						document.getElementById("intro-panel").focus();		
					}
				}
			})
			.on("click", (event) => {
				if ((mode === "viz-select-0" || mode === "viz-select-1")) {
					let introPanel = d3.select("#intro-panel-wrapper").style("display", "block");
					introPanel.select("#intro-panel-header")
						.text(explainerData[mode].heading);		
					introPanel.select("#intro-panel-yt-embed iframe")
						.attr("src", `https://www.youtube-nocookie.com/embed/${explainerData[mode].youtubeId}?origin=https://c3tree.bw1-dev.com`);
					introPanel.select("#intro-panel-text")
						.text(explainerData[mode].text);
					document.getElementById("intro-panel").focus();		
				}
			});
		d3.select("#help-button")
			.attr("tabindex", "2")
			.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
					introTourStartTrigger = true;
				}
			})
			.on("click", (event) => introTourStartTrigger = true);
		
		// Intro panel mouse events
		d3.selectAll("#intro-panel-background")
			.on("click", () => {
				d3.select("#intro-panel-wrapper").style("display", "none");
				explainerData[mode].firstLoad = false;
			})
			.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
					d3.select("#intro-panel-wrapper").style("display", "none");
					explainerData[mode].firstLoad = false;
				}
			});
		d3.selectAll("#intro-close-button")
			.on("click", () => {
				d3.select("#intro-panel-wrapper").style("display", "none");
				explainerData[mode].firstLoad = false;
				document.getElementById("back-button").focus();	
			})
			.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
					d3.select("#intro-panel-wrapper").style("display", "none");
					explainerData[mode].firstLoad = false;
					document.getElementById("back-button").focus();	
				}
			});

		d3.select("#hover-tooltip").style("width", `${TOOLTIP_WIDTH}px`).style("height", "auto")

		fetchGDriveAPIData();

		let resizeTimeout;
		window.onresize = () => {
			calculateDimensions();

			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout( () => {
				checkShowDisplayCompatabilityTrigger = true;
				if (!simplifiedMode && mode === "viz-select-1") rerenderTreeTrigger = true;
			}, 500);
		};
	});

	// skip welcome dialog
	//showMainViz();
</script>

<main>

	<WelcomeDialog bind:visible={welcomeDialogVisible} {ANIM_DURATION_OUT}/>
	<IntroTour bind:introTourStartTrigger bind:introData/>
	<MinWidthDialog bind:checkShowDisplayCompatabilityTrigger bind:simplifiedMode/>
	<DimensionsCalculator bind:width bind:height bind:canvasWidth bind:canvasHeight bind:radius bind:outerRadius 
		bind:twist {BRAIN_SIZE} {BRAIN_ASPECT_RATIO} bind:calculateDimensions/>
	<CategoryLegend  bind:visible={categoryLegendVisible} {ANIM_DURATION_OUT} bind:mode bind:simplifiedMode/>

	<CollapsibleRadialTree {BRAIN_SIZE} {BRAIN_ASPECT_RATIO} {TOOLTIP_WIDTH}
		bind:data bind:dataSimplified bind:dataConnections bind:root bind:rootSimplified
		bind:simplifiedMode bind:twist bind:categoriesDataConnections
		bind:width bind:height bind:canvasWidth bind:canvasHeight bind:radius bind:outerRadius
		bind:controlsVisible bind:presets bind:checkboxesChecked bind:rerenderTreeTrigger bind:mode bind:categoryLegendVisible 
		bind:loaderVisible bind:currentTextScale bind:explainerData bind:checkShowDisplayCompatabilityTrigger />

	<TabView bind:data bind:rawData bind:showMainVizTrigger {ANIM_DURATION_IN} {ANIM_DURATION_OUT} bind:currentTextScale/>

	<Attribution/>
	<DraftNotice/>

	<!-- <Legend bind:canvasWidth bind:canvasHeight bind:welcomeDialogVisible bind:currentTextScale/> -->
	<Loader bind:visible={loaderVisible}/>

</main>