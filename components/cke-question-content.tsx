"use client";

/* eslint-disable @next/next/no-img-element -- CKE assets have audited local paths and original aspect ratios. */

import { MathFormula } from "@/components/math-formula";

export type CkeContentBlock =
  | { type: "markdown"; text: string }
  | { type: "math"; latex: string; display?: boolean }
  | { type: "image"; asset_id: string }
  | { type: "table"; rows: string[][]; header_rows?: number; caption?: string };

export type CkeQuestionAsset = {
  id: string;
  path: string;
  sha256: string;
  alt: string;
  caption?: string;
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
      return <figure key={index} className="cke-table-block">{block.caption && <figcaption>{block.caption}</figcaption>}<div><table>{block.caption && <caption className="sr-only">{block.caption}</caption>}<tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex < (block.header_rows ?? 1) ? <th key={cellIndex} scope="col">{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></figure>;
    })}
  </div>;
}
