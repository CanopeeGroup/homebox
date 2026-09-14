import type {
  EntitySummary,
  EntityTemplateCreate,
  EntityTemplateOut,
  TagOut,
  TemplateField,
} from "../api/types/data-contracts";

export const TEMPLATE_EXPORT_FORMAT = "homebox-template-export";
export const TEMPLATE_EXPORT_VERSION = 1;
export const TEMPLATE_CSV_HEADERS = ["EntryName", "Article"] as const;

type PortableTemplateField = Omit<TemplateField, "id">;

export interface PortableTemplate {
  name: string;
  description: string;
  notes: string;
  defaultQuantity: number;
  defaultInsured: boolean;
  defaultName: string;
  defaultDescription: string;
  defaultManufacturer: string;
  defaultModelNumber: string;
  defaultLifetimeWarranty: boolean;
  defaultWarrantyDetails: string;
  defaultLocationName: string | null;
  defaultTagNames: string[];
  includeWarrantyFields: boolean;
  includePurchaseFields: boolean;
  includeSoldFields: boolean;
  fields: PortableTemplateField[];
}

export interface TemplateExportDocument {
  format: typeof TEMPLATE_EXPORT_FORMAT;
  version: typeof TEMPLATE_EXPORT_VERSION;
  exportedAt: string;
  templates: PortableTemplate[];
}

export function createTemplateExport(templates: EntityTemplateOut[]): TemplateExportDocument {
  return {
    format: TEMPLATE_EXPORT_FORMAT,
    version: TEMPLATE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    templates: templates.map(template => ({
      name: template.name,
      description: template.description,
      notes: template.notes,
      defaultQuantity: template.defaultQuantity,
      defaultInsured: template.defaultInsured,
      defaultName: template.defaultName,
      defaultDescription: template.defaultDescription,
      defaultManufacturer: template.defaultManufacturer,
      defaultModelNumber: template.defaultModelNumber,
      defaultLifetimeWarranty: template.defaultLifetimeWarranty,
      defaultWarrantyDetails: template.defaultWarrantyDetails,
      defaultLocationName: template.defaultLocation?.name ?? null,
      defaultTagNames: (template.defaultTags ?? []).map(tag => tag.name),
      includeWarrantyFields: template.includeWarrantyFields,
      includePurchaseFields: template.includePurchaseFields,
      includeSoldFields: template.includeSoldFields,
      fields: (template.fields ?? []).map(({ id: _id, ...field }) => field),
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValidTemplateShape(value: unknown): value is PortableTemplate {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.name.length <= 255 &&
    typeof value.description === "string" &&
    typeof value.notes === "string" &&
    typeof value.defaultQuantity === "number" &&
    Number.isFinite(value.defaultQuantity) &&
    value.defaultQuantity >= 0 &&
    typeof value.defaultInsured === "boolean" &&
    typeof value.defaultName === "string" &&
    typeof value.defaultDescription === "string" &&
    typeof value.defaultManufacturer === "string" &&
    typeof value.defaultModelNumber === "string" &&
    typeof value.defaultLifetimeWarranty === "boolean" &&
    typeof value.defaultWarrantyDetails === "string" &&
    (value.defaultLocationName === null || typeof value.defaultLocationName === "string") &&
    Array.isArray(value.defaultTagNames) &&
    value.defaultTagNames.every(name => typeof name === "string") &&
    typeof value.includeWarrantyFields === "boolean" &&
    typeof value.includePurchaseFields === "boolean" &&
    typeof value.includeSoldFields === "boolean" &&
    Array.isArray(value.fields) &&
    value.fields.every(
      field =>
        isRecord(field) &&
        typeof field.name === "string" &&
        typeof field.type === "string" &&
        ["text", "number", "boolean", "time"].includes(field.type)
    )
  );
}

export function parseTemplateExport(value: unknown): TemplateExportDocument {
  if (
    !isRecord(value) ||
    value.format !== TEMPLATE_EXPORT_FORMAT ||
    value.version !== TEMPLATE_EXPORT_VERSION ||
    typeof value.exportedAt !== "string" ||
    !Array.isArray(value.templates) ||
    !value.templates.every(hasValidTemplateShape)
  ) {
    throw new Error("Invalid or unsupported Homebox template export");
  }

  return value as unknown as TemplateExportDocument;
}

function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function createTemplateCsv(templates: EntityTemplateOut[]): string {
  const rows = templates.map(template =>
    [template.name, template.defaultModelNumber].map(value => escapeCsvValue(value ?? "")).join(";")
  );
  return `\uFEFF${TEMPLATE_CSV_HEADERS.join(";")}\r\n${rows.join("\r\n")}\r\n`;
}

export function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index]!;
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ";") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("Invalid CSV: unterminated quoted value");
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    if (row.some(cell => cell.length > 0)) rows.push(row);
  }
  return rows;
}

const normalizeHeader = (header: string) =>
  header
    .replace(/^\uFEFF/, "")
    .replace(/[ _-]/g, "")
    .toLocaleLowerCase();

export function parseTemplateCsv(csv: string): PortableTemplate[] {
  const rows = parseCsvRows(csv);
  const headers = rows.shift()?.map(normalizeHeader) ?? [];
  const nameIndex = headers.findIndex(
    header => header === "entryname" || header === "name" || header === "defaultname"
  );
  const articleIndex = headers.findIndex(header => header === "article" || header === "defaultmodelnumber");
  if (nameIndex < 0 || articleIndex < 0) throw new Error("Invalid CSV template headers");

  return rows
    .map(row => ({ name: row[nameIndex]?.trim() ?? "", modelNumber: row[articleIndex]?.trim() ?? "" }))
    .filter(row => row.name.length > 0)
    .map(row => ({
      name: row.name,
      description: "",
      notes: "",
      defaultQuantity: 0,
      defaultInsured: false,
      defaultName: row.name,
      defaultDescription: "",
      defaultManufacturer: "",
      defaultModelNumber: row.modelNumber,
      defaultLifetimeWarranty: false,
      defaultWarrantyDetails: "",
      defaultLocationName: null,
      defaultTagNames: [],
      includeWarrantyFields: false,
      includePurchaseFields: false,
      includeSoldFields: false,
      fields: [],
    }));
}

const normalizedName = (name: string) => name.trim().toLocaleLowerCase();

export function toTemplateCreate(
  template: PortableTemplate,
  locations: EntitySummary[],
  tags: TagOut[]
): EntityTemplateCreate {
  const location = template.defaultLocationName
    ? locations.find(candidate => normalizedName(candidate.name) === normalizedName(template.defaultLocationName!))
    : undefined;
  const tagNames = new Set(template.defaultTagNames.map(normalizedName));
  const tagIds = tags.filter(tag => tagNames.has(normalizedName(tag.name))).map(tag => tag.id);

  return {
    name: template.name,
    description: template.description,
    notes: template.notes,
    defaultQuantity: template.defaultQuantity,
    defaultInsured: template.defaultInsured,
    defaultName: template.defaultName,
    defaultDescription: template.defaultDescription,
    defaultManufacturer: template.defaultManufacturer,
    defaultModelNumber: template.defaultModelNumber,
    defaultLifetimeWarranty: template.defaultLifetimeWarranty,
    defaultWarrantyDetails: template.defaultWarrantyDetails,
    defaultLocationId: location?.id ?? null,
    defaultTagIds: tagIds,
    includeWarrantyFields: template.includeWarrantyFields,
    includePurchaseFields: template.includePurchaseFields,
    includeSoldFields: template.includeSoldFields,
    fields: template.fields.map(field => ({
      ...field,
      id: "00000000-0000-0000-0000-000000000000",
    })),
  };
}
