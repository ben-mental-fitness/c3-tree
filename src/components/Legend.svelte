<script type="text/javascript">
	import { renderLegend } from "../helper/renderLegend";

	export let canvasWidth;
	export let canvasHeight;
	export let welcomeDialogVisible;
	
	$:if(canvasWidth && canvasHeight && !welcomeDialogVisible) {
		renderLegend(canvasWidth, canvasHeight);
	}

</script>

