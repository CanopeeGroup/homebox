import type { TreeItem } from "../api/types/data-contracts";
import { parseCsvRows } from "../templates/import-export";

export function parseLocationCsv(csv: string): string[][] {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  const headers = rows.shift()?.map(value => value.trim()) ?? [];
  if (headers[0] !== "Subfolder-level1" || headers[1] !== "Subfolder-level2" ||
      headers.some((value, index) => value !== `Subfolder-level${index + 1}`)) {
    throw new Error("Colonnes attendues : Subfolder-level1;Subfolder-level2 (puis niveaux supplémentaires éventuels).");
  }
  const paths: string[][] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (row.every(value => !value.trim())) return;
    if (row.length !== headers.length) throw new Error(`Ligne ${index + 2} : nombre de colonnes incorrect.`);
    const names = row.map(value => value.trim());
    while (names.length && !names[names.length - 1]) names.pop();
    if (names.some(value => !value || value.length > 255)) {
      throw new Error(`Ligne ${index + 2} : nom vide entre deux niveaux ou nom dépassant 255 caractères.`);
    }
    const key = JSON.stringify(names);
    if (!seen.has(key)) {
      seen.add(key);
      paths.push(names);
    }
  });
  return paths;
}

export function createLocationCsv(tree: TreeItem[]): string {
  const paths: string[][] = [];
  const visit = (nodes: TreeItem[], ancestors: string[]) => {
    for (const node of nodes) {
      if (node.type !== "location") continue;
      const path = [...ancestors, node.name];
      paths.push(path);
      visit(node.children ?? [], path);
    }
  };
  visit(tree, []);
  const depth = paths.reduce((max, path) => Math.max(max, path.length), 2);
  const header = Array.from({ length: depth }, (_, index) => `Subfolder-level${index + 1}`).join(";");
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = paths.map(path => Array.from({ length: depth }, (_, index) => quote(path[index] ?? "")).join(";"));
  return "\uFEFF" + [header, ...rows].join("\r\n") + "\r\n";
}
