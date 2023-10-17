
const colors = ["#8C88BA", "#BF84AE", "#DB95AC", "#FBB9A6", "#F6A294", "#B0DBEA", "#B3E5BE", "#CFC69D"];

export const buildHierarchy = ((parentLevel, data, presetsAvailable, presetsParent, visibleTeams, depth, maxDepth) => {
	data.filter((d) => parentLevel.text !== "" && parentLevel.text !== undefined && d.text !== undefined && d.text !== "" && d.parent === parentLevel.text).forEach((d) => {

		const level = {
			"id": `${parentLevel.id}${parentLevel.children.length}`,
			"text": d.text,
			"color": depth === 1
				? (parentLevel.children.length < colors.length ? colors[parentLevel.children.length] : "#808080")
				: parentLevel.color,
			"depth": depth,
			"maxDepth": maxDepth,
			"visible": true,
			"props": {
				"publication_link": d.publication_link,
				"data_source": d.data_source,
				"status": d.Status,
				"info_main": {},
				"info_collapsed": {
					"Status": d.Status,
				},
				"themeDescLong": d.themeDescLong,
				"themeDescShort": d.themeDescShort,
			},
			"presets": [...presetsParent, ...presetsAvailable.filter((preset) => !presetsParent.includes(preset) && d[`[PRESET]${preset}`] === "x")],
			"children": [],
		};

		Object.keys(d).filter((key) => key.indexOf("[INFO_MAIN]") !== -1).forEach((key) => {
			level.props.info_main[key.replace("[INFO_MAIN]", "")] = d[key];
		});
		Object.keys(d).filter((key) => key.indexOf("[INFO_COLLAPSED]") !== -1).forEach((key) => {
			level.props.info_collapsed[key.replace("[INFO_COLLAPSED]", "")] = d[key];
		});

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

		buildHierarchy(level, data, presetsAvailable, level.presets, visibleTeams, depth + 1, level.text === "Team" ? 2 : maxDepth);
	});
});

export const startBuildHierarchy = ((data, presets, visibleTeams, maxDepth = 15) => {

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

	buildHierarchy(hierarchyRootLevel, data, presets, [], visibleTeams, 1, maxDepth);

	return hierarchyRootLevel;
});