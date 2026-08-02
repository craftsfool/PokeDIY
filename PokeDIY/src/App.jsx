import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { WikiHeader } from "./components/WikiHeader";
import { WikiEditor } from "./components/WikiEditor";
import { initialDraft, library } from "./data/library";

const storageKey = "poke-diy-draft-v4";

export default function App() {
  const [draft, setDraft] = useState(() => {
    try {
      return {
        ...initialDraft,
        ...JSON.parse(localStorage.getItem(storageKey) || "{}"),
      };
    } catch {
      return initialDraft;
    }
  });
  const [dexEntries, setDexEntries] = useState([]);
  const [evolutionMethods, setEvolutionMethods] = useState([]);
  const [referenceResources, setReferenceResources] = useState([]);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const resources = useMemo(
    () =>
      referenceResources.length
        ? referenceResources
        : library.filter((item) => item.source === "原版"),
    [referenceResources],
  );

  useEffect(() => {
    Promise.all([
      fetch("/national/national-pokedex.json").then((r) => r.json()),
      fetch("/national/pokemon-forms.json").then((r) => r.json()),
    ])
      .then(([national, formData]) => {
        const formKey = (entry) =>
          `${entry.nationalDex}:${String(entry.formLabel || "").replace(/[\s（）()・·]/g, "")}`;
        const regionalForms = (national.alternateForms || []).map((entry) => ({
          ...entry,
          formClass: entry.formClass || "地区形态",
        }));
        const formKeys = new Set(regionalForms.map(formKey));
        const additionalForms = (formData.forms || []).filter(
          (entry) => !formKeys.has(formKey(entry)),
        );
        const entries = [
          ...(national.entries || []),
          ...regionalForms,
          ...additionalForms,
        ];
        entries.sort(
          (a, b) =>
            a.nationalDex - b.nationalDex ||
            Number(Boolean(a.formLabel)) - Number(Boolean(b.formLabel)) ||
            String(a.formLabel).localeCompare(String(b.formLabel), "zh-CN"),
        );
        setDexEntries(entries);
      })
      .catch(() => setDexEntries([]));
    fetch("/reference/evolution-methods.json")
      .then((r) => r.json())
      .then((data) => {
        setEvolutionMethods(data.methods || []);
      })
      .catch(() => setEvolutionMethods([]));
    fetch("/reference/original-content.json")
      .then((r) => r.json())
      .then((data) => {
        const abilities = (data.abilities || []).map((item) => ({
          id: item.slug,
          kind: "特性",
          name: item.names["zh-Hans"],
          names: item.names,
          description: item.description,
          generation: item.generation,
          wikiUrl: item.wikiUrl,
          source: "原版",
        }));
        const moves = (data.moves || []).map((item) => ({
          id: item.slug,
          kind: "招式",
          name: item.names["zh-Hans"],
          names: item.names,
          type: item.typeZhHans,
          category: item.categoryZhHans,
          power: item.power,
          accuracy: item.accuracy,
          pp: item.pp,
          description: item.description,
          generation: item.generation,
          wikiUrl: item.wikiUrl,
          source: "原版",
        }));
        setReferenceResources([...abilities, ...moves]);
      })
      .catch(() => setReferenceResources([]));
  }, []);
  useEffect(() => {
    setSaved(false);
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setSaved(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [draft]);
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };
  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(draft));
    setSaved(true);
    notify("草稿已保存");
  };

  return (
    <div className="mw-app">
      <WikiHeader />
      <main className="mw-layout">
        <WikiEditor
          draft={draft}
          setDraft={setDraft}
          dexEntries={dexEntries}
          evolutionMethods={evolutionMethods}
          resources={resources}
          saved={saved}
          onSave={save}
          onToast={notify}
        />
      </main>
      {toast && (
        <div className="mw-toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
