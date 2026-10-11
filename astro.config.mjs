// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import mermaid from "astro-mermaid";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  site: "https://thesandip.dev",
  integrations: [
    mermaid({
      theme: "neutral",
      autoTheme: true,
      iconPacks: [
        // Tech / brand logos (most useful for architecture diagrams)
        {
          name: "logos",
          url: "https://unpkg.com/@iconify-json/logos@1/icons.json",
        },
        // Clean modern icons
        {
          name: "iconoir",
          url: "https://unpkg.com/@iconify-json/iconoir@1/icons.json",
        },
        // Optional: AWS service icons
        {
          name: "aws",
          url: "https://unpkg.com/@iconify-json/aws@1/icons.json",
        },
        // Optional: simple geometric / UI icons
        {
          name: "mdi",
          url: "https://unpkg.com/@iconify-json/mdi@1/icons.json",
        },
      ],
    }),
    mdx(),
    sitemap(),
  ],
  adapter: cloudflare({
    imageService: { build: "compile", runtime: "cloudflare-binding" },
  }),
});