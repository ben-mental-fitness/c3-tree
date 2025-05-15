import * as d3 from 'd3';

// Render legend on cluster group visualisation
export const renderLegend = (canvasWidth, canvasHeight, visible = true, mode = "viz-select-0") => {
    d3.select("#d3-canvas").selectAll('.legend-wrapper').remove();
    if (!visible || mode == "viz-select-1") return;

    const legendWrapper = d3.select("#d3-canvas").append("g")
        .attr("class", "legend-wrapper")

    if(canvasWidth < canvasHeight) {
        const margin = (canvasHeight - canvasWidth) / 2.0;
        legendWrapper
            .attr("transform", `translate(
                ${canvasWidth - 150},
                ${margin + canvasWidth - 80})`)
    } else {
        const margin = (canvasWidth - canvasHeight) / 2.0;
        legendWrapper
            .attr("transform", `translate(
                ${margin + canvasHeight},
                ${canvasHeight - 80})`)
    }

    legendWrapper.append("rect")
        .attr("width", 165)
        .attr("height", 115)
        .attr("x", -20)
        .attr("y", -40)
        .attr("fill", "transparent")
        .attr("stroke", "#d0d0d0")
        .attr("stroke-width", 1);
    legendWrapper.append("text")
        .attr("fill", "#d0d0d0")
        .text("Legend")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "left")
        .attr("font-size", "120%")
        .attr("x", 15)
        .attr("y", -20)

    legendWrapper.append("circle")
        .attr("fill", "#202020")
        .attr("r", "4");
    legendWrapper.append("text")
        .attr("fill", "#202020")
        .text("Published / Accepted")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "left")
        .attr("font-size", "120%")
        .attr("x", 15)

    legendWrapper.append("circle")
        .attr("transform", "translate(0,20)")
        .attr("fill", "transparent")
        .attr("stroke", "#202020")
        .attr("stroke-width", "2")
        .attr("r", "4");
    legendWrapper.append("circle")
        .attr("transform", "translate(0,20)")
        .attr("fill", "#202020")
        .attr("r", "2");
    legendWrapper.append("text")
        .attr("fill", "#202020")
        .text("Submitted")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "left")
        .attr("font-size", "120%")
        .attr("x", 15)
        .attr("y", 20);

    legendWrapper.append("circle")
        .attr("transform", "translate(0,40)")
        .attr("fill", "transparent")
        .attr("stroke", "#202020")
        .attr("stroke-width", "2")
        .attr("r", "4");
    legendWrapper.append("text")
        .attr("fill", "#202020")
        .text("Manuscript")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "left")
        .attr("font-size", "120%")
        .attr("x", 15)
        .attr("y", 40);

    legendWrapper.append("circle")
        .attr("transform", "translate(0,60)")
        .attr("fill", "#202020")
        .attr("r", "2");
    legendWrapper.append("text")
        .attr("fill", "#202020")
        .text("Unkown")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "left")
        .attr("font-size", "120%")
        .attr("x", 15)
        .attr("y", 60);
}
