<script>
    import { fly, scale } from 'svelte/transition';
    import { quadOut } from 'svelte/easing';

    export let open;
</script>

{#if open}
    <div>
        {#each ['Mental Health ','Healthcare disruption','Society & Health ','Serology ','Long Covid ','OpenSAFELY','Other ','Treatment ','Team','Data'] as link, i}
            <p transition:fly={{ y: -15, delay: 50 * i }} data-link="{link}" class="hamburger-link">
                {link}
            </p>
        {/each}
    </div>

    <hr transition:scale={{ duration: 750, easing: quadOut, opacity: 1 }} />
{/if}





<style>
    :global(html) {
    }
    div {
        text-align: center;
        font-size: 1.5em;
        letter-spacing: 0.15em;
        padding: 1em;
        padding-top: 0;
        color: #808080;
        background: #ffffff;

    }
    p {
        cursor: pointer;
        width: max-content;
        margin: 1rem auto;
    }
    p:hover {
        text-decoration: underline;
    }
</style>
