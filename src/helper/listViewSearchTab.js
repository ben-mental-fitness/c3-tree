import * as d3 from 'd3';

let activeDropdownElement;

export const listSearchForData = (searchTerm, rawData, ANIM_DURATION_IN, ANIM_DURATION_OUT) => {
    if(searchTerm.length > 2) {
            createCollapsibleDropdown(searchTerm, rawData, ANIM_DURATION_IN, ANIM_DURATION_OUT);
    } else {
        d3.select("#tab-search-results").selectAll("*").remove();
        d3.select("#tab-search-results-title").text("Enter at least 3 characters to search");
    }
}

const createCollapsibleDropdown = (searchTerm, rawData, ANIM_DURATION_IN, ANIM_DURATION_OUT) => {
    const resultsParentDiv =  d3.select("#tab-search-results"); // <-- collapsibleContent
    resultsParentDiv.selectAll("*").remove();

    const searchResults = rawData.filter((d) => {
         return d["text"]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            d["[INFO_MAIN]Full Title"]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            d["[INFO_MAIN]Summary"]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            d["[INFO_MAIN]Abstract"]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            d["Papers Title"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d["data_source"]?.toLowerCase().includes(searchTerm.toLowerCase())
            // ? "#ffee22" : null
    }).map((d, i) => {
        d.id = i;
        return d;
    });
    d3.select("#tab-search-results-title").text(`${searchResults.length} ${searchResults.length === 1 ? "result" : "results"} found`);

    const papersList = resultsParentDiv.append("div")
        .selectAll(".papers-list-item")
        .data(searchResults)
        .join("div")
        .attr("id", (d, i) => `search-results-item-${i}`)
        .attr("class", "papers-list-item")
        .style("cursor", "pointer")
        .style("border", "1px solid #d0d0d0")
        .style("background-color", "#ffffff")
        .style("padding", "0 10px")
        .style("position", "relative")
        .attr("tabindex", "0")
        .on("keydown", (event, d) => {
            if (event.key === "Enter" || event.key === "Spacebar" || event.key === " ") {
                if (activeDropdownElement && activeDropdownElement !== document.getElementById(`search-results-item-${d.id}`)) activeDropdownElement.click();
                papersListItemEvent(event, d, d.id);
            }
        })
        .on("click", (event, d) => {
            papersListItemEvent(event, d, d.id);
        });

    const papersListItemEvent = (event, d, i) => {
        const entry = d3.select(`#search-results-item-${i} .papers-list-item-content`);
        const collapsed = entry.attr("data-collapsed");

        if(collapsed === "true") {
            const waitForCollapse = () => {
                if (activeDropdownElement == null) {
                    entry.attr("data-collapsed", "false")
                        .style("display", "block")
                        .transition("appear")
                        .duration(ANIM_DURATION_IN)
                        .ease(d3.easeQuadOut)
                        .style("height", "auto");

                    d3.select(`#search-results-item-${i} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
                        .attr("transform", "translate(256,256) rotate(180) translate(-256,-256)");

                    document.getElementById(`search-results-item-${i}`).style.zIndex = "40";
                    d3.select("#full-page-fade").style("display", "block");
                    d3.select("#full-page-fade").transition().duration(ANIM_DURATION_IN).ease(d3.easeQuadOut).style("opacity", 0.6);
                    document.body.addEventListener("click", overlayClickEvent);
                    activeDropdownElement = document.getElementById(`search-results-item-${i}`);
                    document.getElementById(`search-results-item-${i}`).scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                    setTimeout(waitForCollapse, 250);
                }
            }
            waitForCollapse();
        } else {
            entry.attr("data-collapsed", "true")
                .style("display", "none")
                .transition("appear")
                .duration(ANIM_DURATION_OUT)
                .ease(d3.easeQuadOut)
                .style("height", "0")

            entry.attr("data-collapsed", "true")
                .transition("display")
                .delay(ANIM_DURATION_OUT)
                .style("display", "none");

            d3.select(`#search-results-item-${i} .collapse-icon-paper path`).transition("rotate").duration(200).ease(d3.easeQuadOut)
                .attr("transform", "translate(256,256) rotate(90) translate(-256,-256)");

            d3.select("#full-page-fade").transition().duration(ANIM_DURATION_OUT).ease(d3.easeQuadOut).style("opacity", 0.0);
            setTimeout(() => {
                d3.select("#full-page-fade").style("display", "none");
                d3.select(`#search-results-item-${i}`).style("z-index", "auto");
                document.body.removeEventListener("click", overlayClickEvent);
                activeDropdownElement = null;
            }, ANIM_DURATION_OUT);
        }
    }

    papersList.append("p")
        .style("width", "80%")
        .style("float", "left")
        .text((d) => d["text"])

    papersList.append("svg")
        .attr("class", "collapse-icon-paper")
        .style("float", "right")
        .attr("viewBox", "0 0 512 512")
        .style("margin", "12.5px 5px")
        .attr("width", "15px")
        .attr("height", "15px")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .append("path")
        .attr("d", "M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z")
        .attr("fill", "#404040")
        .attr("transform", "translate(256,256) rotate(90) translate(-256,-256)")

    papersList.append("div")
        .style("clear", "both");

    const papersListContent = papersList.append("div")
        .attr("class", "papers-list-item-content")
        .attr("data-collapsed", "true")
        .style("display", "none");

    papersListContent.each(function (d) {
        // TODO - Add links to Data theme studies.
        // TEMP - HIDE SUMMARY
        let collapsibleInfo = false;
        Object.keys(d).filter((key) => key.indexOf("[INFO_MAIN]") !== -1).forEach((key) => {
            if(d[key] && d[key] !== "" && key !== "[INFO_MAIN]Summary") {
                collapsibleInfo = true;
                d3.select(this).append("p")
                    .style("font-weight", "bold")
                    .text(key.replace("[INFO_MAIN]", ""));
                d3.select(this).append("p")
                    .style("padding-bottom", "5px")
                    .text(d[key]);
            }
        });
        Object.keys(d).filter((key) => key.indexOf("[INFO_COLLAPSED]") !== -1).forEach((key) => {
            if(d[key] && d[key] !== "" && key !== "[INFO_COLLAPSED]Impact") {
                collapsibleInfo = true;
                d3.select(this).append("p")
                    .style("font-weight", "bold")
                    .text(key.replace("[INFO_COLLAPSED]", ""));
                d3.select(this).append("p")
                    .style("padding-bottom", "5px")
                    .text(d[key]);
            }
        });
        if (d["[INFO_COLLAPSED]Impact"] && d["[INFO_COLLAPSED]Impact"] !== "") {
            collapsibleInfo = true;
            d3.select(this).append("p")
                .style("font-weight", "bold")
                .text("Impact");
            d3.select(this).append("a")
                .style("width", "auto")
                .style("text-decoration", "none")
                .style("font-weight", "normal")
                .text("Go to Altmetric")
                .attr("href", d["[INFO_COLLAPSED]Impact"])
                .attr("target", "_blank")
                .attr("class", "button button-simplified")
                .attr("z-index", "50");
        }
        if (d["publication_link"] && d["publication_link"] !== "") {
            collapsibleInfo = true;
            d3.select(this).append("p")
                .style("font-weight", "bold")
                .text("Publication");
            
            if (d["publication_link"].indexOf("http") !== -1) {
                d3.select(this).append("a")
                    .style("width", "auto")
                    .style("text-decoration", "none")
                    .style("font-weight", "normal")
                    .text("Go to publication")
                    .attr("href", d["publication_link"])
                    .attr("target", "_blank")
                    .attr("class", "button button-simplified")
                    .attr("z-index", "50");
                d3.select(this).append("p")
                    .style("padding-bottom", "5px");
            } else {
                d3.select(this).append("p")
                    .style("padding-bottom", "5px")
                    .text(d["publication_link"]);
            }
        }
        if(!collapsibleInfo) {
            d3.select(this).append("p")
                .style("font-weight", "bold")
                .text("No additional information.");
        }
        return;
    });
}

const overlayClickEvent = (event) => {
    if (activeDropdownElement.contains(event.target)) return;
    activeDropdownElement.click();
};