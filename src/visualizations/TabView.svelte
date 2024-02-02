<script type="text/javascript">
	import * as d3 from 'd3';

	import { Hamburger } from 'svelte-hamburgers';

	import Menu from '../components/Menu.svelte';

	export let data;
	export let rawData;
	export let showMainVizTrigger;

	let menuOpen;

	const createTabView = (data) => {

		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

		const pageDim = d3.select("body").node().getBoundingClientRect();
		const marginTop = 30;
		const marginBottom = 250;
		const tabHeight = Math.floor((pageDim.height - marginTop - marginBottom - 2 * data.children.length) / data.children.length);
		const tabWidth = 250;

		const contentWidth = 750;
		const contentHeight = tabHeight * data.children.length + 2 * data.children.length - 2;

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

		d3.select('#tabs-wrapper .hamburger').style('display', isMobile ? null : 'none')

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
			.style('display', (d) => d.youtubeId !== undefined ? 'block' : 'none')
			.append("iframe")
			.attr("src", (d) => d.youtubeId !== undefined ? `https://www.youtube.com/embed/${d.youtubeId}?origin=https://c3tree.framed-mice.eu` : '')
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
						.duration(ANIM_DURATION_IN)
						.ease(d3.easeQuadOut)
						.style("height", "auto")

					d3.select(`#${d.id}-content .collapsible-content-toggler .collapse-icon-toggler path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
						.attr("transform", "translate(256,256) rotate(180) translate(-256,-256)");
				} else {
					entry.attr("data-collapsed", "true")
						.style("display", "none")
						.transition("appear")
						.duration(ANIM_DURATION_OUT)
						.ease(d3.easeQuadOut)
						.style("height", "0")

					entry.attr("data-collapsed", "true")
						.transition("display")
						.delay(ANIM_DURATION_OUT)
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
						.duration(ANIM_DURATION_IN)
						.ease(d3.easeQuadOut)
						.style("height", "auto")

					d3.select(`#papers-list-item-${d.parentIndex}-${d.rIndex} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
						.attr("transform", "translate(256,256) rotate(180) translate(-256,-256)");
				} else {
					entry.attr("data-collapsed", "true")
					.style("display", "none")
						.transition("appear")
						.duration(ANIM_DURATION_OUT)
						.ease(d3.easeQuadOut)
						.style("height", "0")

					entry.attr("data-collapsed", "true")
						.transition("display")
						.delay(ANIM_DURATION_OUT)
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
			.on("click", () => showMainVizTrigger = true)

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


	$:if(data) {
		createTabView(data);
	}

</script>

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