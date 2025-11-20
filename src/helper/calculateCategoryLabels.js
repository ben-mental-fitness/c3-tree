import * as d3 from 'd3';

export const calculateCategoryLabels = (d) => {
    let categoriesDataConnections = [
        {"text" : "Publications", "count" : 0, "rotation" : 0, "visible" : false},
        {"text" : "Data", "count" : 0, "rotation" : 0, "visible" : false},
        {"text" : "Authors", "count" : 0, "rotation" : 0, "visible" : false}
    ]

    d.children.forEach((theme)=> {
        const numThemeLeaves = countThemeLeaves(theme.children);
        if (theme.text ===  "Data") categoriesDataConnections[1].count += numThemeLeaves;
        else if (theme.text === "Team") categoriesDataConnections[2].count += numThemeLeaves;
        else categoriesDataConnections[0].count += numThemeLeaves;
    });

    return categoriesDataConnections;
}

const countThemeLeaves = (d) => {
    if (d.length === 0) return 1;

    let leafCount = 0;
    d.forEach((child) => {
        leafCount += countThemeLeaves(child.children);
    });

    return leafCount;
}

export const loadCategoryLabels = (categoriesDataConnections, checkboxesChecked, radius, currentTextScale, twist) => {
    let totalCount = 0;
        if (checkboxesChecked["checkbox-detailed-view-themes-publications"]) totalCount += categoriesDataConnections[0].count;
        if (checkboxesChecked["checkbox-detailed-view-data-sources"]) totalCount += categoriesDataConnections[1].count;
        if (checkboxesChecked["checkbox-detailed-view-team"]) totalCount += categoriesDataConnections[2].count;
        
        let  currRot = 0;
        if (checkboxesChecked["checkbox-detailed-view-themes-publications"]) {
            categoriesDataConnections[0].rotation = currRot + (categoriesDataConnections[0].count / totalCount) * 180;
            currRot += (categoriesDataConnections[0].count / totalCount) * 360;
            categoriesDataConnections[0].visible = true;
        } else {categoriesDataConnections[0].visible = false;}
        if (checkboxesChecked["checkbox-detailed-view-data-sources"]) {
            categoriesDataConnections[1].rotation = currRot + (categoriesDataConnections[1].count / totalCount) * 180;
            currRot += (categoriesDataConnections[1].count / totalCount) * 360;					
            categoriesDataConnections[1].visible = true;
        } else {categoriesDataConnections[1].visible = false;}
        if (checkboxesChecked["checkbox-detailed-view-team"]) {
            categoriesDataConnections[2].rotation = currRot + (categoriesDataConnections[2].count / totalCount) * 180;
            currRot += (categoriesDataConnections[0].count / totalCount) * 360;
            categoriesDataConnections[2].visible = true;
        } else {categoriesDataConnections[2].visible = false;}

        d3.select("#reduced-category-labels-wrapper")
            .selectAll(".reduced-category-labels")
            .data(categoriesDataConnections)
            .join("text")
            .attr("class", "reduced-category-labels")
            .attr("transform", (d) => `rotate(${d.rotation - 90 })
                translate(${radius + 200},0)
                rotate(${90 - d.rotation - (twist * 180 / Math.PI)})`)
            .attr("text-anchor", (d) => ((twist * 180 / Math.PI) + d.rotation) % 360 < 180 ? "start" : "end")
            .attr("font-size", currentTextScale.CategoryLabels)
            .attr("dominant-baseline", "middle")
            .attr("font-weight", "bold")
            .attr("opacity", 1.0)
            .attr("fill", "#000000")
            .attr("opacity", (d) => d.visible ? "1.0" : "0.0")
            .text((d) => d.text)
}