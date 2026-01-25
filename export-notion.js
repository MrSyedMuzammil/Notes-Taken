const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs-extra");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

async function run() {
  const mdBlocks = await n2m.pageToMarkdown(process.env.NOTION_PAGE_ID);
  const mdString = n2m.toMarkdownString(mdBlocks);

  await fs.ensureDir("notes");
  await fs.writeFile("notes/notion-notes.md", mdString.parent);

  console.log("Notes exported successfully");
}

run();
