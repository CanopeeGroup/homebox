import { describe, expect, it } from "vitest";
import type { TreeItem } from "../api/types/data-contracts";
import { createLocationCsv, parseLocationCsv } from "./import-export";

describe("location CSV", () => {
  it("ignores blank rows and duplicate paths", () => {
    expect(parseLocationCsv("Subfolder-level1;Subfolder-level2\n;\nA;A0110\nA;A0120\nA;A0120\n"))
      .toEqual([["A", "A0110"], ["A", "A0120"]]);
  });
  it("accepts standalone roots and UTF-8 BOM", () => {
    expect(parseLocationCsv("\uFEFFSubfolder-level1;Subfolder-level2\r\nA;\r\n")).toEqual([["A"]]);
  });
  it("rejects missing parents and incorrect headers before import", () => {
    expect(() => parseLocationCsv("Subfolder-level1;Subfolder-level2\n;child\n")).toThrow();
    expect(() => parseLocationCsv("Name;Parent\nA;B\n")).toThrow();
  });
  it("round-trips quoted names and deeper hierarchies", () => {
    const tree = [{ id: "root", type: "location", name: 'A;"quoted"', children: [
      { id: "child", type: "location", name: "child", children: [
        { id: "deep", type: "location", name: "deep", children: [] },
      ] },
    ] }] as TreeItem[];
    expect(parseLocationCsv(createLocationCsv(tree))).toEqual([
      ['A;"quoted"'], ['A;"quoted"', "child"], ['A;"quoted"', "child", "deep"],
    ]);
  });
});
