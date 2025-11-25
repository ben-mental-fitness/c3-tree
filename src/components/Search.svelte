<script type="text/javascript">
	import * as d3 from 'd3';
	import { onMount } from 'svelte';

	const highlightSearchTerm = (searchTerm) => {
		d3.selectAll(".category-labels")
			.attr("stroke", (d) => {
				return d.data.text.toLowerCase().includes(searchTerm.toLowerCase()) || d.data.props?.themeDescShort?.toLowerCase().includes(searchTerm.toLowerCase()) ? "#ffee22" : null
			})
			.attr("stroke-width", 5);

		d3.selectAll(".outer-node-group circle")
			.attr("stroke", (d) => {
				return d.data.text.toLowerCase().includes(searchTerm.toLowerCase()) || d.data.props?.info_main?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ? "#ffee22" : null
			})
			.attr("stroke-width", 5);

		d3.selectAll(".node-group text")
			.attr("stroke", (d) => {
				return d.data.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
					(d.data.props?.info_main && (d.data.props?.info_main["Full title"]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
					d.data.props?.info_main["Summary"]?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
					d.data.props?.info_main["Abstract"]?.toString().toLowerCase().includes(searchTerm.toLowerCase())))
				? "#ffee22" : null
			})
			.attr("stroke-width", 5);
	};

	onMount(() => {
		d3.select("#search").node().value = "";
		d3.select("#search").on("keyup", (event) => {

			const searchTerm = event.target.value;
			if(searchTerm.length > 2) {
				highlightSearchTerm(searchTerm.toString());
			/*data.children.forEach((d) => {
			highlightSearchTerm(d, searchTerm);
			});*/
			} else highlightSearchTerm("##-##");
		});
	});
	
</script>

<!-- svelte-ignore a11y-positive-tabindex -->
<input id="search" type="text" tabindex="3" placeholder="search text..." />