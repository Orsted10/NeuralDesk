import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { ingestToBrain } from '@/lib/brain/embedding-pipeline';

// Configure the Notion client (uses environment variable NOTION_API_KEY)
const getNotionClient = () => {
  const auth = process.env.NOTION_API_KEY;
  if (!auth) throw new Error("NOTION_API_KEY environment variable is not set");
  return new Client({ auth });
};

// Simple block to text parser
async function getPageText(notion: Client, blockId: string): Promise<string> {
  let text = '';
  try {
    const response = await notion.blocks.children.list({ block_id: blockId });
    for (const block of response.results as any[]) {
      if (block.type === 'paragraph' && block.paragraph.rich_text) {
        text += block.paragraph.rich_text.map((t: any) => t.plain_text).join('') + '\n\n';
      } else if (block.type === 'heading_1' && block.heading_1.rich_text) {
        text += '# ' + block.heading_1.rich_text.map((t: any) => t.plain_text).join('') + '\n\n';
      } else if (block.type === 'heading_2' && block.heading_2.rich_text) {
        text += '## ' + block.heading_2.rich_text.map((t: any) => t.plain_text).join('') + '\n\n';
      } else if (block.type === 'heading_3' && block.heading_3.rich_text) {
        text += '### ' + block.heading_3.rich_text.map((t: any) => t.plain_text).join('') + '\n\n';
      } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text) {
        text += '* ' + block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('') + '\n';
      } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text) {
        text += '1. ' + block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('') + '\n';
      } else if (block.type === 'code' && block.code.rich_text) {
        text += '```\n' + block.code.rich_text.map((t: any) => t.plain_text).join('') + '\n```\n\n';
      }
      
      // Recursively get children if the block has them
      if (block.has_children) {
        text += await getPageText(notion, block.id);
      }
    }
  } catch (error) {
    console.error(`Error fetching children for block ${blockId}:`, error);
  }
  return text;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate (optional simple security, e.g., Bearer token checking)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notion = getNotionClient();
    
    // 2. Search for all pages the integration has access to
    const response = await notion.search({
      filter: { value: 'page', property: 'object' },
    });

    const pages = response.results;
    let ingestedCount = 0;

    // 3. Process each page
    for (const page of pages as any[]) {
      // Get title
      let title = 'Untitled Page';
      if (page.properties) {
        // Notion properties can be tricky, find the 'title' type property
        for (const key in page.properties) {
          if (page.properties[key].type === 'title') {
            title = page.properties[key].title.map((t: any) => t.plain_text).join('');
            break;
          }
        }
      }

      // Fetch all text content for the page
      const pageText = await getPageText(notion, page.id);
      const fullText = `# ${title}\n\n${pageText}`;

      // 4. Ingest to Living Brain
      if (fullText.trim().length > 10) {
        await ingestToBrain({
          sourcePlatform: 'notion',
          sourceId: page.id,
          content: fullText,
          metadata: {
            title: title,
            url: page.url,
            last_edited_time: page.last_edited_time,
          }
        });
        ingestedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${ingestedCount} Notion pages.` 
    });

  } catch (error: any) {
    console.error('Notion Sync Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync Notion' },
      { status: 500 }
    );
  }
}
