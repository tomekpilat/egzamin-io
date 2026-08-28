"use client";

/* eslint-disable @next/next/no-img-element -- CKE assets have audited local paths and original aspect ratios. */

import { MathFormula } from "@/components/math-formula";

export type CkeContentBlock =
  | { type: "markdown"; text: string }
  | { type: "math"; latex: string; display?: boolean }
  | { type: "image"; asset_id: string }
  | { type: "audio"; asset_id: string }
  | { type: "table"; rows: string[][]; header_rows?: number; caption?: string }
  | { type: "passage"; id?: string; passage_id?: string; title: string; author?: string; paragraphs: string[]; source?: string; footnotes?: string[]; default_open?: boolean };

export type CkeQuestionAsset = {
  id: string;
  path: string;
  sha256: string;
  alt: string;
  caption?: string;
  mime_type?: string;
};

function publicAssetPath(path: string) {
  const normalized = path.replace(/^public\//, "").replace(/^\/+/, "");
  return `/${normalized}`;
}

export function CkeQuestionContent({ blocks, assets }: { blocks: CkeContentBlock[]; assets: CkeQuestionAsset[] }) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));

  return <div className="cke-question-content">
    {blocks.map((block, index) => {
      if (block.type === "markdown") return <p key={index} className="cke-markdown-block">{block.text}</p>;
      if (block.type === "math") return <MathFormula key={index} latex={block.latex} display={block.display !== false} className="cke-math-block" />;
      if (block.type === "image") {
        const asset = byId.get(block.asset_id);
        if (!asset) return null;
        return <figure key={index} className="cke-image-block"><img src={publicAssetPath(asset.path)} alt={asset.alt} />{asset.caption && <figcaption>{asset.caption}</figcaption>}</figure>;
      }
      if (block.type === "audio") {
        const asset = byId.get(block.asset_id);
        if (!asset) return null;
        // Captions would reveal the answers in a listening-comprehension task; the official transcript is retained with the audited import sources.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        return <figure key={index} className="cke-audio-block">{asset.caption && <figcaption>{asset.caption}</figcaption>}<audio aria-label={asset.caption ?? asset.alt} controls preload="metadata"><source src={publicAssetPath(asset.path)} type={asset.mime_type ?? "audio/mpeg"} />Twoja przeglądarka nie obsługuje odtwarzania audio.</audio><small>{asset.alt}</small></figure>;
      }
      if (block.type === "passage") return <details key={index} className="cke-passage-block" open={block.default_open}>
        <summary><span>Tekst źródłowy</span><b>{block.author ? `${block.author}, ${block.title}` : block.title}</b></summary>
        <article>
          {block.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          {block.footnotes?.map((footnote, footnoteIndex) => <small key={footnoteIndex}>{footnote}</small>)}
          {block.source && <cite>{block.source}</cite>}
        </article>
      </details>;
      return <figure key={index} className="cke-table-block">{block.caption && <figcaption>{block.caption}</figcaption>}<div><table>{block.caption && <caption className="sr-only">{block.caption}</caption>}<tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex < (block.header_rows ?? 1) ? <th key={cellIndex} scope="col">{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></figure>;
    })}
  </div>;
}
