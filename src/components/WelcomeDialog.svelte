<script>
	import * as d3 from 'd3';

	// Bound to App.svelte
	export let visible = false;
	export let ANIM_DURATION_OUT;

	const showWelcomeDialog = () => {
		d3.select("#welcome-dialog")
			.style("opacity", 0.0)
			.style("display", "block");
		d3.selectAll("#welcome-dialog")
			.transition("opacity")
			.duration(ANIM_DURATION_OUT)
			.ease(d3.easeQuadOut)
			.style("opacity", 1.0);
	}

	const hideWelcomeDialog = () => {
		d3.select("#welcome-dialog-logo").remove();
		d3.select("#welcome-dialog-logo-2").remove();
		d3.select("#welcome-dialog-logo-linebreak").remove();
		d3.selectAll("#welcome-dialog")
			.transition("opacity")
			.duration(ANIM_DURATION_OUT)
			.ease(d3.easeQuadOut)
			.style("opacity", 0.0);
		d3.selectAll("#welcome-dialog")
			.transition("display")
			.delay(ANIM_DURATION_OUT)
			.style("display", "none");
	};

	$: if (visible) {
	    showWelcomeDialog();
	}

	$: if (!visible) {
	    hideWelcomeDialog();
	}

    
</script>

<div id="welcome-dialog-logos">
	<img src="/center_logo.png" alt="Logo" id="welcome-dialog-logo"/>
	<img src="/center_logo_2.png" alt="Logo" id="welcome-dialog-logo-2"/>
</div>
<div id="welcome-dialog-logo-linebreak" style="clear:both;margin-bottom:25px"></div>

<div id="welcome-dialog" style="display:none;">

	<center>
		<h1>Welcome!</h1><br/>
	</center>
	<span></span>
	<br/><br/>
	<span id="mobile-availability-note">Note: The main visualisation is currently only available on a desktop PC.</span>
	<br/>
	<div class="button-row">
		<button class="button button-simplified" style="margin-right:10px">List View</button>
		<button class="button button-default">Visualisation</button>
	</div>
</div>


<style>

	#welcome-dialog {
		position: absolute;
		left:50%;
		top:50%;
		width: 800px;
		min-height: 300px;
		margin-left:-400px;
		margin-top:-200px;
		border: 1px solid #f0f0f0;
		padding:20px;
		text-align: left;
		z-index: 99;
		opacity: 1.0;
	}
	#welcome-dialog #mobile-availability-note {
		display: none;
		font-style: italic;
	}

	#welcome-dialog-logo, #welcome-dialog-logo-2 {
		position : absolute;
		top : 50px;
		height : 200px;
	}

	#welcome-dialog-logo {
		left : 50px;
	}
		
	#welcome-dialog-logo-2 {
		left : 275px;
	}

	@media screen and (max-width: 768px) {

		#welcome-dialog-logos {
			width: 100%;
			justify-content: space-around;
			display: flex;
		}

		#welcome-dialog-logo, #welcome-dialog-logo-2 {
			position : relative;
			top: 20px;
			height: 100px;
			left: auto;
		}

	    #welcome-dialog {
			position : relative;
			left :10px;
			top : auto;
			width : 90%;
			margin : 25px 0px 25px 0px;
			padding : 10px;
		}
		#welcome-dialog .button-row {
			display: block;
		}
		#welcome-dialog .button {
			width: 100%;
			margin-top: 10px;
		}
		#welcome-dialog .button-default {
			display: none;
		}
		#welcome-dialog #mobile-availability-note {
			display: initial;
		}
	}
	
</style>