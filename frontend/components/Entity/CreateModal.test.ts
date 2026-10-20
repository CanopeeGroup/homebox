import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { computed, reactive, ref, watch } from "vue";
import { describe, expect, it, vi } from "vitest";

// Exercise the real SFC setup code without mounting the unrelated dialog/pickers.
// The actual Vue refs, form actions and open callback run against controlled APIs.
const source = readFileSync(new URL("./CreateModal.vue", import.meta.url), "utf8");
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("Missing creation form setup");
const parsed = ts.createSourceFile("CreateModal.ts", script, ts.ScriptTarget.ES2022, true);
const printer = ts.createPrinter();
const stripped = parsed.statements
  .filter(statement => !ts.isImportDeclaration(statement))
  .map(statement => printer.printNode(ts.EmitHint.Unspecified, statement, parsed))
  .join("\n");
const compiled = ts.transpileModule(stripped, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

type Model = { id: string; name: string; description: string; defaultName: string; defaultDescription: string };
const model = (id = "model"): Model => ({ id, name: id, description: "", defaultName: id, defaultDescription: "" });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

function fixture() {
  const location = { id: "location", children: [] };
  const itemType = { id: "item-type", isLocation: false };
  const locationType = { id: "location-type", isLocation: true };
  const entityTypes = { allTypes: [itemType, locationType], refresh: vi.fn().mockResolvedValue(undefined) };
  const locations = {
    allLocations: [location],
    tree: [location],
    adjustItemCount: vi.fn(),
    refreshTree: vi.fn().mockResolvedValue(undefined),
    refreshChildren: vi.fn().mockResolvedValue(undefined),
    refreshParents: vi.fn().mockResolvedValue(undefined),
  };
  const api = {
    templates: {
      get: vi.fn(async (id: string) => ({ data: model(id), error: false })),
      createItem: vi.fn().mockResolvedValue({ data: { id: "created" }, error: false }),
    },
    items: {
      createLocation: vi.fn().mockResolvedValue({ data: { id: "created-location" }, error: false }),
      getLocation: vi.fn().mockResolvedValue({ data: location, error: false }),
      get: vi.fn().mockResolvedValue({ data: { id: "parent" }, error: false }),
      attachments: { add: vi.fn().mockResolvedValue({ error: false }) },
    },
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  const closeDialog = vi.fn();
  const refreshNuxtData = vi.fn().mockResolvedValue(undefined);
  const shift = ref(false);
  const storage = new Map<string, string>();
  let open!: (params: { baseType: string }) => Promise<void>;
  const scope = {
    exports: {},
    ref,
    reactive,
    computed,
    watch,
    console: { error: vi.fn(), warn: vi.fn() },
    useI18n: () => ({ t: (key: string) => key }),
    DialogID: { CreateEntity: "create" },
    AttachmentTypes: { Photo: "photo" },
    useDialog: () => ({
      closeDialog,
      registerOpenDialogCallback: (_id: string, callback: typeof open) => {
        open = callback;
        return () => {};
      },
    }),
    useDialogHotkey: vi.fn(),
    useEntityTypeStore: () => entityTypes,
    useUserApi: () => api,
    useLocationStore: () => locations,
    useLocationItemCache: () => ({ invalidate: vi.fn() }),
    useLocationChildCache: () => ({ adjustItemCount: vi.fn() }),
    useRoute: () => ({ fullPath: "/location/location", params: { id: "location" } }),
    useItemSearch: () => ({ query: ref(""), results: ref([]), isLoading: ref(false), triggerSearch: vi.fn() }),
    useMagicKeys: () => ({ shift }),
    onMounted: (callback: () => void) => callback(),
    onUnmounted: vi.fn(),
    localStorage: {
      getItem: (key: string) => storage.get(key),
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    toast,
    refreshNuxtData,
    clearNuxtData: vi.fn(),
  };
  const controller = runInNewContext(
    `${compiled}\n({ create, form, loading, initializing, selectedTemplate, templateData, handleTemplateSelected, clearTemplate })`,
    scope
  );
  return {
    controller,
    api,
    toast,
    closeDialog,
    refreshNuxtData,
    entityTypes,
    locations,
    shift,
    open: (baseType = "item") => open({ baseType }),
    async ready() {
      await open({ baseType: "item" });
      await controller.handleTemplateSelected(model());
      controller.form.quantity = 1;
    },
  };
}

describe("creation form recovery", () => {
  it("releases the button after a thrown network error and allows retry", async () => {
    const f = fixture();
    await f.ready();
    f.api.templates.createItem.mockRejectedValueOnce(new Error("offline"));
    await f.controller.create(false);
    expect(f.controller.loading.value).toBe(false);
    expect(f.controller.form.quantity).toBe(1);
    expect(f.controller.templateData.value.id).toBe("model");
    await f.controller.create(false);
    expect(f.api.templates.createItem).toHaveBeenCalledTimes(2);
    expect(f.toast.success).toHaveBeenCalledTimes(1);
  });

  it("does not turn a successful write into a failed creation when a list refresh fails", async () => {
    const f = fixture();
    await f.ready();
    f.refreshNuxtData.mockRejectedValueOnce(new Error("list refresh failed"));
    await f.controller.create(false);
    expect(f.controller.loading.value).toBe(false);
    expect(f.controller.form.quantity).toBe("");
    expect(f.toast.success).toHaveBeenCalledTimes(1);
    expect(f.toast.error).not.toHaveBeenCalled();
    expect(f.api.templates.createItem).toHaveBeenCalledTimes(1);
  });

  it("allows the next creation while a list refresh is still pending", async () => {
    const f = fixture();
    await f.ready();
    const pending = deferred<void>();
    f.refreshNuxtData.mockReturnValueOnce(pending.promise);
    await f.controller.create(false);
    expect(f.controller.loading.value).toBe(false);
    f.controller.form.quantity = 2;
    await f.controller.create(false);
    expect(f.api.templates.createItem).toHaveBeenCalledTimes(2);
    pending.resolve();
  });

  it("keeps model and location while resetting quantity for consecutive Shift+Create", async () => {
    const f = fixture();
    await f.ready();
    f.shift.value = true;
    for (const quantity of [0, 3, 5]) {
      f.controller.form.quantity = quantity;
      await f.controller.create();
      expect(f.controller.loading.value).toBe(false);
      expect(f.controller.templateData.value.id).toBe("model");
      expect(f.controller.selectedTemplate.value.id).toBe("model");
      expect(f.controller.form.location.id).toBe("location");
      expect(f.controller.form.quantity).toBe("");
    }
    expect(f.api.templates.createItem.mock.calls.map(call => call[1].quantity)).toEqual([0, 3, 5]);
    expect(f.closeDialog).not.toHaveBeenCalled();
  });

  it("rejects double submission while a write is pending", async () => {
    const f = fixture();
    await f.ready();
    const pending = deferred<{ data: { id: string }; error: boolean }>();
    f.api.templates.createItem.mockReturnValueOnce(pending.promise);
    const first = f.controller.create(false);
    await f.controller.create(false);
    expect(f.api.templates.createItem).toHaveBeenCalledTimes(1);
    pending.resolve({ data: { id: "created" }, error: false });
    await first;
    expect(f.controller.loading.value).toBe(false);
  });

  it("does not clear or close a newly reopened form when an older creation finishes", async () => {
    const f = fixture();
    await f.ready();
    const pending = deferred<{ data: { id: string }; error: boolean }>();
    f.api.templates.createItem.mockReturnValueOnce(pending.promise);
    const first = f.controller.create();
    await f.open();
    await f.controller.handleTemplateSelected(model("next"));
    f.controller.form.quantity = 9;
    pending.resolve({ data: { id: "created" }, error: false });
    await first;
    expect(f.controller.templateData.value.id).toBe("next");
    expect(f.controller.form.quantity).toBe(9);
    expect(f.controller.loading.value).toBe(false);
    expect(f.closeDialog).not.toHaveBeenCalled();
  });

  it("keeps the latest template when responses arrive out of order", async () => {
    const f = fixture();
    await f.open();
    const slow = deferred<{ data: Model; error: boolean }>();
    f.api.templates.get.mockReturnValueOnce(slow.promise);
    const first = f.controller.handleTemplateSelected(model("old"));
    await f.controller.handleTemplateSelected(model("new"));
    slow.resolve({ data: model("old"), error: false });
    await first;
    expect(f.controller.selectedTemplate.value.id).toBe("new");
    expect(f.controller.templateData.value.id).toBe("new");
  });

  it("clears a failed template selection and can select it again", async () => {
    const f = fixture();
    await f.open();
    f.api.templates.get.mockRejectedValueOnce(new Error("offline"));
    await f.controller.handleTemplateSelected(model());
    expect(f.controller.selectedTemplate.value).toBeNull();
    expect(f.controller.templateData.value).toBeNull();
    await f.controller.handleTemplateSelected(model());
    expect(f.controller.templateData.value.id).toBe("model");
  });

  it("releases initialization after a failure and recovers on reopening", async () => {
    const f = fixture();
    f.entityTypes.refresh.mockRejectedValueOnce(new Error("offline"));
    await f.open();
    expect(f.controller.initializing.value).toBe(false);
    await f.ready();
    await f.controller.create(false);
    expect(f.api.templates.createItem).toHaveBeenCalledTimes(1);
  });

  it("keeps location creation usable when location refresh fails", async () => {
    const f = fixture();
    await f.open("location");
    f.controller.form.name = "New location";
    f.locations.refreshChildren.mockRejectedValueOnce(new Error("offline"));
    await f.controller.create(false);
    expect(f.controller.loading.value).toBe(false);
    expect(f.api.items.createLocation).toHaveBeenCalledTimes(1);
    expect(f.toast.success).toHaveBeenCalledTimes(1);
    expect(f.toast.error).not.toHaveBeenCalled();
  });

  it("finishes a saved creation when a photo upload throws", async () => {
    const f = fixture();
    await f.ready();
    f.controller.form.photos = [{ file: {}, photoName: "photo.jpg", primary: true }];
    f.api.items.attachments.add.mockRejectedValueOnce(new Error("upload failed"));
    await f.controller.create(false);
    expect(f.controller.loading.value).toBe(false);
    expect(f.controller.form.photos).toEqual([]);
    expect(f.controller.form.quantity).toBe("");
    expect(f.toast.success).toHaveBeenCalledTimes(1);
    expect(f.toast.error).toHaveBeenCalledWith("components.entity.create_modal.toast.upload_failed");
    expect(f.api.templates.createItem).toHaveBeenCalledTimes(1);
  });

  it("ignores initialization finishing after a newer opening", async () => {
    const f = fixture();
    const slow = deferred<void>();
    f.entityTypes.refresh.mockReturnValueOnce(slow.promise);
    const first = f.open();
    await f.ready();
    f.controller.form.quantity = 4;
    slow.resolve();
    await first;
    expect(f.controller.templateData.value.id).toBe("model");
    expect(f.controller.form.quantity).toBe(4);
    expect(f.controller.initializing.value).toBe(false);
  });
});
