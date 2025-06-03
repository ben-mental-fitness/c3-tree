<script type="text/javascript">
	import { renderLegend } from "../helper/renderLegend";

	// Bound to App.svelte
	export let canvasWidth;
	export let canvasHeight;
	export let welcomeDialogVisible;
	export let currentTextScale;
	
	$:if(canvasWidth && canvasHeight && !welcomeDialogVisible, true) {
		renderLegend(canvasWidth, canvasHeight, currentTextScale);
	}

</script>

