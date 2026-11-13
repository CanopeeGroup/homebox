import type { AppBranding } from "~/lib/api/public";

export function useAdminBranding() {
  const branding = useState<AppBranding>("app-branding", () => ({ title: "", subtitle: "", avatar: "" }));
  const loaded = useState("app-branding-loaded", () => false);
  const loading = useState("app-branding-loading", () => false);

  async function load() {
    if (loaded.value || loading.value) return;
    loading.value = true;
    try {
      const { data, error } = await usePublicApi().branding();
      if (!loaded.value && !error && data) {
        branding.value = data;
        loaded.value = true;
      }
    } finally {
      loading.value = false;
    }
  }

  async function save(changes: Partial<AppBranding>) {
    const { data, error } = await useUserApi().user.updateBranding(changes);
    if (error || !data) throw new Error("Unable to save application branding");
    branding.value = data;
    loaded.value = true;
  }

  return {
    avatar: computed(() => branding.value.avatar),
    title: computed(() => branding.value.title || "HomeBox"),
    subtitle: computed(() => branding.value.subtitle),
    load,
    save,
  };
}
