type AdminBranding = {
  avatar: string | null;
  title: string;
};

const DEFAULT_TITLE = "HomeBox";
let loadPromise: Promise<void> | null = null;

export function useAdminBranding() {
  const auth = useAuthContext();
  const avatar = useState<string | null>("admin-profile-avatar", () => null);
  const title = useState<string>("admin-app-title", () => DEFAULT_TITLE);
  const loaded = useState<boolean>("admin-branding-loaded", () => false);

  const apply = (settings: Record<string, unknown>) => {
    avatar.value = typeof settings.adminAvatar === "string" && settings.adminAvatar ? settings.adminAvatar : null;
    const savedTitle = typeof settings.appTitle === "string" ? settings.appTitle.trim() : "";
    title.value = savedTitle || DEFAULT_TITLE;
    loaded.value = true;
  };

  const load = async (force = false) => {
    if (!auth.user?.isSuperuser) return;
    if (loaded.value && !force) return;
    if (loadPromise && !force) return loadPromise;

    loadPromise = (async () => {
      const { data, error } = await useUserApi().user.getSettings();
      if (!error && data?.item) apply(data.item as Record<string, unknown>);
    })().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  };

  const save = async (changes: Partial<AdminBranding>) => {
    if (!auth.user?.isSuperuser) throw new Error("forbidden");
    const api = useUserApi();
    const { data, error } = await api.user.getSettings();
    if (error || !data?.item) throw new Error("settings");

    const settings = { ...data.item } as Record<string, unknown>;
    if ("avatar" in changes) {
      if (changes.avatar) settings.adminAvatar = changes.avatar;
      else delete settings.adminAvatar;
    }
    if ("title" in changes) settings.appTitle = changes.title?.trim() || DEFAULT_TITLE;

    const result = await api.user.setSettings(settings);
    if (result.error) throw new Error("save");
    apply(settings);
  };

  return { avatar, title, loaded, load, save };
}
