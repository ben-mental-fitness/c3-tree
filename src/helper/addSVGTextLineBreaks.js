

export const addSVGTextLineBreaks = (text, maxWidth, dy, lineHeight) => {
	const y = text.attr("y");
	const words = text.text().split(/\s+/).reverse();

	let word;
	let line = [];
	let tspan = text
		.text(null)
		.append("tspan")
		.attr("x", 0)
		.attr("y", y)
		.attr("dy", `${dy}em`)
		.attr("data-initial-dy", dy);
	let lineCount = 1;

	while ((word = words.pop())) {
		line.push(word);
		tspan.text(line.join(" "));
		if (line.length > 1 && tspan.node() && tspan.node().getComputedTextLength() > maxWidth) {
			line.pop();
			tspan.text(line.join(" "));
			line = [word];
			tspan = text
				.append("tspan")
				.attr("x", 0)
				.attr("y", y)
				.attr("dy", `${lineHeight}em`)
				.attr("data-initial-dy", lineHeight)
				.text(word);
			lineCount += 1;
		}
	}

	return lineCount;
};