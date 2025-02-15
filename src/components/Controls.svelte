<script>
	import * as d3 from 'd3';

	import { onMount } from 'svelte';

	import Search from './Search.svelte';

	import { setTreeVisibility } from '../helper/setTreeVisibility';

    export let visible;
    export let presets;
    export let checkboxesChecked;
    export let rerenderTreeTrigger;
    export let mode;
    export let root;

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
						console.log(d.data.presets.includes(chosenPreset))
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
		d3.select("#checkbox-white-backgrounds").on("change", (event) => {
			checkboxesChecked["checkbox-white-backgrounds"] = !checkboxesChecked["checkbox-white-backgrounds"];
			rerenderTreeTrigger = true;
		});
		d3.select("#checkbox-text-size").on("change", (event) => {
			checkboxesChecked["checkbox-text-size"] = !checkboxesChecked["checkbox-text-size"];
			rerenderTreeTrigger = true;
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

		d3.select("#checkbox-viz-select-cluster").on("click", (event) => {
			mode = "viz-select-0";
			d3.selectAll("#curves-wrapper-center").attr("opacity", 1.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 0.0);
			rerenderTreeTrigger = false;
			d3.select("#checkbox-viz-select-connections").property("checked", false);
		});

		d3.select("#checkbox-viz-select-connections").on("click", (event) => {
			mode = "viz-select-1";
			d3.selectAll("#curves-wrapper-center").attr("opacity", 0.0);
			d3.selectAll("#curves-wrapper-leaves").attr("opacity", 1.0);
			rerenderTreeTrigger = false;
			d3.select("#checkbox-viz-select-cluster").property("checked", false);
		});

		d3.select('#checkbox-detailed-view-themes-publications').on("click", (event) => {
			checkboxesChecked["checkbox-detailed-view-themes-publications"] = !checkboxesChecked["checkbox-detailed-view-themes-publications"];
			root.descendants().forEach((d) => {
				if(['Mental Health ','Healthcare disruption','Society & Health ','Serology ','Long Covid ','OpenSAFELY','Other ','Treatment '].includes(d.data.text))
					setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-themes-publications"]);
			})
			rerenderTreeTrigger = true;
		})
		d3.select('#checkbox-detailed-view-team').on("click", (event) => {
			checkboxesChecked["checkbox-detailed-view-team"] = !checkboxesChecked["checkbox-detailed-view-team"];
			root.descendants().forEach((d) => {
				if(d.data.text === 'Team' || d.data.text === 'Teams')
					setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-team"]);
			})
			rerenderTreeTrigger = true;
		})
		d3.select('#checkbox-detailed-view-data-sources').on("click", (event) => {
			checkboxesChecked["checkbox-detailed-view-data-sources"] = !checkboxesChecked["checkbox-detailed-view-data-sources"];
			root.descendants().forEach((d) => {
				if(d.data.text === 'Data')
					setTreeVisibility(d.data, checkboxesChecked["checkbox-detailed-view-data-sources"]);
			})
			rerenderTreeTrigger = true;
		})

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
	});

</script>

<div id="controls-wrapper">
	<center>
		<Search/><br/><br/>
		<input style="float:left;display:block" type="checkbox" id="checkbox-simple-view">
		<span style="float:left;display:block">Simple version</span>
		<div style="clear: both;"></div>
		<input style="float:left;display:block" type="checkbox" id="checkbox-detailed-view" checked>
		<span style="float:left;display:block">Detailed visualisation</span>
		<div style="clear: both;"></div>

		<div style="display:{visible ? 'block' : 'none'}"> 
			<span style="float:left;display:block">&nbsp;&nbsp;Show information about:</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-detailed-view-themes-publications" checked>
			<span style="float:left;display:block">Themes and Publications</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-detailed-view-team">
			<span style="float:left;display:block">Team</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-detailed-view-data-sources">
			<span style="float:left;display:block">Data Sources</span>
			<div style="clear: both;"></div>

			<span style="float:left;display:block">&nbsp;&nbsp;Layout:</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-viz-select-cluster" checked>
			<span style="float:left;display:block">Cluster by theme</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-viz-select-connections">
			<span style="float:left;display:block">Connections</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:block;margin-left:20px" type="checkbox" id="checkbox-leaf-titles" checked>
			<span style="float:left;display:block">Show leaf titles</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:none;margin-left:20px" type="checkbox" id="checkbox-white-backgrounds" checked>
			<span style="float:left;display:none">Text has white background</span>
			<div style="clear: both;"></div>
			<input style="float:left;display:none;margin-left:20px" type="checkbox" id="checkbox-text-size" checked>
			<span style="float:left;display:none">Smaller text size</span>
			<div style="clear: both;"></div>
		</div>
		
		<br/><br/><br/>

		<div style="display:{visible ? 'block' : 'none'}"> 
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
	</center>
</div>