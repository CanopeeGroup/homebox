import type {
  EntitySummary,
  EntityTemplateCreate,
  EntityTemplateOut,
  TagOut,
  TemplateField,
} from "../api/types/data-contracts";

export const TEMPLATE_EXPORT_FORMAT = "homebox-template-export";
export const TEMPLATE_EXPORT_VERSION = 1;

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
