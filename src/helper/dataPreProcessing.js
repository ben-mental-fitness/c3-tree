import * as d3 from 'd3';

export const parseMetaData = (responseMetaData, metaDataHeader) => {
			
	responseMetaData.forEach((metaInfo) => {
		switch(metaInfo[0]) {
			case 'welcomeMessageTitle':
			d3.select('#welcome-dialog h1').html(metaInfo[1]);
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
				'youtubeId': row[3],
			});
			themesAdded.push(theme);
			subThemesAdded = [];
		}

		// new subtheme
		if(row[4] !== undefined && row[4] !== '' && !subThemesAdded.includes(row[4])) {
			let subTheme = row[4];
			rawData.push({
				'text': subTheme,
				'parent': theme,
				'[INFO_MAIN]description': row[5]
			});
			subThemesAdded.push(subTheme);
		}

		const d = {
			'text': row[6],
			'parent': row[4],
		};
		header.slice(6).forEach((column, i) => {
			d[column] = row[i + 6]
		});
		rawData.push(d);
	});

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