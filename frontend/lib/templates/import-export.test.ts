import { describe, expect, test } from "vitest";
import type { EntityTemplateOut } from "../api/types/data-contracts";
import { createTemplateExport, parseTemplateExport, TEMPLATE_EXPORT_FORMAT, toTemplateCreate } from "./import-export";

const template = {
  id: "template-id",
  name: "Laptop",
  description: "Portable computer",
  notes: "Inventory template",
  defaultQuantity: 1,
  defaultInsured: true,
  defaultName: "Laptop {n}",
  defaultDescription: "",
  defaultManufacturer: "Framework",
  defaultModelNumber: "13",
  defaultLifetimeWarranty: false,
  defaultWarrantyDetails: "Two years",
  defaultLocation: { id: "location-id", name: "Office" },
  defaultTags: [{ id: "tag-id", name: "IT" }],
  includeWarrantyFields: true,
  includePurchaseFields: true,
  includeSoldFields: false,
  fields: [
    {
      id: "field-id",
      name: "Serial",
      type: "text",
      textValue: "",
      numberValue: 0,
      booleanValue: false,
      timeValue: "",
    },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} satisfies EntityTemplateOut;

describe("template import/export", () => {
  test("creates a portable document without internal IDs", () => {
    const result = createTemplateExport([template]);

    expect(result.format).toBe(TEMPLATE_EXPORT_FORMAT);
    expect(result.templates[0]?.defaultLocationName).toBe("Office");
    expect(result.templates[0]?.defaultTagNames).toEqual(["IT"]);
    expect(result.templates[0]?.fields[0]).not.toHaveProperty("id");
  });

  test("rejects an unsupported document", () => {
    expect(() =>
      parseTemplateExport({
        format: TEMPLATE_EXPORT_FORMAT,
        version: 999,
        templates: [],
      })
    ).toThrow();
  });

  test("resolves portable location and tag names", () => {
    const exported = createTemplateExport([template]).templates[0]!;
    const result = toTemplateCreate(
      exported,
      [{ id: "target-location", name: "office" } as never],
      [{ id: "target-tag", name: "it" } as never]
    );

    expect(result.defaultLocationId).toBe("target-location");
    expect(result.defaultTagIds).toEqual(["target-tag"]);
    expect(result.fields[0]?.id).toBe("00000000-0000-0000-0000-000000000000");
  });
});
