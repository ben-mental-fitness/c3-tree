import * as d3 from 'd3';

export const updateLeafTextAppearence = async () => {

	d3.selectAll("#node-group-wrapper .node-text-1st-line")
		.each(function(d) {
			let text = d.data.text;
			d3.select(this).text(text);
			let computedTextLength = d3.select(this).node().getComputedTextLength();
			while(computedTextLength > 70) {
				text = `${text.slice(0,-5)}`;
				d3.select(this).text(text);
				computedTextLength = d3.select(this).node().getComputedTextLength();
				d.data.textLength = text.length;
			}
		});
	d3.selectAll("#node-group-wrapper .node-text-2nd-line")
		.each(function(d) {
			let text = d.data.text.substr(d.data.textLength);
			d3.select(this).text(text);
			let computedTextLength = d3.select(this).node().getComputedTextLength();
			while(computedTextLength > 70) {
				text = `${text.slice(0,-5)}...`;
				d3.select(this).text(text);
				computedTextLength = d3.select(this).node().getComputedTextLength();
			}
		});

	d3.selectAll("#node-group-simplified-wrapper .node-text-1st-line")
		.each(function(d) {
			let text = d.data.text.substr(d.data.textLength);
			d3.select(this).text(text);
			let computedTextLength = d3.select(this).node().getComputedTextLength();
			while(computedTextLength > 150) {
				text = `${text.slice(0,-5)}...`;
				d3.select(this).text(text);
				computedTextLength = d3.select(this).node().getComputedTextLength();
			}
		});
}