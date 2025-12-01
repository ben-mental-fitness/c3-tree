
const colors = ["#8C88BA", "#BF84AE", "#DB95AC", "#FBB9A6", "#F6A294", "#B0DBEA", "#B3E5BE", "#CFC69D", "#c99045ff"];

export const buildHierarchy = ((parentLevel, data, presetsAvailable, presetsParent, visibleTeams, filterSpecifics, depth, maxDepth, type = null) => {
	if (depth > maxDepth) return;

	data.filter((d) => parentLevel.text !== "" && parentLevel.text !== undefined && d.text !== undefined && d.text !== "" && d.parent === parentLevel.text).forEach((d) => {
		if(filterSpecifics && d.text === 'Team') return;
		else if(!filterSpecifics && d.text === 'Teams') return;
		
		// Set type for item & children, based on theeme
		if (depth === 1) {
			if (d.text === "Team" || d.text === "Teams" || d.text === "Data") type = d.text;
			else type = "Publication";
		}

		// Set data for item
		const level = {
			"id": `${parentLevel.id}${parentLevel.children.length}${filterSpecifics ? 'filtered' : ''}`,
			"text": d.text,
			"youtubeId": d.youtubeId,
			"color": depth === 1
				? (parentLevel.children.length < colors.length ? colors[parentLevel.children.length] : "#808080")
				: parentLevel.color,
			"depth": depth,
			"maxDepth": maxDepth,
			"visible": true,
			"props": {
				"publication_link": d.publication_link,
				"data_source": d.data_source ? d.data_source.split(',').map(item => item.trim()) : [],
				"connected_data_source": {},
				"status": d.Status,
				"info_main": {},
				"info_collapsed": {
					"Status": d.Status,
				},
				"themeDescLong": d.themeDescLong,
				"themeDescShort": d.themeDescShort,
				"type": type
			},
			"presets": [...presetsParent, ...presetsAvailable.filter((preset) => !presetsParent.includes(preset) && d[`[PRESET]${preset}`] === "x")],
			"children": [],
		};

		Object.keys(d).filter((key) => key.indexOf("[CONNECTED_DATA_SOURCE]") !== -1).forEach((key) => {
			level.props.connected_data_source[key.replace("[CONNECTED_DATA_SOURCE]", "")] = d[key] ? d[key].split(',').map(item => item.trim()) : [];
		});
		Object.keys(d).filter((key) => key.indexOf("[INFO_COLLAPSED]") !== -1).forEach((key) => {
			level.props.info_collapsed[key.replace("[INFO_COLLAPSED]", "")] = d[key];
		});
		
		Object.keys(d).filter((key) => key.indexOf("[INFO_MAIN]") !== -1).forEach((key) => {
			level.props.info_main[key.replace("[INFO_MAIN]", "")] = d[key];
		});
		// TEMP REMOVED DATA
		// if (d.parent === "Data") {
		// 	let datas = [];
		// 	data.filter((c) => c.parent === d.text).forEach((c) => datas.push(c["Papers Title"]));
		// 	level.props.info_main.Summary = datas;
		// };		

		if(depth <= maxDepth)
			parentLevel.children.push(level);
		else { // TODO: Team

			if(visibleTeams.indexOf(parentLevel.text) !== -1) {
				parentLevel.children.push(level);
			}

			if(!("Members" in parentLevel.props.info_main)) parentLevel.props.info_main["Members"] = [];
			
			parentLevel.props.info_main["Full title"] = null;
			parentLevel.props.info_main["Summary"] = null;
			parentLevel.props.info_main["description"] = null;
			parentLevel.props.info_main["Members"].push({
				"name": d.text,
				"photo_filename": d.photo_filename,
				"description": d["[INFO_MAIN]Summary"],
				"member_link": d["member_link"],
				"member_link_name": d["member_link_name"]
			});
		}

		// TEMP REMOVED DATA
		// let specificMaxDepth = filterSpecifics && (level.text === "Teams" || level.text === "Team" || level.text === "Data") ? 2 : maxDepth;
		let specificMaxDepth = filterSpecifics && (level.text === "Teams" || level.text === "Team") ? 2 : maxDepth;
		// let specificMaxDepth = maxDepth;

		buildHierarchy(level, data, presetsAvailable, level.presets, visibleTeams, filterSpecifics, depth + 1, specificMaxDepth, type);
	});
});

export const startBuildHierarchy = ((data, presets, visibleTeams, filterSpecifics = false, maxDepth = 15) => {

	const hierarchyRootLevel = {
		"id": "r",
		"text": "ROOT",
		"color": "#202020",
		"depth": 0,
		"visible": false,
		"props": {},
		"presets": [],
		"children": [],
	};

	buildHierarchy(hierarchyRootLevel, data, presets, [], visibleTeams, filterSpecifics, 1, maxDepth);

	return hierarchyRootLevel;
});