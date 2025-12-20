
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div id="draft-notice" tabindex="0" role="contentinfo"
	aria-label="Draft visualisation - not for publication or sharing. The information in this visualisation draft is being collaboratively developed and a launch is planned for Q4 2025 - Q1 2026. Information included in the visualisation may contain errors.">
	<span>
		<b>Draft visualisation</b> - not for publication or sharing. The information in this visualisation draft is being collaboratively developed and a launch is planned for Q4 2025 - Q1 2026. Information included in the visualisation may contain errors.
	</span>
</div>

<style>
    #draft-notice {
		background: #ffffff;
		display: block;
		position: fixed;
		left: 10px;
		bottom: 10px;
		width: 300px;
		font-size: 80%;
		border: 1px solid #f0f0f0;
		padding: 10px;
		text-align: left;
		z-index: 99;
	}

	@media screen and (max-width: 768px) {
		#draft-notice {
			position: relative;
			width: 90%;
			margin-top: 25px;
		}
	}
</style>