<script>
	import * as d3 from 'd3';
	import { onMount } from 'svelte';

	import Search from './Search.svelte';

	import { setTreeVisibility } from '../helper/setTreeVisibility';
	// import { renderLegend } from "../helper/renderLegend";
	import { updateTextSize } from "../helper/updateTextSize";
	import { loadCategoryLabels } from "../helper/calculateCategoryLabels.js";

	// Bound to CollapsibleRadialTree.svelte
    // export let visible;
    export let presets;
    export let checkboxesChecked;
    export let rerenderTreeTrigger;
    export let mode;
    export let root;
	export let categoryLegendVisible;
	// export let canvasWidth;
	// export let canvasHeight;
	export let currentTextScale;
	export let categoriesDataConnections;
	export let radius;
	export let twist;

    const initializePresetsDropdown = (presets) => {
		d3.select("#preset-select")
			.style("display", "block")
			.selectAll("option")
			.data(["No preset (all visible)", ...presets])
			.join("option")
			.attr("value", (d) => d)
			.text((d) => d);

		d3.select("#preset-select")
			.on("change", (event) => {
				const chosenPreset = event.target.value;
				if(chosenPreset === "No preset (all visible)") {
					root.descendants().forEach((d) => d.data.visible = d.depth > 0);
				} else {
					root.descendants().forEach((d) => d.data.visible = false);
					root.descendants().forEach((d) => {
						if(d.data.presets.includes(chosenPreset) && d.depth > 0) {
							d.data.visible = d.depth > 0;
							let parent = d.parent;
							while(parent) {
								parent.data.visible = parent.depth > 0;
								parent = parent.parent;
							}
						}
					})
				}
				rerenderTreeTrigger = true;
			});
	};

	$:if(presets) {
		initializePresetsDropdown(presets);
	}

	onMount(() => {
		d3.selectAll("input[type='checkbox']").each(function() {
			checkboxesChecked[d3.select(this).attr("id")] = d3.select(this).property("checked");
			if(d3.select(this).attr("class") === "checkbox-status" && !checkboxesChecked[d3.select(this).attr("id")]) {
				d3.select(this).property("checked", true);
				checkboxesChecked[d3.select(this).attr("id")] = true;
			}
		});

		d3.select("#checkbox-image").on("change", (event) => {
			checkboxesChecked["checkbox-image"] = !checkboxesChecked["checkbox-image"];
			d3.select("#center-image").attr("opacity", checkboxesChecked["checkbox-image"] ? 1.0 : 0.0)
		});
		d3.select("#checkbox-second-tooltip").on("change", (event) => {
			checkboxesChecked["checkbox-second-tooltip"] = d3.select("#checkbox-second-tooltip").property("checked");
		});
		d3.select("#checkbox-simple-view").on("change", (event) => {
			checkboxesChecked["checkbox-simple-view"] = d3.select("#checkbox-simple-view").property("checked");
			d3.select("#checkbox-detailed-view").property("checked", !checkboxesChecked["checkbox-simple-view"]);
			d3.select("#checkbox-simple-view").property("checked", checkboxesChecked["checkbox-simple-view"]);
			rerenderTreeTrigger = true;
		});
		d3.select("#checkbox-detailed-view").on("change", (event) => {
			checkboxesChecked["checkbox-simple-view"] = !d3.select("#checkbox-detailed-view").property("checked");
			d3.select("#checkbox-detailed-view").property("checked", !checkboxesChecked["checkbox-simple-view"]);
			d3.select("#checkbox-simple-view").property("checked", checkboxesChecked["checkbox-simple-view"]);
			rerenderTreeTrigger = true;
		});
		d3.select("#checkbox-twist-circle").on("change", (event) => {
			checkboxesChecked["checkbox-twist-circle"] = !checkboxesChecked["checkbox-twist-circle"];
			rerenderTreeTrigger = false;
		});
		d3.select("#checkbox-leaf-titles").on("change", (event) => {
			checkboxesChecked["checkbox-leaf-titles"] = !checkboxesChecked["checkbox-leaf-titles"];
			rerenderTreeTrigger = true;
		});
		d3.select("#checkbox-subtheme-titles").on("change", (event) => {
			checkboxesChecked["checkbox-subtheme-titles"] = !checkboxesChecked["checkbox-subtheme-titles"];
			rerenderTreeTrigger = true;
		});
		d3.select("#checkbox-legend").on("change", (event) => {
			checkboxesChecked["checkbox-legend"] = d3.select("#checkbox-legend").property('checked');
			categoryLegendVisible =  checkboxesChecked["checkbox-legend"];
			// renderLegend(canvasWidth, canvasHeight, currentTextScale, checkboxesChecked["checkbox-legend"], mode);

			if (mode !== "viz-select-1") return;
			d3.select("#reduced-category-labels-wrapper").selectAll("*").remove();
			
			if (checkboxesChecked["checkbox-legend"]) {
				loadCategoryLabels(categoriesDataConnections, checkboxesChecked, radius, currentTextScale, twist);
			}
		});
		d3.select("#checkbox-white-backgrounds").on("change", (event) => {
			checkboxesChecked["checkbox-white-backgrounds"] = !checkboxesChecked["checkbox-white-backgrounds"];
			rerenderTreeTrigger = true;
		});

		d3.select("#increase-text-size").on("click", (event) => {
			for (const [k, v] of Object.entries(currentTextScale)) {
				if (k == "CategoryLabels") {
					currentTextScale[k] = `${parseInt(v.trim(0, -2)) + 1}px`;
				} else {
					currentTextScale[k] = `${parseInt(v.trim(0, -1)) + 5}%`;
				}
			}
			
			updateTextSize(currentTextScale);
		});
		d3.select("#decrease-text-size").on("click", (event) => {
			for (const [k, v] of Object.entries(currentTextScale)) {
				if (k == "CategoryLabels") {
					currentTextScale[k] = `${parseInt(v.trim(0, -2)) - 1}px`;
				} else {
					currentTextScale[k] = `${parseInt(v.trim(0, -1)) - 5}%`;
				}
			}

			updateTextSize(currentTextScale);
		});
		d3.select("#reset-text-size").on("click", (event) => {
			currentTextScale = {
				"H1": "117%",
				"Button": "100%",
				"TabsTitle": "120%",
				"ListContent": "100%",
				"BackButton": "80%",
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

			updateTextSize(currentTextScale);
		});

		d3.select("#checkbox-node-text").on("change", (event) => {
			let checked = d3.select(event.target).property("checked")
			if(checked) {
				d3.selectAll(".node-text-1st-line").attr("dy", "0em")
				d3.selectAll(".node-text-2nd-line").style("display", null)
			} else {
				d3.selectAll(".node-text-1st-line").attr("dy", "0.32em")
				d3.selectAll(".node-text-2nd-line").style("display", "none")
			}

		});

		d3.select("#viz-select").on("change", (event) => {
			if(event.target.value === "0") {
				mode = "viz-select-0";
				d3.selectAll("#curves-wrapper-center").attr("opacity", 1.0);
				d3.selectAll("#curves-wrapper-leaves").attr("opacity", 0.0);
			} else {
				mode = "viz-select-1";
				d3.selectAll("#curves-wrapper-center").attr("opacity", 0.0);
				d3.selectAll("#curves-wrapper-leaves").attr("opacity", 1.0);
			}
			rerenderTreeTrigger = false;
		});

		const vizSelectCluster = () => {
			mode = "viz-select-0";
			d3.selectAll("#curves-wrapper-center").attr("opacity", 1.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 0.0);
			rerenderTreeTrigger = false;
			d3.select("#checkbox-viz-select-connections").property("checked", false);
			// renderLegend(canvasWidth, canvasHeight, currentTextScale, checkboxesChecked["checkbox-legend"], mode);
		}

		const vizSelectConnections = () => {
			if (!d3.select("#checkbox-detailed-view-data-sources").property("checked")) {
				d3.select("#checkbox-detailed-view-data-sources").property("checked", true);
				checkboxesChecked["checkbox-detailed-view-data-sources"] = !checkboxesChecked["checkbox-detailed-view-data-sources"];
				root.descendants().forEach((d) => {
					if(d.data.text === 'Data')
						setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-data-sources"]);
				});
			}
			mode = "viz-select-1";
			d3.selectAll("#curves-wrapper-center").attr("opacity", 0.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 1.0);
			rerenderTreeTrigger = false;
			d3.select("#checkbox-viz-select-cluster").property("checked", false);
			// renderLegend(canvasWidth, canvasHeight, currentTextScale, checkboxesChecked["checkbox-legend"], mode);
		}

		d3.select("#checkbox-viz-select-cluster").on("click", (event) => {
			// @ts-ignore
			if (document.getElementById("checkbox-viz-select-cluster").checked) {
				vizSelectCluster();
			} else {
				d3.select("#checkbox-viz-select-connections").property("checked", true);
				vizSelectConnections();
			}
		});

		d3.select("#checkbox-viz-select-connections").on("click", (event) => {
			// @ts-ignore
			if (document.getElementById("checkbox-viz-select-connections").checked) {
				vizSelectConnections();
			} else {
				d3.select("#checkbox-viz-select-cluster").property("checked", true);
				vizSelectCluster();
			}
		});

		d3.select('#checkbox-detailed-view-team').on("click", (event) => {
			checkboxesChecked["checkbox-detailed-view-team"] = !checkboxesChecked["checkbox-detailed-view-team"];
			root.descendants().forEach((d) => {
				if(d.data.text === 'Team' || d.data.text === 'Teams')
					setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-team"]);
			});
			rerenderTreeTrigger = true;
		})
		d3.select('#checkbox-detailed-view-data-sources').on("click", (event) => {
			checkboxesChecked["checkbox-detailed-view-data-sources"] = !checkboxesChecked["checkbox-detailed-view-data-sources"];
			root.descendants().forEach((d) => {
				if(d.data.text === 'Data')
					setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-data-sources"]);
			});
			rerenderTreeTrigger = true;
		})

		d3.select("#checkbox-connect-all").on("click", (event) => {
			// @ts-ignore
			if (document.getElementById("checkbox-viz-select-connections").checked) {
				rerenderTreeTrigger = true;
			} 
		});

		d3.selectAll(".checkbox-status").on("change", function() {
			const checkboxId = d3.select(this).attr("id");
			checkboxesChecked[checkboxId] = !checkboxesChecked[checkboxId];
			const statusAffected = checkboxId.replace("checkbox-status-", "")
			root.leaves().forEach((d) => {
				if(d.data.props.status === statusAffected) {
					setTreeVisibility(d.data, checkboxesChecked[checkboxId]);
				}
			});
			rerenderTreeTrigger = true;
		});

		// d3.selectAll("#checkbox-show-controls").on("change", function() {
		// 	document.getElementById("controls-dropdown-wrapper").style.display = document.getElementById("controls-dropdown-wrapper").style.display === "block" ? "none" : "block";
		// });

		// CONTROLS DROPDOWN TOGGLES
		const toggleControlsDropdown = (groupSelection, controlsSelection) => {
			if (groupSelection.style("display") == "none") {
				groupSelection.style("display", "block");
				controlsSelection.select(".right").style("display", "none");
				controlsSelection.select(".down").style("display", "block");
			} else {
				groupSelection.style("display", "none");
				controlsSelection.select(".right").style("display", "block");
				controlsSelection.select(".down").style("display", "none");
			}

		} 

		d3.selectAll("#controls-toggle-show-controls").on("click", () => {
			toggleControlsDropdown(d3.select("#controls-group-all"), d3.select("#controls-toggle-show-controls"));
		})
		.on("keydown", (event) => {
			if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
				toggleControlsDropdown(d3.select("#controls-group-all"), d3.select("#controls-toggle-show-controls"));		
			}
		});

		d3.selectAll("#controls-toggle-show-layout").on("click", () => {
			toggleControlsDropdown(d3.select("#controls-group-layout"), d3.select("#controls-toggle-show-layout"));
		})
		.on("keydown", (event) => {
			if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
				toggleControlsDropdown(d3.select("#controls-group-layout"), d3.select("#controls-toggle-show-layout"));
			}
		});

		d3.selectAll("#controls-toggle-show-themes").on("click", () => {
			toggleControlsDropdown(d3.select("#controls-group-themes"), d3.select("#controls-toggle-show-themes"));
		})
		.on("keydown", (event) => {
			if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {	
				toggleControlsDropdown(d3.select("#controls-group-themes"), d3.select("#controls-toggle-show-themes"));
			}
		});

		d3.selectAll("#controls-toggle-show-labels").on("click", () => {
			toggleControlsDropdown(d3.select("#controls-group-labels"), d3.select("#controls-toggle-show-labels"));
		})
		.on("keydown", (event) => {
			if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
				toggleControlsDropdown(d3.select("#controls-group-labels"), d3.select("#controls-toggle-show-labels"));
			}
		});

		d3.selectAll("#controls-toggle-show-text").on("click", () => {
			toggleControlsDropdown(d3.select("#controls-group-text"), d3.select("#controls-toggle-show-text"));
		})
		.on("keydown", (event) => {
			if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
				toggleControlsDropdown(d3.select("#controls-group-text"), d3.select("#controls-toggle-show-text"));
			}
		});
	});
	
	// Conditional visibility depending on view
	$: if (mode === "viz-select-0") {
		d3.select("#control-theme-team").style("display", "none");
		d3.select("#control-subtheme-titles").style("display", "block");
		d3.select("#control-subtheme-legend").style("display", "none");
		d3.select("#control-theme-publications").style("display", "block");
	}
	$: if (mode === "viz-select-1") {
		d3.select("#control-theme-team").style("display", "block");
		d3.select("#control-subtheme-titles").style("display", "none");
		d3.select("#control-subtheme-legend").style("display", "block");
		d3.select("#control-theme-publications").style("display", "none");
	}

	// DYNAMIC THEMES LIST
	$:if (root) {
		d3.select("#control-theme-publications")
			.selectAll("div")
			.data(root.descendants().filter((d) => d.depth === 1 && d.data.text !== "Data" && d.data.text !== "Team"))
			.enter()
			.append("div")
			.attr("id", d => `control-group-${d.data.id}`)
			.each((d) => {
				d3.select(`#control-group-${d.data.id}`).append("input")
					.style("float", "left")
					.style("display", "block")
					.style("margin-left", "20px")
					.attr("type", "checkbox")
					.attr("tabindex", "3")
					.attr("checked", "true")
					.attr("id", (d) => `checkbox-${d.data.id}`)
					.on("change", (event, d) => {
						// @ts-ignore
						checkboxesChecked[`checkbox-${d.data.id}`] = document.getElementById(`checkbox-${d.data.id}`).checked;	

						root.descendants().filter((d_) => d.data.id === d_.data.id)
							.forEach((d_) => {
								setTreeVisibility(d.data, checkboxesChecked[`checkbox-${d.data.id}`]);
							});
						rerenderTreeTrigger = true;
					});
				d3.select(`#control-group-${d.data.id}`).append("span")
					.style("float", "left")
					.style("display", "block")
					.html((d) => d.data.text);
				d3.select(`#control-group-${d.data.id}`).append("div")
					.style("clear", "both");
			})
	}

</script>

<div id="controls-wrapper">
	<p style="text-align:left;">UK National Core Studies</p>
	<h1 style="text-align:left;">COVID-19 Longitudinal Health and Wellbeing Research and Publications</h1>
	<p style="text-align:left;">Interactive Visualisation</p>

	<div id="controls-dropdown-wrapper">
		<!-- svelte-ignore a11y-positive-tabindex -->

		<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
		<div id="controls-toggle-show-controls" class="controls-dropdown-selector" tabindex="3">
			<!-- <input style="float:left;display:block" type="checkbox" id="checkbox-show-controls" tabindex="3"> -->
			<span style="padding-right:10px">Options</span>
			<span><i class="arrow right" style="display:block"></i></span>
			<span><i class="arrow down" style="display:none"></i></span>
			<div style="clear: both;"></div>
		</div>
		
		<div id="controls-group-all" style="display:none">

			<!-- SEARCH BOX -->
			<Search/><br/><br/>

			<!-- <HIDDEN> SIMPLE OR DETAILED VIEW -->
			<!-- svelte-ignore a11y-positive-tabindex -->
			<input style="float:left;display:none" type="checkbox" id="checkbox-simple-view" tabindex="3">
			<span style="float:left;display:none">Simple version</span>
			<!-- <div style="clear: both;"></div> -->
			<!-- svelte-ignore a11y-positive-tabindex -->
			<input style="float:left;display:none" type="checkbox" id="checkbox-detailed-view" checked tabindex="3">
			<span style="float:left;display:none">Detailed visualisation</span>
			<!-- <div style="clear: both;"></div> -->

			<!-- LAYOUT SELECTOR -->
			<!-- svelte-ignore a11y-positive-tabindex a11y-no-noninteractive-tabindex -->
			<div id="controls-toggle-show-layout" class="controls-dropdown-selector" tabindex="3">
				<span style="padding-right:10px">&nbsp;&nbsp;Layout:</span>
				<span><i class="arrow right" style="display:block"></i></span>
				<span><i class="arrow down" style="display:none"></i></span>
				<div style="clear: both;"></div>
			</div>
			<div id="controls-group-layout" style="display:none">
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-viz-select-cluster" checked tabindex="3">
				<span style="float:left;display:block">Theme Clusters</span>
				<div style="clear: both;"></div>
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-viz-select-connections" tabindex="3">
				<span style="float:left;display:block">Connections</span>
				<div style="clear: both;"></div>
			</div>

			<!-- THEME SELECTOR -->
			<!-- svelte-ignore a11y-positive-tabindex a11y-no-noninteractive-tabindex -->
			<div id="controls-toggle-show-themes" class="controls-dropdown-selector" tabindex="3">
				<span style="padding-right:10px">&nbsp;&nbsp;Themes:</span>
				<span><i class="arrow right" style="display:block"></i></span>
				<span><i class="arrow down" style="display:none"></i></span>
				<div style="clear: both;"></div>
			</div>
			<div id="controls-group-themes" style="display:none">
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:none;margin-left:20px" type="checkbox" id="checkbox-detailed-view-themes-publications" checked tabindex="3">
				<div id="control-theme-publications"></div>
				<div id="control-theme-team">
					<!-- svelte-ignore a11y-positive-tabindex -->
					<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-detailed-view-team" tabindex="3">
					<span style="float:left;display:block">Team</span>
					<div style="clear: both;"></div>
				</div>
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-detailed-view-data-sources" tabindex="3">
				<span style="float:left;display:block">Data Sources</span>
				<div style="clear: both;"></div>
			</div>

			<!-- <HIDDEN> CONNECT ALL DATA ON CONNECTED VIEW -->
			<!-- <span style="float:left;display:block">&nbsp;&nbsp;Connections:</span>
			<div style="clear: both;"></div> -->
			<!-- svelte-ignore a11y-positive-tabindex -->
			<!-- <input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-connect-all" tabindex="3">
			<span style="float:left;display:block">Connect to all data types</span>
			<div style="clear: both;"></div> -->
			<input style="float:left;display:none;margin-left:20px" type="checkbox" id="checkbox-connect-all">
			
			<!-- LABELS DISPLAY -->
			<!-- svelte-ignore a11y-positive-tabindex a11y-no-noninteractive-tabindex -->
			<div id="controls-toggle-show-labels" class="controls-dropdown-selector" tabindex="3">
				<span style="padding-right:10px">&nbsp;&nbsp;Labels:</span>
				<span><i class="arrow right" style="display:block"></i></span>
				<span><i class="arrow down" style="display:none"></i></span>
				<div style="clear: both;"></div>
			</div>
			<div id="controls-group-labels" style="display:none;">
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-leaf-titles" checked tabindex="3">
				<span style="float:left;display:block">Show leaf titles</span>
				<div style="clear: both;"></div>
				<div id="control-subtheme-titles">
					<!-- svelte-ignore a11y-positive-tabindex -->
					<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-subtheme-titles" checked tabindex="3">
					<span style="float:left;display:block">Show subtheme titles</span>
					<div style="clear: both;"></div>
				</div>
				<div id="control-subtheme-legend">
					<!-- svelte-ignore a11y-positive-tabindex -->
					<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-legend" checked tabindex="3">
					<span style="float:left;display:block">Show legend box</span>
					<div style="clear: both;"></div>
				</div>
			</div>

			<!-- TEXT SIZING -->
				<!-- svelte-ignore a11y-positive-tabindex a11y-no-noninteractive-tabindex -->
			<div id="controls-toggle-show-text" class="controls-dropdown-selector" tabindex="3">
				<span style="padding-right:10px">&nbsp;&nbsp;Text size:</span>
				<span><i class="arrow right" style="display:block"></i></span>
				<span><i class="arrow down" style="display:none"></i></span>
				<div style="clear: both;"></div>
			</div>
			<div id="controls-group-text" style="display:none;">
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:block;margin-left:20px;margin-top:5px" type="button" id="increase-text-size" tabindex="3"
					value="Increase text size">
				<div style="clear: both;"></div>
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:block;margin-left:20px;margin-top:5px" type="button" id="decrease-text-size" tabindex="3"
					value="Decrease text size">
				<div style="clear: both;"></div>
				<!-- svelte-ignore a11y-positive-tabindex -->
				<input style="float:left;display:block;margin-left:20px;margin-top:5px" type="button" id="reset-text-size" tabindex="3"
					value="Reset text size">
				<div style="clear: both;"></div>
				<input style="float:left;display:none;margin-left:20px" type="checkbox" id="checkbox-white-backgrounds" checked>
				<span style="float:left;display:none">Text has white background</span>
				<div style="clear: both;"></div>
			</div>

			<!-- <div style="display:{visible ? 'block' : 'none'}">  -->
			<div style="display:none"> 
				<br/><br/><br/>
				<!-- <Search/>
				<select id="viz-select" style="width:200px">
					<option value="0">Radial Tree</option>
					<option value="1">Connected Edges</option>
				</select>
				<select id="preset-select" style="display:none;width:200px">
				</select>
				<br/><br/> -->
				<input style="float:left;display:none" type="checkbox" id="checkbox-image" checked>
				<span style="float:left;display:none">Show center image</span>
				<div style="clear: both;"></div>
				
				<input style="float:left;display:none" type="checkbox" id="checkbox-twist-circle" checked>
				<span style="float:left;display:none">Large twist circle</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:none" type="checkbox" id="checkbox-node-text">
				<span style="float:left;display:none">Node text second line</span>
				<div style="clear: both;"></div>
				<br/>
				<input style="float:left;display:none" type="checkbox" class="checkbox-status" id="checkbox-status-Published" checked>
				<span style="float:left;display:none">Status: Published</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:none" type="checkbox" class="checkbox-status" id="checkbox-status-Accepted" checked>
				<span style="float:left;display:none">Status: Accepted</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:none" type="checkbox" class="checkbox-status" id="checkbox-status-Submitted" checked>
				<span style="float:left;display:none">Status: Submitted</span>
				<div style="clear: both;"></div>
				<input style="float:left;display:none" type="checkbox" class="checkbox-status" id="checkbox-status-Manuscript" checked>
				<span style="float:left;display:none">Status: Manuscript</span>
				<div style="clear: both;"></div>
				<br/>
				<input style="float:left;display:none" type="checkbox" id="checkbox-second-tooltip">
				<span style="float:left;display:none">Second tooltip</span>
				<div style="clear: both;"></div>
			</div>
		</div>
	</div>
</div>

<style>
	.controls-dropdown-selector {
		cursor: pointer;
		margin-top: 10px;
		margin-bottom: 10px;
	}
	
	.controls-dropdown-selector span {
		margin : 0px !important;
		float : left !important;
		vertical-align: middle !important; 
	}

	.arrow {
		border: solid black;
		width: 3px;
		height: 3px;
		border-width: 0 3px 3px 0;
		display: inline-block;
		padding: 3px;
	}

	.right {
		margin-top: 3px;
		transform: rotate(-45deg);
		-webkit-transform: rotate(-45deg);
	}

	.down {
		transform: rotate(45deg);
		-webkit-transform: rotate(45deg);
	}
</style>