import * as d3 from 'd3';

export const parseMetaData = (responseMetaData, metaDataHeader) => {
			
	responseMetaData.forEach((metaInfo) => {
		switch(metaInfo[0]) {
			case 'welcomeMessageTitle':
			d3.select('#welcome-dialog h3').html(metaInfo[1]);
			break;
			case 'welcomeMessageBody':
			d3.select('#welcome-dialog span').html(metaInfo[1]);
			break;
			case 'tabViewTitle':
			d3.select('#tab-view-title').html(metaInfo[1]);
			break;
		}
	})
};

export const parseNCSAndLHWData = (responseData, header) => {
	const rawData = [];
	const themesAdded = [];
	let theme = '';
	let subThemesAdded = [];
	responseData.forEach((row) => {

		// new theme
		if(row[0] !== undefined && row[0] !== '' && !themesAdded.includes(row[0])) {
			theme = row[0];
			rawData.push({
				'text': theme,
				'parent': 'ROOT',
				'themeDescLong': row[1],
				'themeDescShort': row[2],
			});
			themesAdded.push(theme);
			subThemesAdded = [];
		}

		// new subtheme
		if(row[3] !== undefined && row[3] !== '' && !subThemesAdded.includes(row[3])) {
			let subTheme = row[3];
			rawData.push({
				'text': subTheme,
				'parent': theme,
				'[INFO_MAIN]description': row[4]
			});
			subThemesAdded.push(subTheme);
		}

		const d = {
			'text': row[5],
			'parent': row[3],
		};
		header.slice(5).forEach((column, i) => {
			d[column] = row[i + 5]
		});
		rawData.push(d);
	});

	//console.log(rawData);

	return rawData;
};

export const parseDefaultData = (responseData, header) => {
	const rawData = responseData.map((row) => {
		const d = {};
		header.forEach((column, i) => {
			d[column] = row[i]
		});
		return d;
	});

	return rawData;
};