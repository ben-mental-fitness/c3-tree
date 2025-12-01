<script>
    import { fly, scale } from 'svelte/transition';
    import { quadOut } from 'svelte/easing';

    // Bound to TabView.svelte
    export let open;
    export let data;
</script>

{#if open}
    {#key data}
        <div id="hamburger-link-wrapper">
            {#each data.children as link, i}
                <p transition:fly={{ y: -15, delay: 50 * i }} data-link="{link.text}" class="hamburger-link">
                    {link.text}
                </p>
            {/each}
        </div>

        <hr transition:scale={{ duration: 750, easing: quadOut, opacity: 1 }} />
    {/key}
{/if}

<style>
    div {
        text-align: center;
        font-size: 150%;
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
