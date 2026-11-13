<template>
  <Dialog :dialog-id="DialogID.Import">
    <DialogContent
      class="max-h-[90dvh] overflow-y-auto"
      :class="issues.length ? 'sm:max-w-4xl' : ''"
      :disable-close="importLoading"
      @escape-key-down="preventClose"
      @interact-outside="preventClose"
    >
      <DialogHeader>
        <DialogTitle>{{ issues.length ? "Corriger les articles à importer" : $t("components.app.import_dialog.title") }}</DialogTitle>
        <DialogDescription>
          {{ issues.length
            ? "Aucune ligne n’a été enregistrée. Choisis un modèle existant pour chaque ligne signalée."
            : $t("components.app.import_dialog.description") }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="!issues.length" class="flex gap-2 rounded bg-destructive p-2 text-destructive-foreground shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mb-auto size-6 shrink-0 stroke-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span class="text-sm">
          {{ $t("components.app.import_dialog.change_warning") }}
        </span>
      </div>

      <p v-if="!issues.length" class="text-sm text-muted-foreground">
        Emplacements : Subfolder-level1 à Subfolder-level4. Les colonnes de niveaux doivent être continues.
        Une ligne avec HB.name crée directement l’objet dans le dernier niveau renseigné ; les chemins existants
        sont réutilisés et les fichiers Homebox habituels restent acceptés.
      </p>

      <form class="flex flex-col gap-4" @submit.prevent="submitCsvFile">
        <Input v-if="!issues.length" type="file" accept=".csv,.tsv" :disabled="importLoading" @change="setFile" />
        <template v-else>
          <p v-if="!models.length" class="text-sm">
            Aucun modèle avec une référence n’est disponible. Ajoute les modèles dans le catalogue, puis relance l’import.
          </p>
          <template v-else>
            <Input v-model="modelSearch" placeholder="Filtrer les modèles par nom ou référence" aria-label="Filtrer les modèles" />
            <p v-if="matchingModels.length > modelLimit" class="text-sm text-muted-foreground">
              {{ modelLimit }} modèles affichés sur {{ matchingModels.length }}. Affine le filtre pour retrouver la référence.
            </p>
          </template>
          <div class="max-h-[45dvh] space-y-3 overflow-y-auto">
            <div v-for="issue in visibleIssues" :key="issue.row" class="space-y-1 rounded border p-2">
              <label :for="`import-model-${issue.row}`" class="block font-medium">
                Ligne {{ issue.row }} · {{ issue.name }}
              </label>
              <p class="text-sm text-muted-foreground">
                {{ issue.location }} · {{ reasons[issue.reason] }}<span v-if="issue.reference"> ({{ issue.reference }})</span>
              </p>
              <select
                :id="`import-model-${issue.row}`"
                v-model="corrections[issue.row]"
                :disabled="importLoading || !models.length"
                class="w-full rounded border bg-background p-2"
              >
                <option value="">Choisir un modèle</option>
                <option
                  v-for="model in filteredModels(corrections[issue.row])"
                  :key="model.id"
                  :value="model.id"
                >{{ model.defaultModelNumber }} · {{ model.name }}</option>
              </select>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{{ remaining }} ligne(s) à corriger</span>
            <div v-if="pageCount > 1" class="flex items-center gap-2">
              <Button type="button" variant="outline" :disabled="page <= 1" @click="page--">Précédent</Button>
              <span>{{ page }} / {{ pageCount }}</span>
              <Button type="button" variant="outline" :disabled="page >= pageCount" @click="page++">Suivant</Button>
            </div>
          </div>
        </template>
        <div v-if="importLoading" class="space-y-1" role="status">
          <p class="text-sm">{{ total ? `${processed} / ${total} lignes traitées` : "Envoi et analyse du fichier…" }}</p>
          <progress class="w-full" :value="total ? processed : undefined" :max="total || 1" aria-label="Progression de l’import" />
        </div>
        <p v-if="importError" class="text-sm text-destructive" role="alert">{{ importError }}</p>

        <DialogFooter>
          <Button type="submit" :disabled="!importCsv || importLoading || remaining > 0"> {{ issues.length ? "Importer les articles corrigés" : "Analyser et importer" }} </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { DialogID, useDialog } from "@/components/ui/dialog-provider/utils";
  import { toast } from "@/components/ui/sonner";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import type { CSVModelIssue } from "@/lib/api/classes/items";
  import type { EntityTemplateSummary } from "@/lib/api/types/data-contracts";

  const { t } = useI18n();
  const { activeDialog, closeDialog } = useDialog();
  const { refreshInventoryData } = useInventoryRefresh();
  const prefs = useViewPreferences();

  const importCsv = ref<File>();
  const importLoading = ref(false);
  const importError = ref("");
  const processed = ref(0);
  const total = ref(0);
  const issues = ref<CSVModelIssue[]>([]);
  const corrections = ref<Record<number, string>>({});
  const models = ref<EntityTemplateSummary[]>([]);
  const modelSearch = ref("");
  const page = ref(1);
  const pageSize = 20;
  const modelLimit = 100;
  const pageCount = computed(() => Math.ceil(issues.value.length / pageSize));
  const visibleIssues = computed(() => issues.value.slice((page.value - 1) * pageSize, page.value * pageSize));
  const remaining = computed(() => issues.value.filter(issue => !corrections.value[issue.row]).length);
  let collection: string | null | undefined;
  const reasons: Record<CSVModelIssue["reason"], string> = {
    missing: "Référence manquante",
    unknown: "Référence inconnue",
    ambiguous: "Plusieurs modèles portent cette référence",
    unavailable: "Le modèle sélectionné est indisponible",
  };

  watch(activeDialog, id => {
    if (id === DialogID.Import) {
      importCsv.value = undefined;
      importError.value = "";
      issues.value = [];
      corrections.value = {};
      models.value = [];
      modelSearch.value = "";
      page.value = 1;
      collection = prefs.value.collectionId;
    }
  });

  const matchingModels = computed(() => {
    const query = modelSearch.value.trim().toLowerCase();
    return models.value.filter(model => `${model.defaultModelNumber} ${model.name}`.toLowerCase().includes(query));
  });

  function filteredModels(selected?: string) {
    const options = matchingModels.value.slice(0, modelLimit);
    if (!selected || options.some(model => model.id === selected)) return options;
    return models.value.filter(model => model.id === selected).concat(options);
  }

  function preventClose(event: Event) {
    if (importLoading.value) event.preventDefault();
  }

  function setFile(event: Event) {
    importCsv.value = (event.target as HTMLInputElement).files?.[0];
    importError.value = "";
  }

  async function submitCsvFile() {
    if (importLoading.value || !importCsv.value || remaining.value) return;
    if (collection !== prefs.value.collectionId) {
      importError.value = "La collection active a changé. Ferme cette fenêtre et relance l’import.";
      return;
    }

    importLoading.value = true;
    importError.value = "";
    processed.value = 0;
    total.value = 0;
    const api = useUserApi();
    try {
      const result = await api.items.importWithProgress(importCsv.value, corrections.value, (done, rows) => {
        processed.value = done;
        total.value = rows;
      });

      if (result.type === "corrections") {
        issues.value = result.issues;
        page.value = 1;
        for (const issue of result.issues) corrections.value[issue.row] = "";
        const { data, error } = await api.templates.getAll();
        if (error) {
          importError.value = "Le catalogue de modèles n’a pas pu être chargé. Rouvre la fenêtre pour réessayer.";
          return;
        }
        models.value = data.filter(model => model.defaultModelNumber?.trim());
        return;
      }

      if (result.type === "error") {
        importError.value = result.message;
        return;
      }

      processed.value = total.value;
      await refreshInventoryData();
      closeDialog(DialogID.Import);
      toast.success(t("components.app.import_dialog.toast.import_success"));
    } catch {
      importError.value = "L’import a été interrompu. Vérifie l’inventaire avant de relancer le fichier.";
    } finally {
      importLoading.value = false;
    }
  }
</script>
