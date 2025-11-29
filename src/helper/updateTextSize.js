import * as d3 from 'd3';

export const updateTextSize = (currentTextScale) => {
    // General
    d3.selectAll("h1").style("font-size", currentTextScale.H1);
    d3.selectAll(".button").style("font-size", currentTextScale.Button);

    // List view
    d3.selectAll(".content-right .title").style("font-size", currentTextScale.TabsTitle); 
    d3.selectAll(".content-text").style("font-size", currentTextScale.ListContent);
    d3.selectAll(".collapsible-content-toggler p").style("font-size", currentTextScale.ListContent);
    d3.selectAll(".papers-list-item p").style("font-size", currentTextScale.ListContent);
    d3.selectAll("#tab-search-input").style("font-size", currentTextScale.Controls);

    // Visualisation view
    d3.selectAll("#back-button").style("font-size", currentTextScale.BackButton);
    d3.selectAll("#controls-wrapper span").style("font-size", currentTextScale.Controls);
    d3.selectAll("#controls-wrapper #search").style("font-size", currentTextScale.Controls);
    d3.selectAll(".legend-wrapper text").attr("font-size", currentTextScale.LegendWrapper);
    d3.selectAll(".category-labels").attr("font-size", currentTextScale.CategoryLabels);
    d3.selectAll("#category-legend-wrapper p").style("font-size", currentTextScale.CategoryLegend);
    d3.selectAll(".node-text").attr("font-size", currentTextScale.NodeText);
}