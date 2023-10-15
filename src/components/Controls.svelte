<script>
	import * as d3 from 'd3';

    export let visible;
    export let presets = null;

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
				rerenderTree();
			});
	};

	$:if(presets !== null) {
		initializePresetsDropdown(presets);
	}

</script>

<div id="controls-wrapper" style="display:{visible ? 'block' : 'none'}">
	<center>
		<input id="search" type="text" placeholder="search text..." />
		<select id="viz-select" style="width:200px">
			<option value="0">Radial Tree</option>
			<option value="1">Connected Edges</option>
		</select>
		<select id="preset-select" style="display:none;width:200px">
		</select>
		<br/><br/>
		<input style="float:left;display:block" type="checkbox" id="checkbox-image" checked>
		<span style="float:left;display:block">Show center image</span>
		<div style="clear: both;"></div>
		<input style="float:left;display:block" type="checkbox" id="checkbox-leaf-titles" checked>
		<span style="float:left;display:block">Show leaf titles</span>
		<div style="clear: both;"></div>
		<input style="float:left;display:block" type="checkbox" id="checkbox-twist-circle" checked>
		<span style="float:left;display:block">Large twist circle</span>
		<div style="clear: both;"></div>
		<input style="float:left;display:block" type="checkbox" id="checkbox-node-text" checked>
		<span style="float:left;display:block">Node text second line</span>
		<div style="clear: both;"></div>
		<br/>
		<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Published" checked>
		<span style="float:left;display:block">Status: Published</span>
		<div style="clear: both;"></div>
		<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Accepted" checked>
		<span style="float:left;display:block">Status: Accepted</span>
		<div style="clear: both;"></div>
		<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Submitted" checked>
		<span style="float:left;display:block">Status: Submitted</span>
		<div style="clear: both;"></div>
		<input style="float:left;display:block" type="checkbox" class="checkbox-status" id="checkbox-status-Manuscript" checked>
		<span style="float:left;display:block">Status: Manuscript</span>
		<div style="clear: both;"></div>
		<br/>
		<input style="float:left;display:block" type="checkbox" id="checkbox-status-second-tooltip" checked>
		<span style="float:left;display:block">Second tooltip</span>
		<div style="clear: both;"></div>
	</center>
</div>